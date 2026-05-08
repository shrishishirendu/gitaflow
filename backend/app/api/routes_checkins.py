"""
Checkins API.

  POST  /api/checkins        log an emotional check-in (from home screen chip tap)
  GET   /api/checkins        recent check-ins (Session 2 home will use this)
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.db.deps import current_user, get_db_dep
from app.db.repositories import list_recent_checkins, save_checkin


router = APIRouter()


# Allowed PRESET emotions for the home-screen chips. Free-text custom emotions
# are also accepted (saved as-is, lowercased and trimmed) — that's the escape
# hatch for users whose feeling doesn't fit a chip.
HOME_CHIPS = {"lifting", "steady", "weighing"}

# Legacy values from earlier prototypes — accepted so old data still loads,
# but new clients use HOME_CHIPS.
LEGACY_CHIPS = {"calm", "cloudy", "stirred", "heated", "tender"}


class SaveCheckinRequest(BaseModel):
    emotion: str = Field(
        ..., min_length=1, max_length=40,
        description="One of the home chips, or a free-text word the user typed.",
    )
    note: str | None = Field(None, max_length=500)


@router.post("/checkins")
def save(
    body: SaveCheckinRequest,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    # Normalize: lowercase, strip whitespace. Allow chips OR free-text.
    # Reject obvious junk: empty after strip, multi-word screeds, control chars.
    raw = body.emotion.strip().lower()
    if not raw or len(raw) > 40:
        return {"error": "emotion must be 1-40 characters"}, 400
    # Free-text should be a single feeling word or short phrase, not a sentence.
    # Allow letters, spaces, hyphens. No multi-sentence dumping.
    if any(c in raw for c in ".,;:!?\n\r\t"):
        return {"error": "emotion should be a single word or short phrase, not a sentence"}, 400

    checkin_id = save_checkin(conn, user["id"], raw, body.note)
    return {"id": checkin_id, "saved": True}


@router.get("/checkins/today")
def today(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return the user's most recent check-in IF it was made today.
    Used by the home screen to know which arrival chip should appear active.

    Shape: {"emotion": "calm" | null, "created_at": "..." | null}
    """
    row = conn.execute(
        """
        SELECT emotion, created_at FROM checkins
        WHERE user_id = ?
          AND date(created_at) = date('now')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user["id"],),
    ).fetchone()
    if not row:
        return {"emotion": None, "created_at": None}
    return {"emotion": row["emotion"], "created_at": row["created_at"]}


@router.get("/checkins")
def list_mine(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
    limit: int = 30,
):
    return {"checkins": list_recent_checkins(conn, user["id"], limit=limit)}
