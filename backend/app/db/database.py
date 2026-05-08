"""
SQLite database for GitaFlow.

Design notes:
  - SQLite for MVP per spec §5.4. Production should swap for Postgres.
  - The schema mirrors spec §10 with light additions for forward compatibility:
      * `users.device_id` for anonymous identification today
      * `users.google_id`, `users.email`, `users.display_name` for when we add
         Google Sign-In later — nullable now, populated then
  - Connections are per-request (FastAPI dependency) so we don't share
    connections between threads.
  - Migrations are idempotent — `init_db()` only creates what doesn't exist.
"""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

# Database file lives next to the app code. Override via env var if you want
# multiple databases (e.g. one for tests).
DB_PATH = Path(__file__).resolve().parent.parent.parent / "gitaflow.db"

# SQLite is happiest when one connection is used by one thread. We keep a
# per-thread connection cache to avoid repeated open/close churn.
_thread_local = threading.local()


def _get_connection() -> sqlite3.Connection:
    conn = getattr(_thread_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(
            DB_PATH,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            check_same_thread=False,  # we use per-thread cache, not shared
        )
        conn.row_factory = sqlite3.Row  # access columns by name
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")  # better concurrency
        _thread_local.conn = conn
    return conn


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency. Yields a connection, commits on success, rolls back on error.

    Usage:
        @router.post(...)
        def my_route(db: sqlite3.Connection = Depends(get_db_dep)):
            ...
    """
    conn = _get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


# ─────────────────────────────────────────────────────────────────────────
# Schema — per spec §10 plus auth-ready columns on `users`.
# ─────────────────────────────────────────────────────────────────────────
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                 -- UUID
    device_id TEXT UNIQUE NOT NULL,      -- anonymous device fingerprint
    google_id TEXT UNIQUE,               -- populated when Google Sign-In added
    email TEXT,                          -- populated when Google Sign-In added
    display_name TEXT,                   -- populated when Google Sign-In added
    tone_preference TEXT NOT NULL DEFAULT 'simple_practical',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE TABLE IF NOT EXISTS karma_analyses (
    id TEXT PRIMARY KEY,                  -- UUID
    user_id TEXT NOT NULL,
    input_text TEXT NOT NULL,
    primary_emotion TEXT,
    intensity TEXT,
    dominant_pattern TEXT,
    gita_theme TEXT,
    selected_chapter INTEGER,
    selected_verse INTEGER,
    response_json TEXT NOT NULL,          -- the full agent JSON output
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_karma_analyses_user_id ON karma_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_analyses_created_at ON karma_analyses(created_at);

CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,                  -- UUID
    user_id TEXT NOT NULL,
    analysis_id TEXT NOT NULL,
    user_note TEXT,
    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES karma_analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_saved_at ON reflections(saved_at);

CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,                  -- UUID
    user_id TEXT NOT NULL,
    emotion TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
"""


def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every server boot."""
    conn = _get_connection()
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    print(f"[db] Initialized SQLite at {DB_PATH}")
