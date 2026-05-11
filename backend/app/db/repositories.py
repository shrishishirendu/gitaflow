"""
Repositories for karma_analyses, reflections, and checkins.

Each "repo" is just a small set of functions that own SQL for one table.
Keeps SQL out of the route handlers — when we eventually swap SQLite for
Postgres, these are the only files that change.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────
# karma_analyses — every Karma Lens call gets a row here
# ─────────────────────────────────────────────────────────────────────────
def save_analysis(
    conn: sqlite3.Connection,
    user_id: str,
    input_text: str,
    response_json: dict,
) -> str:
    """Persist a Karma Lens response. Returns the new analysis_id (UUID).

    Pulls a few key fields out into columns so the dashboard can query them
    without parsing JSON. The full response stays in `response_json` for
    later display.
    """
    analysis_id = str(uuid.uuid4())

    # Defensive extraction — crisis responses won't have these
    emotion = response_json.get("emotion") or {}
    dharma = response_json.get("dharma") or {}
    verse = response_json.get("verse") or {}

    conn.execute(
        """
        INSERT INTO karma_analyses (
            id, user_id, input_text,
            primary_emotion, intensity,
            dominant_pattern, gita_theme,
            selected_chapter, selected_verse,
            response_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            analysis_id,
            user_id,
            input_text,
            emotion.get("primary"),
            emotion.get("intensity"),
            dharma.get("pattern"),
            dharma.get("theme"),
            verse.get("chapter"),
            verse.get("verse"),
            json.dumps(response_json, ensure_ascii=False),
        ),
    )
    return analysis_id


def get_analysis(conn: sqlite3.Connection, analysis_id: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM karma_analyses WHERE id = ?", (analysis_id,)
    ).fetchone()
    if not row:
        return None
    out = dict(row)
    out["response"] = json.loads(out.pop("response_json"))
    return out


# ─────────────────────────────────────────────────────────────────────────
# reflections — saved Karma Lens responses, with optional user note
# ─────────────────────────────────────────────────────────────────────────
def save_reflection(
    conn: sqlite3.Connection,
    user_id: str,
    analysis_id: str,
    user_note: Optional[str] = None,
) -> str:
    """Save a reflection (= user marked an analysis as worth keeping).

    Idempotent: if this user has already saved a reflection for this
    analysis, returns the existing reflection's ID instead of creating
    a duplicate. Protects against double-clicks, retried API calls, and
    race conditions on the client side.

    Returns the reflection ID (existing or newly created).
    """
    # Check if a reflection already exists for this (user, analysis) pair.
    existing = conn.execute(
        "SELECT id FROM reflections WHERE user_id = ? AND analysis_id = ? LIMIT 1",
        (user_id, analysis_id),
    ).fetchone()
    if existing:
        return existing["id"]

    reflection_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO reflections (id, user_id, analysis_id, user_note)
        VALUES (?, ?, ?, ?)
        """,
        (reflection_id, user_id, analysis_id, user_note),
    )
    return reflection_id


def list_reflections(
    conn: sqlite3.Connection, user_id: str, limit: int = 100
) -> list[dict]:
    """List reflections for a user, most recent first.

    JOINs against karma_analyses so callers get the full analysis payload
    in one round trip.
    """
    rows = conn.execute(
        """
        SELECT
            r.id              AS reflection_id,
            r.analysis_id     AS analysis_id,
            r.user_note       AS user_note,
            r.saved_at        AS saved_at,
            a.input_text      AS input_text,
            a.response_json   AS response_json
        FROM reflections r
        JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE r.user_id = ?
        ORDER BY r.saved_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()

    out = []
    for row in rows:
        d = dict(row)
        d["response"] = json.loads(d.pop("response_json"))
        out.append(d)
    return out


def delete_reflection(
    conn: sqlite3.Connection, user_id: str, reflection_id: str
) -> bool:
    """Delete a reflection. Returns True if it existed and belonged to user."""
    cursor = conn.execute(
        "DELETE FROM reflections WHERE id = ? AND user_id = ?",
        (reflection_id, user_id),
    )
    return cursor.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────
# checkins — lightweight emotional pings from home screen (Session 2)
# ─────────────────────────────────────────────────────────────────────────
def save_checkin(
    conn: sqlite3.Connection,
    user_id: str,
    emotion: str,
    note: Optional[str] = None,
) -> str:
    checkin_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO checkins (id, user_id, emotion, note)
        VALUES (?, ?, ?, ?)
        """,
        (checkin_id, user_id, emotion, note),
    )
    return checkin_id


def list_recent_checkins(
    conn: sqlite3.Connection, user_id: str, limit: int = 30
) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM checkins
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [dict(r) for r in rows]
