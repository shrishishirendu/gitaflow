"""
User-level API.

  GET   /api/users/me              return the current user record
  POST  /api/users/onboarding      save onboarding answers, stamp onboarded_at
"""

from __future__ import annotations

import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.deps import current_user, get_db_dep
from app.db.users_repo import (
    ALLOWED_INTENTIONS,
    ALLOWED_TONES,
    save_onboarding,
)


router = APIRouter()


def _user_response(user: dict) -> dict:
    """Shape the user record for client consumption.

    Does NOT leak fields the client shouldn't see (none right now, but
    future-proofing). Boolean flags are normalized.
    """
    return {
        "id": user["id"],
        "tone_preference": user.get("tone_preference") or "simple_practical",
        "intention": user.get("intention"),
        "daily_reminder_opt_in": bool(user.get("daily_reminder_opt_in") or 0),
        "onboarded_at": user.get("onboarded_at"),
        "created_at": user.get("created_at"),
    }


@router.get("/users/me")
def me(user: dict = Depends(current_user)):
    """Return the current user. The act of calling this also touches
    `last_seen_at` server-side (handled inside `current_user`)."""
    return _user_response(user)


class OnboardingPayload(BaseModel):
    intention: Optional[str] = Field(
        None, description=f"One of {sorted(ALLOWED_INTENTIONS)} or null if skipped"
    )
    tone_preference: str = Field(
        ..., description=f"One of {sorted(ALLOWED_TONES)}"
    )
    daily_reminder_opt_in: bool = False


@router.post("/users/onboarding")
def submit_onboarding(
    body: OnboardingPayload,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    try:
        updated = save_onboarding(
            conn,
            user_id=user["id"],
            intention=body.intention,
            tone_preference=body.tone_preference,
            daily_reminder_opt_in=body.daily_reminder_opt_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return _user_response(updated)
