"""
fetch_gita_source.py
====================
Downloads the full Bhagavad Gita (all 700 verses) from the public-domain
gita/gita GitHub repository and normalizes it into a structure GitaFlow
can use as input for tagging.

This is Step 1 of two:
  1. fetch_gita_source.py  → produces data/gita_source.json (verses only, no tags)
  2. ingest_gita.py        → reads gita_source.json, calls Claude to tag each
                              verse, writes app/data/bhagavad_gita.json

Source: https://github.com/gita/gita  (Unlicense, public domain)

Why this two-step split:
  - Fetching is free and deterministic — does not need re-running often.
  - Tagging is paid (Claude API) and iterative — you'll re-run as you
    refine prompts.
  - Separating them means a tagging crash doesn't lose your source data.

Usage:
    python scripts/fetch_gita_source.py

Output:
    backend/data/gita_source.json  (a dict keyed by BG_<chapter>_<verse>)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import urllib.request

# Public-domain source. The gita/gita repo is Unlicense-licensed.
SOURCE_URLS = [
    # Primary source — chapters 1..18 split into separate JSON files.
    # We try this first because it's well-structured and verified public domain.
    "https://raw.githubusercontent.com/gita/gita/main/data/verse.json",
]

# Fallback: try this if the above changes structure or moves.
# This is a different community-curated dataset with the same shape.
FALLBACK_URLS = [
    "https://raw.githubusercontent.com/Ganeshsharma03/Bhagavad-Gita-Verse-Finder/main/bhagavad-gita.json",
]

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "gita_source.json"


def fetch_json(url: str) -> list | dict:
    """Fetch JSON from a URL with a sane timeout and helpful error."""
    print(f"  → trying {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "GitaFlow/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize(raw) -> dict:
    """
    Normalize whatever shape the source gave us into a single canonical dict:

        {
          "BG_2_47": {
            "chapter": 2,
            "verse": 47,
            "sanskrit": "...",
            "transliteration": "...",
            "translation": "..."
          },
          ...
        }

    The gita/gita repo gives us a flat list of verse objects, each with
    chapter_number, verse_number, text, transliteration, word_meanings.
    Different sources have different keys, so we coerce here.
    """
    verses: dict = {}

    # gita/gita repo shape: list of objects with chapter_number, verse_number, text, ...
    if isinstance(raw, list):
        for v in raw:
            chapter = v.get("chapter_number") or v.get("chapter")
            verse = v.get("verse_number") or v.get("verse")
            sanskrit = v.get("text") or v.get("sanskrit") or ""
            transliteration = v.get("transliteration") or ""
            # The gita repo doesn't ship English translation in verse.json;
            # we'll fall back to a placeholder and let Claude work from
            # Sanskrit + transliteration. That's fine — Claude reads Sanskrit.
            translation = v.get("translation") or v.get("english") or ""

            if not chapter or not verse:
                continue

            key = f"BG_{chapter}_{verse}"
            verses[key] = {
                "chapter": int(chapter),
                "verse": int(verse),
                "sanskrit": sanskrit.strip(),
                "transliteration": transliteration.strip(),
                "translation": translation.strip(),
            }

    # Some other shapes: dict keyed by chapter, with verses nested.
    elif isinstance(raw, dict):
        for chap_key, chap_val in raw.items():
            verses_in_chap = chap_val.get("verses", []) if isinstance(chap_val, dict) else []
            for v in verses_in_chap:
                chapter = v.get("chapter_number") or int(chap_key) if str(chap_key).isdigit() else None
                verse = v.get("verse_number") or v.get("verse")
                if not chapter or not verse:
                    continue
                key = f"BG_{chapter}_{verse}"
                verses[key] = {
                    "chapter": int(chapter),
                    "verse": int(verse),
                    "sanskrit": (v.get("text") or v.get("sanskrit") or "").strip(),
                    "transliteration": (v.get("transliteration") or "").strip(),
                    "translation": (v.get("translation") or v.get("english") or "").strip(),
                }

    return verses


def main():
    print("Fetching Bhagavad Gita source from public-domain repositories...")
    raw = None
    last_error = None

    for url in SOURCE_URLS + FALLBACK_URLS:
        try:
            raw = fetch_json(url)
            print(f"    ✓ got {len(raw) if hasattr(raw, '__len__') else '?'} entries")
            break
        except Exception as e:  # noqa: BLE001
            last_error = e
            print(f"    ✗ failed: {e}")

    if raw is None:
        print(f"\nERROR: could not fetch from any source. Last error: {last_error}")
        print("Check your internet connection, then re-run this script.")
        sys.exit(1)

    print("\nNormalizing into GitaFlow's verse schema...")
    verses = normalize(raw)

    if not verses:
        print("ERROR: normalization produced 0 verses. The source schema may have changed.")
        print(f"Raw type: {type(raw).__name__}, length: {len(raw) if hasattr(raw, '__len__') else 'n/a'}")
        sys.exit(1)

    # Sort by chapter, verse
    verses_sorted = dict(sorted(verses.items(), key=lambda kv: (kv[1]["chapter"], kv[1]["verse"])))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(verses_sorted, f, ensure_ascii=False, indent=2)

    # Summary
    chapters = sorted({v["chapter"] for v in verses_sorted.values()})
    print(f"\n✓ Wrote {len(verses_sorted)} verses across {len(chapters)} chapters.")
    print(f"  → {OUTPUT_PATH}")
    print(f"\nNext step: run `python scripts/ingest_gita.py` to tag each verse.")


if __name__ == "__main__":
    main()
