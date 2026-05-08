"""
User repository — find-or-create by device_id, future-ready for Google Sign-In.

The pattern: every API call from a client includes an `X-Device-Id` header.
Backend looks up that device_id; if found, returns the existing user; if not,
creates a new anonymous user and returns it. The client never has to "register"
or "log in" — it just uses the app, and a user record materializes silently.

When Google Sign-In is added later, sign-in calls will populate `google_id`,
`email`, and `display_name` on the existing user record (linked by device_id),
preserving the user's reflection history seamlessly.
"""

from __future__ import annotations

import sqlite3
import uuid
from typing import Optional


def find_or_create_by_device(conn: sqlite3.Connection, device_id: str) -> dict:
    """Return the user row for `device_id`, creating it if absent.

    Updates `last_seen_at` on every call — gives us cheap activity telemetry.
    """
    if not device_id or len(device_id) > 100:
        raise ValueError("device_id must be a non-empty string under 100 chars")

    row = conn.execute(
        "SELECT * FROM users WHERE device_id = ?", (device_id,)
    ).fetchone()

    if row is not None:
        # Existing user — touch last_seen_at so we know they're still around.
        conn.execute(
            "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
            (row["id"],),
        )
        return dict(row)

    # New user — create the record.
    user_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO users (id, device_id)
        VALUES (?, ?)
        """,
        (user_id, device_id),
    )
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row)


def get_by_id(conn: sqlite3.Connection, user_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def update_tone_preference(
    conn: sqlite3.Connection, user_id: str, tone: str
) -> None:
    """Used later by the onboarding flow."""
    allowed = {"simple_practical", "spiritual_reflective", "deep_philosophical"}
    if tone not in allowed:
        raise ValueError(f"tone must be one of {allowed}")
    conn.execute(
        "UPDATE users SET tone_preference = ? WHERE id = ?", (tone, user_id)
    )
