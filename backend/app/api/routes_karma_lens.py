"""
Karma Lens routes.

`POST /api/karma-lens/analyse`  — full agent pipeline.
`GET  /api/verses`              — list all verses.
`GET  /api/verses/daily`        — today's verse (rotates deterministically).
"""

import json
import re
import sqlite3
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from anthropic import Anthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.db.deps import current_user, get_db_dep
from app.db.repositories import save_analysis

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────
# One-time loads at import: the verse library + the system prompt.
# Restart the server to pick up edits.
# ─────────────────────────────────────────────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent
VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"
PROMPT_PATH = _BASE / "prompts" / "karma_lens_system.md"

with open(VERSES_PATH, encoding="utf-8") as f:
    GITA_VERSES: dict = json.load(f)

SYSTEM_PROMPT: str = PROMPT_PATH.read_text(encoding="utf-8")

# Build the formatted verse catalogue once. The model uses this to pick a verse_id.
# Narrative verses (Chapter 1 battle descriptions, Chapter 11 cosmic vision, warrior
# lists, etc.) are excluded — they're preserved in the dataset for context but they
# don't contain actionable wisdom for Karma Lens to retrieve. They're flagged with
# `is_narrative: true` by the ingestion script.
_RETRIEVABLE_VERSES = {
    vid: v for vid, v in GITA_VERSES.items()
    if not v.get("is_narrative", False) and v.get("themes")
}

_VERSE_CATALOGUE = "\n".join(
    f"{vid} (BG {v['chapter']}.{v['verse']}) — \"{v['simple_meaning']}\" "
    f"| themes: {', '.join(v['themes'])} "
    f"| fits: {', '.join(v['emotional_tags'])}"
    for vid, v in _RETRIEVABLE_VERSES.items()
)

print(
    f"[karma_lens] Loaded {len(GITA_VERSES)} verses total; "
    f"{len(_RETRIEVABLE_VERSES)} retrievable, "
    f"{len(GITA_VERSES) - len(_RETRIEVABLE_VERSES)} narrative-only."
)

# Lazy-init the Anthropic client so the server can boot even without a key
# (the analyse endpoint will return a 500 with a helpful message).
_client: Optional[Anthropic] = (
    Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
)


# ─────────────────────────────────────────────────────────────────────────
# Request / response models
# ─────────────────────────────────────────────────────────────────────────
class KarmaLensRequest(BaseModel):
    text: str = Field(..., min_length=3, description="The user's situation in their own words.")
    emotion_hint: Optional[str] = Field(None, description="Optional emotion the user tagged.")


# ─────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────
def _strip_fences(text: str) -> str:
    """Remove ``` and ```json fences if the model wraps its output."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text.strip()


def _hydrate_verse(result: dict) -> dict:
    """Replace the bare verse_id with the full verse object so the
    frontend doesn't need a separate lookup table."""
    verse_id = result.get("verse_id")
    if verse_id and verse_id in GITA_VERSES:
        result["verse"] = GITA_VERSES[verse_id]
    return result


# ─────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────
@router.post("/karma-lens/analyse")
async def analyse(
    req: KarmaLensRequest,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Run the Karma Lens agent pipeline and return structured guidance.

    The response includes an `analysis_id` that the client should pass to
    `POST /api/reflections` if the user chooses to save it.

    Per spec §7, this should eventually be split into 6 chained agent
    calls. For the MVP we use one structured call — same JSON shape, faster.
    """
    if _client is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "ANTHROPIC_API_KEY is not configured. "
                "Copy backend/.env.example to backend/.env and paste your key."
            ),
        )

    # Voice adaptation per user preference. Every call carries the user's
    # tone, so the model can adjust register without us re-tuning the system
    # prompt. Three real shifts:
    #   simple_practical    — plain modern English, action-focused, no Sanskrit
    #                         beyond what's already in the response shape
    #   spiritual_reflective — slightly more contemplative, comfortable with
    #                         brief Sanskrit terms when they teach
    #   deep_philosophical  — lean into the Gita's structural concepts, use
    #                         dharmic vocabulary where it sharpens meaning
    tone = (user.get("tone_preference") or "simple_practical").lower()
    tone_guidance = {
        "simple_practical": (
            "VOICE: Plain modern English. Action-focused. Minimal Sanskrit "
            "beyond what the response shape already requires."
        ),
        "spiritual_reflective": (
            "VOICE: Contemplative and warm. Sanskrit terms welcome when they "
            "teach a concept English would need a paragraph for; always pair "
            "with the English meaning."
        ),
        "deep_philosophical": (
            "VOICE: Lean into the Gita's structural concepts. Dharmic "
            "vocabulary is welcome where it sharpens meaning. The reader is "
            "comfortable with depth; do not over-soften."
        ),
    }.get(tone, "VOICE: Plain modern English.")

    user_message = (
        f"{tone_guidance}\n\n"
        f"USER SITUATION:\n{req.text}\n"
        + (f"\nUSER-TAGGED EMOTION: {req.emotion_hint}\n" if req.emotion_hint else "")
        + f"\nVERSE LIBRARY (pick one verse_id):\n{_VERSE_CATALOGUE}\n\n"
        "Return the JSON object only."
    )

    try:
        response = _client.messages.create(
            model=ANTHROPIC_MODEL,
            # Was 2000 originally. With tone-preference voice guidance and
            # the richer Tamas/Rajas/Sattva path content (especially in
            # spiritual_reflective and deep_philosophical tones), responses
            # were occasionally getting truncated mid-JSON. 3500 gives a
            # comfortable margin without being wasteful.
            max_tokens=3500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {e}")

    # Detect truncation explicitly. When stop_reason == 'max_tokens', the
    # response was cut short and the JSON will be incomplete. Surface a
    # clean error rather than failing on json.loads.
    if getattr(response, "stop_reason", None) == "max_tokens":
        # Server log for diagnostics — never goes to the user.
        print(
            f"[karma_lens] truncated response for user {user['id'][:8]}…; "
            f"text length={len(' '.join(b.text for b in response.content if getattr(b, 'type', None) == 'text'))}"
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "The reflection got cut off mid-thought. "
                "Please try again — making the situation slightly more focused often helps."
            ),
        )

    # Pull the first text block from the model's response.
    text = next((b.text for b in response.content if getattr(b, "type", None) == "text"), "")
    cleaned = _strip_fences(text)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Server log includes the full raw text + JSONDecodeError details so
        # we can diagnose. The user-facing error stays clean and warm — no
        # JSON dump in the UI.
        print(
            f"[karma_lens] JSONDecodeError for user {user['id'][:8]}…: {e}\n"
            f"--- raw text start ---\n{text[:1000]}\n--- raw text end ---"
        )
        raise HTTPException(
            status_code=502,
            detail="The reflection couldn't be parsed. Please try again.",
        )

    hydrated = _hydrate_verse(result)

    # Persist the analysis so the client can reference it when saving a reflection.
    analysis_id = save_analysis(
        conn,
        user_id=user["id"],
        input_text=req.text,
        response_json=hydrated,
    )
    hydrated["analysis_id"] = analysis_id

    return hydrated


@router.get("/verses")
async def list_verses():
    """All verses in the prototype library."""
    return GITA_VERSES


@router.get("/verses/daily")
async def daily_verse():
    """A deterministic daily verse — same one for everyone today,
    different one tomorrow. Rotates by UTC day."""
    ids = list(GITA_VERSES.keys())
    day = int(time.time() // 86400)
    chosen_id = ids[day % len(ids)]
    return GITA_VERSES[chosen_id]
