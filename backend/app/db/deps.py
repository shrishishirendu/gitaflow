"""
Auth dependency: extracts the X-Device-Id header from incoming requests,
finds-or-creates the corresponding user, and yields both the database
connection and the user record to the route handler.

Today this is the entire "auth" surface — anonymous, device-based.

When Google Sign-In is added later, we'll add a SECOND dependency that
prefers a JWT (when present) over the device header, but falls back to it
when no JWT is provided. That way, signed-in and anonymous users coexist
on the same endpoints.
"""

from __future__ import annotations

import sqlite3
from typing import Iterator

from fastapi import Depends, Header, HTTPException

from app.db.database import get_db
from app.db.users_repo import find_or_create_by_device


def get_db_dep() -> Iterator[sqlite3.Connection]:
    """Plain DB dependency (no user)."""
    with get_db() as conn:
        yield conn


def current_user(
    x_device_id: str | None = Header(default=None, alias="X-Device-Id"),
    conn: sqlite3.Connection = Depends(get_db_dep),
) -> dict:
    """Resolve the caller via X-Device-Id header. Auto-provisions on first sight."""
    if not x_device_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing X-Device-Id header. Each client must generate a "
                "stable UUID on first launch and send it on every request."
            ),
        )
    if len(x_device_id) > 100:
        raise HTTPException(status_code=400, detail="X-Device-Id too long")
    return find_or_create_by_device(conn, x_device_id)


def current_user_with_db(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
) -> tuple[dict, sqlite3.Connection]:
    """Convenience for routes that need both user and connection."""
    return user, conn
