-- verse_media table addition
-- Add this to SCHEMA_SQL in database.py

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
