"""
Repository for journey progress and per-day completions.

Design notes:
  - Only one active journey per user at a time (enforced in code).
  - Pause-and-switch: pausing journey A and starting B keeps both rows;
    A's state moves from 'active' to 'paused', B is created with 'active'.
  - Resuming a paused journey moves the latest paused row back to 'active'
    and pauses anything else that was active.
  - Day completions are unique per (progress_id, day_number) so the user
    can't double-complete a day.
"""

from __future__ import annotations

import sqlite3
import uuid
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────
# Active journey lookups
# ─────────────────────────────────────────────────────────────────────────
def get_active_journey(conn: sqlite3.Connection, user_id: str) -> Optional[dict]:
    """Return the user's currently active journey progress row, or None."""
    row = conn.execute(
        """
        SELECT * FROM journey_progress
        WHERE user_id = ? AND state = 'active'
        ORDER BY started_at DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    return dict(row) if row else None


def list_journey_progress(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    """All journey progress rows for a user (active, paused, completed),
    most recent first. Used by the journeys index screen."""
    rows = conn.execute(
        """
        SELECT * FROM journey_progress
        WHERE user_id = ?
        ORDER BY
          CASE state WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
          started_at DESC
        """,
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_progress_by_id(
    conn: sqlite3.Connection, user_id: str, progress_id: str
) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM journey_progress WHERE id = ? AND user_id = ?",
        (progress_id, user_id),
    ).fetchone()
    return dict(row) if row else None


# ─────────────────────────────────────────────────────────────────────────
# Start / pause / resume / complete
# ─────────────────────────────────────────────────────────────────────────
def start_journey(
    conn: sqlite3.Connection, user_id: str, journey_slug: str
) -> dict:
    """Start a new journey. If user has an existing active journey on a
    DIFFERENT slug, that one is paused. If user has a paused journey on
    the SAME slug, that one is resumed instead of creating a new row.
    """
    # Same-slug paused row exists? Resume it.
    paused_same = conn.execute(
        """
        SELECT * FROM journey_progress
        WHERE user_id = ? AND journey_slug = ? AND state = 'paused'
        ORDER BY started_at DESC LIMIT 1
        """,
        (user_id, journey_slug),
    ).fetchone()

    if paused_same:
        # Pause anything else that's active first
        conn.execute(
            "UPDATE journey_progress SET state = 'paused' WHERE user_id = ? AND state = 'active'",
            (user_id,),
        )
        conn.execute(
            "UPDATE journey_progress SET state = 'active' WHERE id = ?",
            (paused_same["id"],),
        )
        return dict(
            conn.execute(
                "SELECT * FROM journey_progress WHERE id = ?", (paused_same["id"],)
            ).fetchone()
        )

    # Pause anything currently active
    conn.execute(
        "UPDATE journey_progress SET state = 'paused' WHERE user_id = ? AND state = 'active'",
        (user_id,),
    )

    # Create fresh
    progress_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO journey_progress (id, user_id, journey_slug) VALUES (?, ?, ?)",
        (progress_id, user_id, journey_slug),
    )
    return dict(
        conn.execute(
            "SELECT * FROM journey_progress WHERE id = ?", (progress_id,)
        ).fetchone()
    )


def pause_journey(conn: sqlite3.Connection, user_id: str, progress_id: str) -> bool:
    cursor = conn.execute(
        """
        UPDATE journey_progress SET state = 'paused'
        WHERE id = ? AND user_id = ? AND state = 'active'
        """,
        (progress_id, user_id),
    )
    return cursor.rowcount > 0


def resume_journey(
    conn: sqlite3.Connection, user_id: str, progress_id: str
) -> bool:
    """Resume a paused journey, pausing anything else active."""
    progress = conn.execute(
        "SELECT * FROM journey_progress WHERE id = ? AND user_id = ?",
        (progress_id, user_id),
    ).fetchone()
    if not progress or progress["state"] != "paused":
        return False

    conn.execute(
        "UPDATE journey_progress SET state = 'paused' WHERE user_id = ? AND state = 'active'",
        (user_id,),
    )
    conn.execute(
        "UPDATE journey_progress SET state = 'active' WHERE id = ?",
        (progress_id,),
    )
    return True


def mark_completed_if_finished(
    conn: sqlite3.Connection, progress_id: str, total_days: int
) -> bool:
    """If all `total_days` days are completed, mark the journey completed.
    Returns True if it just transitioned to completed."""
    row = conn.execute(
        "SELECT state FROM journey_progress WHERE id = ?", (progress_id,)
    ).fetchone()
    if not row or row["state"] == "completed":
        return False

    count = conn.execute(
        "SELECT COUNT(*) AS n FROM journey_day_completions WHERE progress_id = ?",
        (progress_id,),
    ).fetchone()["n"]
    if count >= total_days:
        conn.execute(
            "UPDATE journey_progress SET state = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (progress_id,),
        )
        return True
    return False


# ─────────────────────────────────────────────────────────────────────────
# Day completions
# ─────────────────────────────────────────────────────────────────────────
def complete_day(
    conn: sqlite3.Connection,
    user_id: str,
    progress_id: str,
    day_number: int,
    user_response: Optional[str] = None,
) -> dict:
    """Record completion of a journey day. Idempotent: if the same day is
    completed twice, the second call updates the existing row."""
    existing = conn.execute(
        "SELECT id FROM journey_day_completions WHERE progress_id = ? AND day_number = ?",
        (progress_id, day_number),
    ).fetchone()

    if existing:
        # Update — let the user revise what they wrote
        conn.execute(
            "UPDATE journey_day_completions SET user_response = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (user_response, existing["id"]),
        )
        completion_id = existing["id"]
    else:
        completion_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO journey_day_completions
                (id, progress_id, user_id, day_number, user_response)
            VALUES (?, ?, ?, ?, ?)
            """,
            (completion_id, progress_id, user_id, day_number, user_response),
        )

    return dict(
        conn.execute(
            "SELECT * FROM journey_day_completions WHERE id = ?", (completion_id,)
        ).fetchone()
    )


def list_day_completions(
    conn: sqlite3.Connection, progress_id: str
) -> list[dict]:
    """All completed days for a journey, ordered by day_number."""
    rows = conn.execute(
        """
        SELECT * FROM journey_day_completions
        WHERE progress_id = ?
        ORDER BY day_number ASC
        """,
        (progress_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_day_completion(
    conn: sqlite3.Connection, progress_id: str, day_number: int
) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM journey_day_completions WHERE progress_id = ? AND day_number = ?",
        (progress_id, day_number),
    ).fetchone()
    return dict(row) if row else None
