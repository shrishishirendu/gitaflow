"""
Gita Explorer API — public, unauthenticated.

The Explorer is the *free* entry point to GitaFlow. Anyone can browse all
697 verses, organized by chapter, with proper Devanagari text, transliteration,
translation, and plain-English meaning.

  GET /api/gita/chapters                  list all 18 chapters with intros
  GET /api/gita/chapters/{n}              one chapter: intro + all its verses
  GET /api/gita/verses/{verse_id}         single verse details (e.g. BG_2_47)

Notes for future:
  - Search lives in Phase 2. The current endpoints support reading; search
    will be added as `GET /api/gita/search?q=...` later.
  - YouTube integration: the verse schema can carry a `youtube_video_id`
    field. The Explorer UI will check for and surface it. Most verses won't
    have one initially — we backfill as your channel grows.
  - Bookmarks live in Phase 2 — they require a new persistence table.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

router = APIRouter()

# Load static content once at import.
_BASE = Path(__file__).resolve().parent.parent
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"
_CHAPTER_INTROS_PATH = _BASE / "data" / "chapter_intros.json"

with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES: dict = json.load(f)

with open(_CHAPTER_INTROS_PATH, encoding="utf-8") as f:
    _CHAPTER_INTROS = {c["number"]: c for c in json.load(f)["chapters"]}

# Pre-compute chapter -> [verse_ids] for fast lookup.
# Sort the verses within each chapter by verse number.
_VERSES_BY_CHAPTER: dict[int, list[str]] = {}
for vid, v in _VERSES.items():
    chapter = v.get("chapter")
    if chapter is None:
        continue
    _VERSES_BY_CHAPTER.setdefault(chapter, []).append(vid)
for chapter, ids in _VERSES_BY_CHAPTER.items():
    ids.sort(key=lambda vid: _VERSES[vid].get("verse", 0))


def _verse_for_explorer(vid: str, v: dict) -> dict:
    """Shape a verse for Explorer consumption. Includes everything the
    reader needs, plus optional YouTube info if present."""
    return {
        "verse_id": vid,
        "chapter": v.get("chapter"),
        "verse": v.get("verse"),
        "sanskrit": v.get("sanskrit"),
        "transliteration": v.get("transliteration"),
        "translation": v.get("translation"),
        "simple_meaning": v.get("simple_meaning"),
        "themes": v.get("themes") or [],
        "emotional_tags": v.get("emotional_tags") or [],
        "is_narrative": v.get("is_narrative", False),
        "youtube_video_id": v.get("youtube_video_id"),  # null until populated
    }


@router.get("/gita/chapters")
def list_chapters():
    """Return all 18 chapters with their intros and verse counts.
    Used by the Explorer's chapter-list screen."""
    chapters = []
    for n in sorted(_CHAPTER_INTROS.keys()):
        intro = _CHAPTER_INTROS[n]
        actual_verse_count = len(_VERSES_BY_CHAPTER.get(n, []))
        chapters.append({
            "number": n,
            "name_sanskrit": intro["name_sanskrit"],
            "name_english": intro["name_english"],
            "intro": intro["intro"],
            # Spec'd verse count from intros file vs. what's actually in
            # the library — these should match but we surface both for
            # transparency. If they don't match, log it so we can audit.
            "verse_count": actual_verse_count,
            "verse_count_canonical": intro.get("verse_count", actual_verse_count),
        })
    return {"chapters": chapters}


@router.get("/gita/chapters/{chapter_number}")
def get_chapter(chapter_number: int):
    """Return one chapter's intro + ALL its verses, in verse order.
    The Explorer reads this when entering a chapter."""
    if chapter_number < 1 or chapter_number > 18:
        raise HTTPException(404, "Chapter must be 1-18")

    intro = _CHAPTER_INTROS.get(chapter_number)
    if not intro:
        raise HTTPException(404, "Chapter intro not found")

    verse_ids = _VERSES_BY_CHAPTER.get(chapter_number, [])
    verses = [_verse_for_explorer(vid, _VERSES[vid]) for vid in verse_ids]

    return {
        "number": chapter_number,
        "name_sanskrit": intro["name_sanskrit"],
        "name_english": intro["name_english"],
        "intro": intro["intro"],
        "verse_count": len(verses),
        "verses": verses,
    }


@router.get("/gita/verses/{verse_id}")
def get_verse(verse_id: str):
    """Return a single verse by its full ID (e.g. BG_2_47).
    Used when the Explorer deep-links into a verse, or when the Karma Lens
    'Bring this to Lens' bridge needs the verse text."""
    v = _VERSES.get(verse_id)
    if not v:
        raise HTTPException(404, f"Verse {verse_id} not found")
    return _verse_for_explorer(verse_id, v)
