"""
Admin API — password-protected endpoints for managing verse media.

  GET  /api/admin/verses              search verses (paginated)
  GET  /api/admin/verses/{verse_id}   get one verse + its media
  PUT  /api/admin/verses/{verse_id}   update verse media (youtube, podcast, infographic)
  GET  /api/admin/stats               quick stats (how many verses have media)

Authentication: simple password via X-Admin-Password header.
The password is set via ADMIN_PASSWORD environment variable on Railway.
This is intentionally simple — no JWT, no sessions. You're the only admin.

The verse_media table is created by init_db() in database.py via the
migration pattern we've used throughout (idempotent, safe to run on boot).
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.db.deps import get_db_dep

router = APIRouter()

# ── Auth ──────────────────────────────────────────────────────────────────
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "gitaflow-admin-2026")

def require_admin(x_admin_password: Optional[str] = Header(None)):
    """Simple header-based auth. Set ADMIN_PASSWORD env var on Railway."""
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin password. Set X-Admin-Password header.",
        )

# ── Verse library (read-only reference) ──────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"

with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES: dict = json.load(f)


def _get_media(conn: sqlite3.Connection, verse_id: str) -> dict:
    """Get media record for a verse, or empty defaults."""
    row = conn.execute(
        "SELECT * FROM verse_media WHERE verse_id = ?", (verse_id,)
    ).fetchone()
    if row:
        return dict(row)
    return {
        "verse_id": verse_id,
        "youtube_url": None,
        "podcast_url": None,
        "infographic_url": None,
    }


def _verse_summary(vid: str, v: dict, media: dict) -> dict:
    """Shape a verse + its media for the admin panel."""
    has_media = any([
        media.get("youtube_url"),
        media.get("podcast_url"),
        media.get("infographic_url"),
    ])
    return {
        "verse_id": vid,
        "chapter": v.get("chapter"),
        "verse": v.get("verse"),
        "simple_meaning": (v.get("simple_meaning") or "")[:120],
        "has_media": has_media,
        "youtube_url": media.get("youtube_url"),
        "podcast_url": media.get("podcast_url"),
        "infographic_url": media.get("infographic_url"),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────
@router.get("/admin/verses")
def search_verses(
    q: str = "",
    chapter: Optional[int] = None,
    has_media: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_admin),
):
    """Search/filter verses for the admin panel.

    Supports:
      - ?q=anger          full-text search on simple_meaning + themes
      - ?chapter=2        filter by chapter
      - ?has_media=true   show only verses with at least one media link
      - ?page=2           pagination
    """
    results = []
    q_lower = q.lower().strip()

    for vid, v in _VERSES.items():
        # Chapter filter
        if chapter is not None and v.get("chapter") != chapter:
            continue

        # Text search across simple_meaning, themes, emotional_tags
        if q_lower:
            searchable = " ".join([
                (v.get("simple_meaning") or "").lower(),
                " ".join(v.get("themes") or []),
                " ".join(v.get("emotional_tags") or []),
                f"bg {v.get('chapter')} {v.get('verse')}",
                f"bg_{v.get('chapter')}_{v.get('verse')}",
            ])
            if q_lower not in searchable:
                continue

        media = _get_media(conn, vid)

        # Media filter
        if has_media is True and not any([
            media.get("youtube_url"),
            media.get("podcast_url"),
            media.get("infographic_url"),
        ]):
            continue
        if has_media is False and any([
            media.get("youtube_url"),
            media.get("podcast_url"),
            media.get("infographic_url"),
        ]):
            continue

        results.append(_verse_summary(vid, v, media))

    # Sort by chapter + verse number
    results.sort(key=lambda r: (r["chapter"], r["verse"]))

    # Pagination
    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "results": results[start:end],
    }


@router.get("/admin/verses/{verse_id}")
def get_verse_admin(
    verse_id: str,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_admin),
):
    """Get full verse details + media for editing."""
    v = _VERSES.get(verse_id)
    if not v:
        raise HTTPException(404, f"Verse {verse_id} not found")
    media = _get_media(conn, verse_id)
    return {
        "verse_id": verse_id,
        "chapter": v.get("chapter"),
        "verse": v.get("verse"),
        "sanskrit": v.get("sanskrit"),
        "transliteration": v.get("transliteration"),
        "translation": v.get("translation"),
        "simple_meaning": v.get("simple_meaning"),
        "themes": v.get("themes") or [],
        "emotional_tags": v.get("emotional_tags") or [],
        "youtube_url": media.get("youtube_url"),
        "podcast_url": media.get("podcast_url"),
        "infographic_url": media.get("infographic_url"),
    }


class VerseMediaUpdate(BaseModel):
    youtube_url: Optional[str] = None
    podcast_url: Optional[str] = None
    infographic_url: Optional[str] = None


@router.put("/admin/verses/{verse_id}")
def update_verse_media(
    verse_id: str,
    body: VerseMediaUpdate,
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_admin),
):
    """Save YouTube, podcast, and infographic URLs for a verse.

    Uses UPSERT so you can call this whether or not a record exists yet.
    Pass null/empty string to clear a field.
    """
    if verse_id not in _VERSES:
        raise HTTPException(404, f"Verse {verse_id} not found")

    # Normalise: empty string → None
    youtube = body.youtube_url or None
    podcast = body.podcast_url or None
    infographic = body.infographic_url or None

    conn.execute(
        """
        INSERT INTO verse_media (verse_id, youtube_url, podcast_url, infographic_url)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(verse_id) DO UPDATE SET
            youtube_url = excluded.youtube_url,
            podcast_url = excluded.podcast_url,
            infographic_url = excluded.infographic_url,
            updated_at = CURRENT_TIMESTAMP
        """,
        (verse_id, youtube, podcast, infographic),
    )
    conn.commit()

    return _get_media(conn, verse_id)


@router.get("/admin/stats")
def admin_stats(
    conn: sqlite3.Connection = Depends(get_db_dep),
    _: None = Depends(require_admin),
):
    """Quick stats for the admin dashboard header."""
    total_verses = len(_VERSES)

    rows = conn.execute(
        """
        SELECT
            COUNT(*) as total_with_media,
            SUM(CASE WHEN youtube_url IS NOT NULL THEN 1 ELSE 0 END) as with_youtube,
            SUM(CASE WHEN podcast_url IS NOT NULL THEN 1 ELSE 0 END) as with_podcast,
            SUM(CASE WHEN infographic_url IS NOT NULL THEN 1 ELSE 0 END) as with_infographic
        FROM verse_media
        WHERE youtube_url IS NOT NULL
           OR podcast_url IS NOT NULL
           OR infographic_url IS NOT NULL
        """
    ).fetchone()

    return {
        "total_verses": total_verses,
        "with_any_media": rows["total_with_media"] if rows else 0,
        "with_youtube": rows["with_youtube"] if rows else 0,
        "with_podcast": rows["with_podcast"] if rows else 0,
        "with_infographic": rows["with_infographic"] if rows else 0,
    }
