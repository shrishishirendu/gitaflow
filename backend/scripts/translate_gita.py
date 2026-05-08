"""
translate_gita.py
=================
Fills in missing English translations in app/data/bhagavad_gita.json.

Some verses in the dataset have empty `translation` fields because the source
(gita/gita repo) ships only Sanskrit + transliteration. This script adds clean,
literal English translations via Claude.

WHY A SEPARATE SCRIPT — not part of ingest_gita.py:
  - Translation is a different concern than tagging — it's literal, not interpretive.
  - Different prompt (literal translator) than tagging (modern paraphraser).
  - You may want to re-run translation without disturbing your hand-curated tags.

WHAT IT DOES NOT TOUCH:
  - simple_meaning, themes, emotional_tags, is_narrative — left exactly as-is.
  - Verses that already have a non-empty translation — skipped (your hand-curated
    22 verses keep their translations).

Usage:
    # Standard run — fills everything missing
    python scripts/translate_gita.py

    # Dry run — just count what's missing, no API calls
    python scripts/translate_gita.py --dry-run

    # Test on N verses first
    python scripts/translate_gita.py --limit 10

    # Re-translate everything (overrides existing translations)
    python scripts/translate_gita.py --force
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

# Allow `from app.config import ...` when run from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from anthropic import Anthropic  # noqa: E402

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL  # noqa: E402

# ─────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent
TARGET_PATH = BACKEND_DIR / "app" / "data" / "bhagavad_gita.json"
FAILURE_LOG = Path(__file__).resolve().parent / "translate_failures.log"


# ─────────────────────────────────────────────────────────────────────────
# Translation prompt — focused, literal, scholarly. Different goal than the
# tagging prompt: this one wants accuracy, not modernization.
# ─────────────────────────────────────────────────────────────────────────
TRANSLATION_SYSTEM_PROMPT = """You are an English translator of the Bhagavad Gita.

Given Sanskrit + transliteration of a verse, return a clear, literal English
translation in scholarly-but-readable prose.

RULES:
  - Return ONLY the translation. No preamble, no commentary, no markdown.
  - One paragraph. No line breaks within the translation itself.
  - Style: somewhere between Eknath Easwaran and Swami Gambhirananda — modern,
    accurate, dignified. Not flowery. Not preachy.
  - Length: typically 15-40 words. Match the verse's actual content.
  - Faithful to the Sanskrit. Don't add modern interpretation, don't pull
    punches, don't substitute "the divine" for the deity name when the verse
    explicitly invokes one.
  - Render speaker names (Krishna, Arjuna, Dhritarashtra, Sanjaya) as-is when
    the verse uses them.
  - For proper nouns (warrior names, place names, conch shell names), keep them
    in transliterated form rather than translating.

Example input:
  Sanskrit: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
  Transliteration: karmaṇy-evādhikāras te mā phaleṣhu kadāchana

Example output:
  You have a right to action alone, never to its fruits. Let not the fruits of action be your motive, nor let attachment cling to inaction.
"""


# ─────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────
def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sorted_data = dict(sorted(data.items(), key=lambda kv: (kv[1]["chapter"], kv[1]["verse"])))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=2)


def log_failure(verse_id: str, error: str) -> None:
    FAILURE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(FAILURE_LOG, "a", encoding="utf-8") as f:
        f.write(f"[{verse_id}] {error}\n\n")


def needs_translation(entry: dict) -> bool:
    t = entry.get("translation", "")
    return not (isinstance(t, str) and t.strip())


def translate_verse(client: Anthropic, verse_id: str, verse: dict) -> Optional[str]:
    """Call Claude to translate one verse. Retries on rate limit. Returns None on
    persistent failure (logged)."""
    user_message = (
        f"Verse: Bhagavad Gita {verse['chapter']}.{verse['verse']}\n"
        f"Sanskrit: {verse['sanskrit']}\n"
        f"Transliteration: {verse.get('transliteration', '')}"
    )

    last_error: Optional[Exception] = None
    for attempt in range(5):
        try:
            response = client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=300,
                system=TRANSLATION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            break
        except Exception as e:  # noqa: BLE001
            last_error = e
            err_str = str(e)
            if "429" in err_str or "rate_limit" in err_str.lower():
                wait = 5 * (2 ** attempt)
                print(f"    [{verse_id}] rate-limited, sleeping {wait}s (attempt {attempt + 1}/5)")
                time.sleep(wait)
                continue
            log_failure(verse_id, f"API call failed: {e}")
            return None
    else:
        log_failure(verse_id, f"API call failed after 5 retries: {last_error}")
        return None

    text = next((b.text for b in response.content if getattr(b, "type", None) == "text"), "")
    cleaned = text.strip().strip('"').strip()

    # Guardrails — model should never produce empty or absurd output.
    if not cleaned:
        log_failure(verse_id, "model returned empty translation")
        return None
    if len(cleaned) > 800:
        log_failure(verse_id, f"translation too long ({len(cleaned)} chars), likely commentary")
        return None
    # Reject obvious non-translations (model "explained itself")
    bad_starts = ("here is", "this verse", "translation:", "the meaning")
    if any(cleaned.lower().startswith(s) for s in bad_starts):
        log_failure(verse_id, f"model preamble detected: {cleaned[:80]}")
        return None

    return cleaned


def estimate_cost(num_verses: int, model: str) -> str:
    if "haiku" in model.lower():
        in_rate, out_rate = 1.0, 5.0
    elif "opus" in model.lower():
        in_rate, out_rate = 15.0, 75.0
    else:
        in_rate, out_rate = 3.0, 15.0
    # Translation is leaner than tagging: ~400 input tokens, ~80 output tokens
    cost = (num_verses * 400 / 1_000_000) * in_rate + (num_verses * 80 / 1_000_000) * out_rate
    return f"~${cost:.2f} ({num_verses} verses, model: {model})"


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Backfill English translations.")
    parser.add_argument("--force", action="store_true",
                        help="Re-translate every verse, overriding existing translations.")
    parser.add_argument("--chapter", type=int, default=None,
                        help="Only translate verses from this chapter.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Stop after translating N verses.")
    parser.add_argument("--concurrency", type=int, default=2,
                        help="Parallel calls. Default: 2 (safe for 30k TPM).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Just count what needs translating; no API calls.")
    parser.add_argument("--yes", action="store_true",
                        help="Skip the cost-confirmation prompt.")
    args = parser.parse_args()

    if not TARGET_PATH.exists():
        print(f"ERROR: {TARGET_PATH} not found. Run ingest_gita.py first.")
        sys.exit(1)

    data = load_json(TARGET_PATH)
    print(f"Loaded {len(data)} verses from {TARGET_PATH.name}")

    # Pick which verses need work
    to_translate: dict = {}
    for vid, entry in data.items():
        if args.chapter and entry["chapter"] != args.chapter:
            continue
        if not args.force and not needs_translation(entry):
            continue
        to_translate[vid] = entry

    if args.limit:
        to_translate = dict(list(to_translate.items())[:args.limit])

    print(f"Verses needing translation: {len(to_translate)}")
    if data:
        already_done = sum(1 for v in data.values() if not needs_translation(v))
        print(f"Verses already translated:  {already_done}")

    if not to_translate:
        print("\n✓ Nothing to do. All verses already have translations.")
        return

    if args.dry_run:
        print("\n[dry run] No API calls will be made. Sample verses needing translation:")
        for vid in list(to_translate.keys())[:5]:
            print(f"  {vid}")
        return

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set. Check backend/.env")
        sys.exit(1)

    cost_str = estimate_cost(len(to_translate), ANTHROPIC_MODEL)
    print(f"\nEstimated cost: {cost_str}")
    print(f"Concurrency: {args.concurrency} parallel calls")
    if not args.yes:
        confirm = input("\nProceed? [y/N] ").strip().lower()
        if confirm not in ("y", "yes"):
            print("Aborted.")
            return

    if FAILURE_LOG.exists():
        FAILURE_LOG.unlink()

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    success_count = 0
    failure_count = 0
    start = time.time()

    print(f"\nTranslating {len(to_translate)} verses...\n")
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {
            executor.submit(translate_verse, client, vid, verse): (vid, verse)
            for vid, verse in to_translate.items()
        }
        for i, future in enumerate(as_completed(futures), 1):
            vid, verse = futures[future]
            translation = future.result()

            if translation is None:
                failure_count += 1
                print(f"  [{i:>3}/{len(to_translate)}] ✗ {vid} (see translate_failures.log)")
                continue

            data[vid]["translation"] = translation
            success_count += 1
            preview = translation[:70] + ("…" if len(translation) > 70 else "")
            print(f"  [{i:>3}/{len(to_translate)}] ✓ {vid}: {preview}")

            # Save every 25 verses so a crash mid-run doesn't lose much progress
            if i % 25 == 0:
                save_json(TARGET_PATH, data)

    save_json(TARGET_PATH, data)

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"  Translated: {success_count}")
    print(f"  Failed:     {failure_count}")
    print(f"  Elapsed:    {elapsed/60:.1f} minutes")
    print(f"  Output:     {TARGET_PATH}")
    if failure_count:
        print(f"  Failures:   {FAILURE_LOG}")
        print(f"\n  Re-run to retry failures: python scripts/translate_gita.py")
    print(f"\n  Next: restart your backend so verse cards show full English translations.")


if __name__ == "__main__":
    main()
