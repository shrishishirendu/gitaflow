"""
Welcome screen API — public, unauthenticated.

  GET /api/welcome/verse   today's deterministic welcome verse (same for
                           everyone in the world today; new tomorrow)

The verse is picked from a hand-curated pool of ~30 verses chosen for
"welcome-screen suitability" — see app/data/welcome_verses.json. Each is
self-contained, modern-resonant, and universal. The curation rubric is
embedded in that file's `_rubric` field for future maintainers.

Picking by UTC day rather than per-launch:
  - Stable across page reloads (the user's relationship with today's verse
    persists through their day)
  - Creates a tiny shared moment globally (everyone who opens GitaMoment
    today sees the same opener)
  - Free, deterministic, no Claude calls
"""

from __future__ import annotations

import json
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

_BASE = Path(__file__).resolve().parent.parent
_WELCOME_PATH = _BASE / "data" / "welcome_verses.json"
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"

# Load at import. The library and curated list don't change at runtime.
with open(_WELCOME_PATH, encoding="utf-8") as f:
    _WELCOME_IDS: list[str] = json.load(f)["verse_ids"]

with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES: dict = json.load(f)

# Filter to only those welcome IDs that actually exist in the library.
# If a curated ID was added before its verse was tagged, we skip it gracefully
# rather than 500-ing for users.
_AVAILABLE_WELCOME: list[str] = [vid for vid in _WELCOME_IDS if vid in _VERSES]

if not _AVAILABLE_WELCOME:
    # Fall back to ANY non-narrative verse so the welcome screen still works
    _AVAILABLE_WELCOME = [
        vid for vid, v in _VERSES.items()
        if not v.get("is_narrative", False) and v.get("themes")
    ][:32]

print(
    f"[welcome] {len(_AVAILABLE_WELCOME)} welcome verses available "
    f"(of {len(_WELCOME_IDS)} curated)"
)


@router.get("/welcome/verse")
def todays_welcome_verse():
    """Return today's welcome verse. Public endpoint — no auth required."""
    if not _AVAILABLE_WELCOME:
        raise HTTPException(500, "No welcome verses available in library")

    day = int(time.time() // 86400)
    vid = _AVAILABLE_WELCOME[day % len(_AVAILABLE_WELCOME)]
    verse = _VERSES.get(vid)
    if not verse:
        raise HTTPException(500, "Welcome verse not found in library")

    return {
        "verse_id": vid,
        "chapter": verse.get("chapter"),
        "verse": verse.get("verse"),
        "sanskrit": verse.get("sanskrit"),
        "transliteration": verse.get("transliteration"),
        "translation": verse.get("translation"),
        "simple_meaning": verse.get("simple_meaning"),
    }
