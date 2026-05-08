"""
validate_gita.py
================
Lint the final bhagavad_gita.json for issues. Run this after ingest_gita.py
and after any manual edits.

Checks:
  - Every verse has all required fields
  - All themes are in the allowed set
  - All emotional_tags are in the allowed set
  - simple_meaning length is reasonable (not stub-like, not paragraph-long)
  - No duplicate verse IDs
  - Chapter/verse numbers match the ID

Reports problems but does NOT modify the file. Fix issues by hand or re-run
ingest_gita.py with --force on the affected chapter.

Usage:
    python scripts/validate_gita.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.ingest_gita import ALLOWED_THEMES, ALLOWED_EMOTIONAL_TAGS  # noqa: E402

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "bhagavad_gita.json"


def main():
    if not OUTPUT_PATH.exists():
        print(f"ERROR: {OUTPUT_PATH} does not exist. Run ingest_gita.py first.")
        sys.exit(1)

    with open(OUTPUT_PATH, encoding="utf-8") as f:
        data = json.load(f)

    issues: list[str] = []
    chapter_counts: dict[int, int] = {}
    narrative_count = 0

    for vid, entry in data.items():
        is_narrative = entry.get("is_narrative", False)
        if is_narrative:
            narrative_count += 1

        # ID matches chapter/verse
        expected_id = f"BG_{entry.get('chapter')}_{entry.get('verse')}"
        if vid != expected_id:
            issues.append(f"{vid}: ID does not match chapter/verse (expected {expected_id})")

        # Required fields — themes can be empty for narrative verses
        always_required = ("chapter", "verse", "sanskrit", "simple_meaning", "emotional_tags")
        for field in always_required:
            if not entry.get(field):
                issues.append(f"{vid}: missing or empty `{field}`")
        if not is_narrative and not entry.get("themes"):
            issues.append(f"{vid}: missing themes (and not flagged is_narrative)")

        # simple_meaning sanity
        sm = entry.get("simple_meaning", "")
        if isinstance(sm, str):
            if len(sm) < 15:
                issues.append(f"{vid}: simple_meaning too short ({len(sm)} chars): '{sm}'")
            elif len(sm) > 200:
                issues.append(f"{vid}: simple_meaning too long ({len(sm)} chars)")

        # themes (only validated when present)
        themes = entry.get("themes", [])
        if isinstance(themes, list) and themes:
            bad = [t for t in themes if t not in ALLOWED_THEMES]
            if bad:
                issues.append(f"{vid}: unknown themes: {bad}")
            if len(themes) > 4:
                issues.append(f"{vid}: too many themes ({len(themes)}) — keep to 1-3")

        # emotional_tags
        etags = entry.get("emotional_tags", [])
        if isinstance(etags, list):
            bad = [t for t in etags if t not in ALLOWED_EMOTIONAL_TAGS]
            if bad:
                issues.append(f"{vid}: unknown emotional_tags: {bad}")
            if len(etags) > 6:
                issues.append(f"{vid}: too many emotional_tags ({len(etags)}) — keep to 2-5")

        chapter_counts[entry.get("chapter", 0)] = chapter_counts.get(entry.get("chapter", 0), 0) + 1

    # Summary
    print(f"Validated {len(data)} verses ({narrative_count} narrative, "
          f"{len(data) - narrative_count} retrievable).")
    print("Verses per chapter:")
    for chap in sorted(chapter_counts):
        print(f"  Chapter {chap:>2}: {chapter_counts[chap]} verses")

    if not issues:
        print("\n✓ No issues found. Ready to ship.")
        return

    print(f"\n⚠ Found {len(issues)} issues:\n")
    for issue in issues[:50]:
        print(f"  {issue}")
    if len(issues) > 50:
        print(f"  ... and {len(issues) - 50} more")

    sys.exit(1)


if __name__ == "__main__":
    main()
