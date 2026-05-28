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
CREATE TABLE IF NOT EXISTS verse_media (
    verse_id        TEXT PRIMARY KEY,
    youtube_url     TEXT,
    podcast_url     TEXT,
    infographic_url TEXT,
    recitation_url  TEXT,
    analysis_url    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- ─────────────────────────────────────────────────────────────────────
-- Journeys: 7-day curated sequences (e.g. "Letting Go").
-- The journey CONTENT lives as static JSON files in app/data/journeys/.
-- Only the user's PROGRESS is in the DB.
-- One active journey per user, but multiple completed/paused entries
-- are allowed — pause-and-switch keeps the old row.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journey_progress (
    id TEXT PRIMARY KEY,                       -- UUID
    user_id TEXT NOT NULL,
    journey_slug TEXT NOT NULL,                -- e.g. "letting_go"
    state TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'paused' | 'completed'
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,                    -- set when state='completed'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journey_progress_user_id ON journey_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_progress_state ON journey_progress(state);
-- The active-journey constraint is enforced in code (only one row per user
-- where state='active'), not in the schema, because SQLite doesn't support
-- partial unique indexes cleanly across all versions.

-- Per-day completion: one row per (user, journey_progress, day_number).
-- `user_response` is what the user wrote that day. Becomes the "thread"
-- material referenced on subsequent threaded days.
CREATE TABLE IF NOT EXISTS journey_day_completions (
    id TEXT PRIMARY KEY,                       -- UUID
    progress_id TEXT NOT NULL,                 -- FK -> journey_progress.id
    user_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,               -- 1..7
    user_response TEXT,                        -- what the user wrote
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (progress_id) REFERENCES journey_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (progress_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_jdc_progress_id ON journey_day_completions(progress_id);
CREATE INDEX IF NOT EXISTS idx_jdc_user_id ON journey_day_completions(user_id);
"""


def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every server boot.

    Migration strategy:
      1. Run the table-creation portion of SCHEMA_SQL — `CREATE TABLE IF
         NOT EXISTS` is a no-op for existing tables.
      2. For each `users` column that might not exist on legacy DBs, add it.
         This must happen BEFORE any CREATE INDEX statement that references
         the column, since `CREATE INDEX IF NOT EXISTS idx_x ON t(col)`
         fails if `col` doesn't exist on `t`.
      3. Run SCHEMA_SQL in full — by now all columns exist, so all index
         statements succeed (existing indexes are no-ops).
    """
    conn = _get_connection()

    # Step 1: tables only (no indexes yet — columns may not exist on legacy DBs)
    conn.executescript(_SCHEMA_TABLES_ONLY)

    # Step 2: add any missing columns to `users`. Order matches the
    # historical sequence: google_id/email/display_name from the original
    # persistence session, then intention/daily_reminder_opt_in/onboarded_at
    # added during the onboarding session.
    #
    # Note: SQLite's ALTER TABLE cannot add UNIQUE columns. The original
    # CREATE TABLE marks google_id as UNIQUE; for legacy DBs that lacked it,
    # we add it without UNIQUE here, which is fine because we don't use
    # google_id until Google Sign-In is built (no current code path can
    # violate uniqueness against a never-populated column).
    _add_column_if_missing(conn, "users", "google_id", "TEXT")
    _add_column_if_missing(conn, "users", "email", "TEXT")
    _add_column_if_missing(conn, "users", "display_name", "TEXT")
    _add_column_if_missing(conn, "users", "intention", "TEXT")
    _add_column_if_missing(conn, "users", "daily_reminder_opt_in", "INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing(conn, "users", "onboarded_at", "TIMESTAMP")

    # verse_media gained recitation_url (own-voice recitation link) and
    # analysis_url (separate analysis video) after the original table shipped.
    _add_column_if_missing(conn, "verse_media", "recitation_url", "TEXT")
    _add_column_if_missing(conn, "verse_media", "analysis_url", "TEXT")

    # Step 3: full schema (creates all indexes — columns now exist)
    conn.executescript(SCHEMA_SQL)

    conn.commit()
    print(f"[db] Initialized SQLite at {DB_PATH}")


def _add_column_if_missing(
    conn: sqlite3.Connection, table: str, column: str, type_decl: str
) -> None:
    """Add `column` to `table` if it doesn't already exist.

    Idempotent. If the table itself doesn't exist yet, do nothing — Step 1
    of `init_db` already created it via `CREATE TABLE IF NOT EXISTS`, so by
    the time we get here the table is guaranteed to exist.
    """
    table_exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    if not table_exists:
        return
    cols = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    if column in cols:
        return
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_decl}")
    print(f"[db] Migration: added column {table}.{column}")


# Tables-only subset of SCHEMA_SQL — used in step 1 of the migration so we
# can guarantee tables exist before we try to add columns to them.
_SCHEMA_TABLES_ONLY = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    google_id TEXT UNIQUE,
    email TEXT,
    display_name TEXT,
    tone_preference TEXT NOT NULL DEFAULT 'simple_practical',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""
