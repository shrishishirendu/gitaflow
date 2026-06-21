"""
ingest_gita.py
==============
Reads data/gita_source.json (raw verses) and produces app/data/bhagavad_gita.json
(verses with full GitaMoment tagging metadata: simple_meaning, themes, emotional_tags).

This script:
  1. Estimates total cost and asks for confirmation BEFORE making API calls
  2. Skips verses that are already tagged in the existing bhagavad_gita.json
     (so your hand-curated 22 verses stay untouched, and crashed runs resume cleanly)
  3. Tags verses concurrently (5 at a time) for ~6x speedup
  4. Validates every response against a strict schema before saving
  5. Writes intermediate progress to disk every 10 verses (so a crash at #423
     means a re-run starts at #420, not #1)
  6. Logs all failures to scripts/failures.log for review

Usage:
    # First time:
    python scripts/fetch_gita_source.py        # fetches the 700 raw verses
    python scripts/ingest_gita.py              # tags them (~$2-5, 20-30 min)

    # Re-run with different prompt:
    python scripts/ingest_gita.py --force      # re-tags everything
    python scripts/ingest_gita.py --chapter 2  # re-tags just chapter 2

Environment:
    Reads ANTHROPIC_API_KEY and ANTHROPIC_MODEL from backend/.env
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
SOURCE_PATH = BACKEND_DIR / "data" / "gita_source.json"
OUTPUT_PATH = BACKEND_DIR / "app" / "data" / "bhagavad_gita.json"
FAILURE_LOG = Path(__file__).resolve().parent / "failures.log"

# ─────────────────────────────────────────────────────────────────────────
# Schema constants — mirrors the system prompt in app/prompts/karma_lens_system.md.
# Keep these in sync if you change one.
# ─────────────────────────────────────────────────────────────────────────
ALLOWED_THEMES = {
    "karma_yoga", "jnana_yoga", "bhakti_yoga", "dhyana_yoga",
    "swadharma", "detachment", "equanimity", "self-mastery",
    "devotion", "discipline", "surrender",
}

ALLOWED_EMOTIONAL_TAGS = {
    "anger", "anxiety", "fear", "confusion", "guilt", "jealousy",
    "sadness", "attachment", "restlessness", "pride", "peace",
    "gratitude", "avoidance", "helplessness", "hurt", "frustration",
    "overwhelm", "loneliness", "grief", "duty_conflict",
    "comparison_and_jealousy", "fear_of_failure", "expectation",
}


# ─────────────────────────────────────────────────────────────────────────
# Tagging prompt — kept here, not in /prompts, because it's a one-time
# tooling concern, not a runtime concern. Edit freely.
# ─────────────────────────────────────────────────────────────────────────
TAGGING_SYSTEM_PROMPT = f"""You are a Bhagavad Gita scholar tagging verses for an AI guidance app called GitaMoment.

For each verse you receive, return ONE JSON object — no preamble, no markdown fences — with three fields:

{{
  "simple_meaning": string,    // 1 short sentence, plain modern English. NOT a literal translation.
                                // Should sound like a wise friend, not a scripture footnote.
                                // Example: "Do your work fully. Don't tie your peace to a specific outcome."
  "themes": [string],          // 1-3 values from the allowed list below
  "emotional_tags": [string]   // 2-5 values from the allowed list below — the emotions/situations
                                // someone reading this verse would likely be feeling.
}}

ALLOWED themes (use exact strings):
  {sorted(ALLOWED_THEMES)}

ALLOWED emotional_tags (use exact strings):
  {sorted(ALLOWED_EMOTIONAL_TAGS)}

CRITICAL — themes vs. emotional_tags are different things:
  - `themes` = abstract Gita concepts (karma_yoga, equanimity, swadharma, etc.)
  - `emotional_tags` = what a reader is FEELING (anger, fear, duty_conflict, etc.)
  - Words like "duty_conflict", "comparison_and_jealousy", "fear_of_failure" are
    emotional_tags, NOT themes. Don't put them in the themes list.

NARRATIVE VERSES — important:
  Some verses are pure narrative or scene-setting and have NO actionable Gita teaching:
    - Chapter 1: Arjuna's lament, lists of warriors, conch shell descriptions
    - Chapter 11: cosmic vision descriptions
    - Other places where verses describe events rather than teach
  For these verses, return an EMPTY `themes` array (e.g., `"themes": []`) and only
  populate `emotional_tags` and `simple_meaning`. Don't force a theme like
  `swadharma` or `karma_yoga` if it isn't really there. The system handles empty
  themes correctly — these verses are preserved for context but not used for
  guidance retrieval.

GUIDELINES for `simple_meaning`:
  - Modern psychological language. Not preachy. Not religious-sounding.
  - 8-15 words ideal. Never more than 20.
  - Should make sense to someone who has never read the Gita.
  - Keep the verse's actual teaching — don't water it down to a generic platitude.

GUIDELINES for `themes` and `emotional_tags`:
  - Pick what genuinely fits this verse, not what sounds general.
  - Better to use 2 precise tags than 5 loose ones.
  - For narrative verses (e.g., Arjuna describing the battlefield in Chapter 1),
    pick what's emotionally true — confusion, fear, duty_conflict — not philosophical
    themes like karma_yoga that haven't been introduced yet.

Be honest if a verse doesn't have strong applicability to modern life — e.g., listing
warriors' names or describing conch shells. In those cases, give brief simple_meaning
and 1-2 minimal tags. Don't force depth that isn't there.
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
    # Sort entries by chapter, verse for clean diffs
    sorted_data = dict(sorted(data.items(), key=lambda kv: (kv[1]["chapter"], kv[1]["verse"])))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=2)


def log_failure(verse_id: str, error: str, raw: Optional[str] = None) -> None:
    FAILURE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(FAILURE_LOG, "a", encoding="utf-8") as f:
        f.write(f"[{verse_id}] {error}\n")
        if raw:
            f.write(f"  raw: {raw[:500]}\n")
        f.write("\n")


def is_already_tagged(entry: dict) -> bool:
    """A verse counts as 'tagged' if it has all three metadata fields populated."""
    return (
        bool(entry.get("simple_meaning"))
        and isinstance(entry.get("themes"), list) and len(entry["themes"]) > 0
        and isinstance(entry.get("emotional_tags"), list) and len(entry["emotional_tags"]) > 0
    )


def validate_tags(tags: dict) -> tuple[bool, str]:
    """Return (ok, reason). Strict — but with two mercies:

    1. If the model swapped an emotional_tag into themes (or vice versa),
       silently fix it instead of failing.
    2. If after auto-correction the verse has emotional_tags but no valid themes,
       mark it as narrative (`is_narrative: true`) instead of failing. These are
       Chapter 1 lament / Chapter 11 cosmic vision / warrior-list verses that have
       no philosophical theme to anchor on. They get preserved with simple_meaning
       and emotional_tags but are EXCLUDED from Karma Lens retrieval at runtime —
       they don't have actionable wisdom, just narrative context.
    """
    if not isinstance(tags.get("simple_meaning"), str) or not tags["simple_meaning"].strip():
        return False, "missing or empty simple_meaning"

    themes = tags.get("themes")
    if not isinstance(themes, list):
        themes = []

    etags = tags.get("emotional_tags")
    if not isinstance(etags, list) or len(etags) == 0:
        return False, "emotional_tags missing or empty"

    # Mercy 1 — Auto-correct: if a "theme" is actually a known emotional tag, move it.
    fixed_themes = []
    for t in themes:
        if t in ALLOWED_THEMES:
            fixed_themes.append(t)
        elif t in ALLOWED_EMOTIONAL_TAGS:
            if t not in etags:
                etags.append(t)
        # else: silently dropped (unknown value)

    # Mercy 1 (continued) — if an "emotional_tag" is actually a theme, move it.
    fixed_etags = []
    for t in etags:
        if t in ALLOWED_EMOTIONAL_TAGS:
            fixed_etags.append(t)
        elif t in ALLOWED_THEMES:
            if t not in fixed_themes:
                fixed_themes.append(t)
        # else: silently dropped

    if not fixed_etags:
        return False, f"no valid emotional_tags after auto-correct (had: {etags})"

    # Mercy 2 — narrative verse: keep simple_meaning and emotional_tags, mark as narrative,
    # leave themes empty. Runtime retrieval will skip these (see app/api/routes_karma_lens.py).
    if not fixed_themes:
        tags["is_narrative"] = True
        tags["themes"] = []
    else:
        tags["is_narrative"] = False
        tags["themes"] = fixed_themes

    tags["emotional_tags"] = fixed_etags

    if len(tags["simple_meaning"]) > 200:
        return False, f"simple_meaning too long ({len(tags['simple_meaning'])} chars)"

    return True, ""


# ─────────────────────────────────────────────────────────────────────────
# Per-verse tagging
# ─────────────────────────────────────────────────────────────────────────
def tag_verse(client: Anthropic, verse_id: str, verse: dict) -> Optional[dict]:
    """Call Claude to tag a single verse. Retries on rate-limit (429) errors
    with exponential backoff. Returns None on persistent failure (logged)."""
    user_message = (
        f"Verse: Bhagavad Gita {verse['chapter']}.{verse['verse']}\n"
        f"Sanskrit: {verse['sanskrit']}\n"
        f"Transliteration: {verse.get('transliteration', '')}\n"
        f"Translation: {verse.get('translation', '(use Sanskrit)')}"
    )

    # Retry up to 5 times on rate limit, with exponential backoff: 5s, 10s, 20s, 40s, 80s.
    # That's 155s of total wait in the worst case, which gives the per-minute token
    # bucket plenty of time to refill on a 30k TPM tier.
    last_error: Optional[Exception] = None
    for attempt in range(5):
        try:
            response = client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=400,
                system=TAGGING_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            break  # success — exit retry loop
        except Exception as e:  # noqa: BLE001
            last_error = e
            err_str = str(e)
            # Only retry on rate-limit errors. Everything else fails fast.
            if "429" in err_str or "rate_limit" in err_str.lower():
                wait = 5 * (2 ** attempt)  # 5, 10, 20, 40, 80
                print(f"    [{verse_id}] rate-limited, sleeping {wait}s (attempt {attempt + 1}/5)")
                time.sleep(wait)
                continue
            # Non-rate-limit error — bail.
            log_failure(verse_id, f"API call failed: {e}")
            return None
    else:
        # Exhausted all retries.
        log_failure(verse_id, f"API call failed after 5 retries: {last_error}")
        return None

    text = next((b.text for b in response.content if getattr(b, "type", None) == "text"), "")
    cleaned = text.replace("```json", "").replace("```", "").strip()

    try:
        tags = json.loads(cleaned)
    except json.JSONDecodeError as e:
        log_failure(verse_id, f"JSON parse error: {e}", cleaned)
        return None

    ok, reason = validate_tags(tags)
    if not ok:
        log_failure(verse_id, f"validation failed: {reason}", cleaned)
        return None

    return tags


# ─────────────────────────────────────────────────────────────────────────
# Cost estimation
# ─────────────────────────────────────────────────────────────────────────
def estimate_cost(num_verses: int, model: str) -> str:
    """Rough cost estimate. Per-verse: ~600 input tokens (system + verse) and ~200 output tokens."""
    # Sonnet 4.5 pricing as of 2026: $3/MTok input, $15/MTok output
    # Haiku 4.5: $1/MTok input, $5/MTok output
    if "haiku" in model.lower():
        in_rate, out_rate = 1.0, 5.0
    elif "opus" in model.lower():
        in_rate, out_rate = 15.0, 75.0
    else:  # default to sonnet
        in_rate, out_rate = 3.0, 15.0

    input_tokens = num_verses * 600
    output_tokens = num_verses * 200
    cost = (input_tokens / 1_000_000) * in_rate + (output_tokens / 1_000_000) * out_rate
    return f"~${cost:.2f} ({num_verses} verses × ~800 tokens, model: {model})"


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Tag Bhagavad Gita verses for GitaMoment.")
    parser.add_argument("--force", action="store_true",
                        help="Re-tag every verse, ignoring existing tags. Default: skip already-tagged.")
    parser.add_argument("--chapter", type=int, default=None,
                        help="Only tag verses from this chapter (e.g., --chapter 2).")
    parser.add_argument("--limit", type=int, default=None,
                        help="Stop after tagging N verses (useful for testing).")
    parser.add_argument("--concurrency", type=int, default=2,
                        help="How many verses to tag in parallel. Default: 2 (safe for 30k TPM tier). "
                             "Increase to 5 if you have a higher rate limit.")
    parser.add_argument("--yes", action="store_true",
                        help="Skip the cost-confirmation prompt.")
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set. Check backend/.env")
        sys.exit(1)

    # Load source verses
    if not SOURCE_PATH.exists():
        print(f"ERROR: {SOURCE_PATH} not found.")
        print("Run `python scripts/fetch_gita_source.py` first.")
        sys.exit(1)

    source = load_json(SOURCE_PATH)
    print(f"Loaded {len(source)} source verses from {SOURCE_PATH.name}")

    # Load existing tagged output (so we can preserve hand-curated tags)
    existing = load_json(OUTPUT_PATH)
    print(f"Loaded {len(existing)} previously-tagged verses from {OUTPUT_PATH.name}")

    # Decide which verses need tagging
    to_tag: dict = {}
    for vid, verse in source.items():
        if args.chapter and verse["chapter"] != args.chapter:
            continue
        existing_entry = existing.get(vid)
        if not args.force and existing_entry and is_already_tagged(existing_entry):
            continue
        to_tag[vid] = verse

    if args.limit:
        to_tag = dict(list(to_tag.items())[:args.limit])

    if not to_tag:
        print("\n✓ Nothing to do. All verses are already tagged.")
        print("  Use --force to re-tag, or --chapter N to target a specific chapter.")
        return

    # Cost confirmation
    cost_str = estimate_cost(len(to_tag), ANTHROPIC_MODEL)
    print(f"\nAbout to tag {len(to_tag)} verses.")
    print(f"Estimated cost: {cost_str}")
    print(f"Concurrency: {args.concurrency} parallel calls")
    if not args.yes:
        confirm = input("\nProceed? [y/N] ").strip().lower()
        if confirm not in ("y", "yes"):
            print("Aborted.")
            return

    # Clear failure log for this run
    if FAILURE_LOG.exists():
        FAILURE_LOG.unlink()

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    # Build the output dict (start from existing — we'll merge tagged results in)
    output: dict = dict(existing)
    success_count = 0
    failure_count = 0
    start = time.time()

    # Concurrent tagging with periodic disk saves
    print(f"\nTagging {len(to_tag)} verses...\n")
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {
            executor.submit(tag_verse, client, vid, verse): (vid, verse)
            for vid, verse in to_tag.items()
        }

        for i, future in enumerate(as_completed(futures), 1):
            vid, verse = futures[future]
            tags = future.result()

            if tags is None:
                failure_count += 1
                print(f"  [{i:>3}/{len(to_tag)}] ✗ {vid} (see failures.log)")
                continue

            output[vid] = {
                "chapter": verse["chapter"],
                "verse": verse["verse"],
                "sanskrit": verse["sanskrit"],
                "transliteration": verse.get("transliteration", ""),
                "translation": verse.get("translation", ""),
                **tags,
            }
            success_count += 1
            print(f"  [{i:>3}/{len(to_tag)}] ✓ {vid}: {tags['simple_meaning'][:60]}")

            # Save every 10 verses so a crash doesn't lose progress
            if i % 10 == 0:
                save_json(OUTPUT_PATH, output)

    # Final save
    save_json(OUTPUT_PATH, output)

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"  Tagged: {success_count}")
    print(f"  Failed: {failure_count}")
    print(f"  Elapsed: {elapsed/60:.1f} minutes")
    print(f"  Output:  {OUTPUT_PATH}")
    if failure_count:
        print(f"  Failures logged to: {FAILURE_LOG}")
        print(f"\n  Re-run to retry failures: python scripts/ingest_gita.py")
    print(f"\n  Next: restart your backend so it picks up the new verses.")


if __name__ == "__main__":
    main()
