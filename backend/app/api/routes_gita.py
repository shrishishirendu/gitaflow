"""
Gita Explorer API — public, unauthenticated.

  GET /api/gita/chapters                  list all 18 chapters with intros
  GET /api/gita/chapters/{n}              one chapter: intro + all its verses
  GET /api/gita/verses/{verse_id}         single verse details

Each verse now includes media fields (youtube_url, podcast_url,
infographic_url) pulled from the verse_media table. These are populated
via the admin panel at /admin and persist in SQLite across Railway redeploys.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.db.deps import get_db_dep

router = APIRouter()

_BASE = Path(__file__).resolve().parent.parent
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"
_CHAPTER_INTROS_PATH = _BASE / "data" / "chapter_intros.json"

with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES: dict = json.load(f)

with open(_CHAPTER_INTROS_PATH, encoding="utf-8") as f:
    _CHAPTER_INTROS = {c["number"]: c for c in json.load(f)["chapters"]}

# Pre-compute chapter → [verse_ids] sorted by verse number
_VERSES_BY_CHAPTER: dict[int, list[str]] = {}
for vid, v in _VERSES.items():
    chapter = v.get("chapter")
    if chapter is None:
        continue
    _VERSES_BY_CHAPTER.setdefault(chapter, []).append(vid)
for chapter, ids in _VERSES_BY_CHAPTER.items():
    ids.sort(key=lambda vid: _VERSES[vid].get("verse", 0))


def _get_all_media(conn: sqlite3.Connection) -> dict[str, dict]:
    """Load all verse_media rows into a dict keyed by verse_id.
    Called once per chapter request — cheap since the table is small."""
    rows = conn.execute("SELECT * FROM verse_media").fetchall()
    return {r["verse_id"]: dict(r) for r in rows}


def _verse_for_explorer(vid: str, v: dict, media: dict | None = None) -> dict:
    """Shape a verse for Explorer consumption."""
    m = media or {}
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
        # Media fields — null until populated via admin panel
        "youtube_url": m.get("youtube_url"),
        "podcast_url": m.get("podcast_url"),
        "infographic_url": m.get("infographic_url"),
    }


@router.get("/gita/chapters")
def list_chapters(conn: sqlite3.Connection = Depends(get_db_dep)):
    """Return all 18 chapters with their intros and verse counts."""
    chapters = []
    for n in sorted(_CHAPTER_INTROS.keys()):
        intro = _CHAPTER_INTROS[n]
        actual_verse_count = len(_VERSES_BY_CHAPTER.get(n, []))
        chapters.append({
            "number": n,
            "name_sanskrit": intro["name_sanskrit"],
            "name_english": intro["name_english"],
            "intro": intro["intro"],
            "verse_count": actual_verse_count,
            "verse_count_canonical": intro.get("verse_count", actual_verse_count),
        })
    return {"chapters": chapters}


@router.get("/gita/chapters/{chapter_number}")
def get_chapter(
    chapter_number: int,
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return one chapter's intro + ALL its verses with media."""
    if chapter_number < 1 or chapter_number > 18:
        raise HTTPException(404, "Chapter must be 1-18")

    intro = _CHAPTER_INTROS.get(chapter_number)
    if not intro:
        raise HTTPException(404, "Chapter intro not found")

    all_media = _get_all_media(conn)
    verse_ids = _VERSES_BY_CHAPTER.get(chapter_number, [])
    verses = [
        _verse_for_explorer(vid, _VERSES[vid], all_media.get(vid))
        for vid in verse_ids
    ]

    return {
        "number": chapter_number,
        "name_sanskrit": intro["name_sanskrit"],
        "name_english": intro["name_english"],
        "intro": intro["intro"],
        "verse_count": len(verses),
        "verses": verses,
    }


@router.get("/gita/verses/{verse_id}")
def get_verse(
    verse_id: str,
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return a single verse by its full ID with media."""
    v = _VERSES.get(verse_id)
    if not v:
        raise HTTPException(404, f"Verse {verse_id} not found")

    media_row = conn.execute(
        "SELECT * FROM verse_media WHERE verse_id = ?", (verse_id,)
    ).fetchone()
    media = dict(media_row) if media_row else None

    return _verse_for_explorer(verse_id, v, media)
