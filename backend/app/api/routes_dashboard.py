"""
Karma Dashboard API.

  GET /api/dashboard   returns the user's full dashboard payload

Architecture:
  1. Aggregate reflections (counts, patterns, emotions, verses) — fast,
     deterministic, free.
  2. Build cadence array — last 30 days, dot per day with type indicators.
  3. Generate AI 'what to practice' line via Claude — cached 24h per user
     (same cache pattern as the home insight strip).

Empty-state policy:
  - Below MIN_REFLECTIONS_FOR_PATTERNS, return a 'sparse' payload that
    omits the patterns/emotions/insight aggregations. The frontend reads
    `enough_data: false` and renders the warm 'come back when patterns
    emerge' state.
  - We always return cadence (dots) even for new users — it shows their
    practice from day one without making any claims about patterns.

Performance:
  - All queries are bounded (LIMIT, last-N-days) so it's fast even with
    thousands of reflections.
  - The AI call is the only expensive thing, and it's cached.
"""

from __future__ import annotations

import json
import sqlite3
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends
from anthropic import Anthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.db.deps import current_user, get_db_dep


router = APIRouter()

# Threshold below which the dashboard shows the empty/teaching state.
# Tuned to: enough reflections that patterns are real, but low enough that
# a committed new user gets there in their first week.
MIN_REFLECTIONS_FOR_PATTERNS = 5

# Cache: {user_id: (timestamp, payload_dict)}. 24h TTL.
# Resets on server restart, which is fine — fresh insight on the next day
# is desirable anyway.
_INSIGHT_CACHE: dict[str, tuple[float, dict]] = {}
INSIGHT_CACHE_TTL_SECONDS = 24 * 60 * 60

_client: Optional[Anthropic] = (
    Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
)

# Verse library for hydrating top-verse details
_BASE = Path(__file__).resolve().parent.parent
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"
with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES: dict = json.load(f)


# ─────────────────────────────────────────────────────────────────────────
# Aggregations — cheap SQL, no AI
# ─────────────────────────────────────────────────────────────────────────
def _aggregate_reflections(conn: sqlite3.Connection, user_id: str) -> dict:
    """Pull all the reflection-derived stats for the dashboard."""
    # Total saved reflections
    total = conn.execute(
        "SELECT COUNT(*) AS n FROM reflections WHERE user_id = ?",
        (user_id,),
    ).fetchone()["n"]

    if total == 0:
        return {
            "total_reflections": 0,
            "top_patterns": [],
            "top_emotions": [],
            "top_verses": [],
            "first_reflection_at": None,
        }

    # Pattern + emotion + verse aggregations (joined to karma_analyses)
    rows = conn.execute(
        """
        SELECT a.dominant_pattern, a.primary_emotion,
               a.selected_chapter, a.selected_verse, a.gita_theme,
               r.saved_at
        FROM reflections r
        JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE r.user_id = ?
        ORDER BY r.saved_at ASC
        """,
        (user_id,),
    ).fetchall()

    patterns = [r["dominant_pattern"] for r in rows if r["dominant_pattern"]]
    emotions = [r["primary_emotion"] for r in rows if r["primary_emotion"]]
    verse_keys = [
        f"BG_{r['selected_chapter']}_{r['selected_verse']}"
        for r in rows
        if r["selected_chapter"] and r["selected_verse"]
    ]

    top_patterns = [
        {"pattern": p, "count": n}
        for p, n in Counter(patterns).most_common(3)
    ]
    top_emotions = [
        {"emotion": e, "count": n}
        for e, n in Counter(emotions).most_common(3)
    ]

    # Top verses — hydrate with the actual verse object so the UI can show
    # them without another lookup
    top_verses = []
    for vid, n in Counter(verse_keys).most_common(5):
        v = _VERSES.get(vid)
        if not v:
            continue
        top_verses.append({
            "verse_id": vid,
            "chapter": v["chapter"],
            "verse": v["verse"],
            "translation": v.get("translation", ""),
            "count": n,
        })

    first_reflection_at = rows[0]["saved_at"] if rows else None

    return {
        "total_reflections": total,
        "top_patterns": top_patterns,
        "top_emotions": top_emotions,
        "top_verses": top_verses,
        "first_reflection_at": first_reflection_at,
    }


def _build_cadence(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    """Last 30 days, one entry per day. Returns a list ordered oldest→newest.

    Each entry: {date: 'YYYY-MM-DD', has_reflection, has_journey_day,
                 has_checkin}

    Used by the frontend to draw the 30-dot cadence grid.
    """
    today = datetime.now(timezone.utc).date()
    days = [today - timedelta(days=29 - i) for i in range(30)]

    # Three sets of dates the user did anything
    refl_dates = {
        r["d"] for r in conn.execute(
            """
            SELECT DISTINCT date(saved_at) AS d
            FROM reflections
            WHERE user_id = ? AND saved_at > datetime('now', '-30 days')
            """,
            (user_id,),
        ).fetchall()
    }

    journey_dates = {
        r["d"] for r in conn.execute(
            """
            SELECT DISTINCT date(completed_at) AS d
            FROM journey_day_completions
            WHERE user_id = ? AND completed_at > datetime('now', '-30 days')
            """,
            (user_id,),
        ).fetchall()
    }

    checkin_dates = {
        r["d"] for r in conn.execute(
            """
            SELECT DISTINCT date(created_at) AS d
            FROM checkins
            WHERE user_id = ? AND created_at > datetime('now', '-30 days')
            """,
            (user_id,),
        ).fetchall()
    }

    cadence = []
    for d in days:
        ds = d.isoformat()
        cadence.append({
            "date": ds,
            "has_reflection": ds in refl_dates,
            "has_journey_day": ds in journey_dates,
            "has_checkin": ds in checkin_dates,
        })
    return cadence


# ─────────────────────────────────────────────────────────────────────────
# AI insight — the "what to practice" line. Cached 24h per user.
# ─────────────────────────────────────────────────────────────────────────
INSIGHT_SYSTEM_PROMPT = """You are GitaFlow's dashboard voice — a quiet, warm presence reflecting back what the user has been working on across days and weeks.

Your job: given the user's recent patterns, write ONE LINE (15-30 words) that names where their practice could deepen this week. Not a teaching, not advice, not a quote — a noticing paired with a small invitation.

TONE: warm, observational, dignified. Like a thoughtful teacher who has been paying attention. Never preachy. Never flattering. Never alarming.

GOOD examples:
  - "Anger has come up four times this month, often around recognition. This week, try acting from your real values, not their absence."
  - "You've returned to BG 2.47 across reflections — practice letting one thing today proceed without your control."
  - "Most reflections this month have been about work. Notice if there's a corner of life you're avoiding by staying so busy."

BAD examples (do not write like this):
  - "Wow, you've been so consistent with your reflections!" (flattering)
  - "You may need to seek professional help." (alarming, clinical)
  - "Be the change you wish to see." (cliché, generic)

Return ONLY the one line. No preamble. No quotes. No emojis. Plain prose."""


def _generate_insight(stats: dict) -> Optional[str]:
    """Call Claude to write the dashboard's one-line noticing.
    Returns None on any failure — the dashboard renders without it."""
    if _client is None:
        return None

    parts = [f"Total saved reflections: {stats['total_reflections']}"]
    if stats["top_patterns"]:
        parts.append(
            "Top patterns: "
            + ", ".join(f"{p['pattern']} ({p['count']})" for p in stats["top_patterns"])
        )
    if stats["top_emotions"]:
        parts.append(
            "Top emotions: "
            + ", ".join(f"{e['emotion']} ({e['count']})" for e in stats["top_emotions"])
        )
    if stats["top_verses"]:
        parts.append(
            "Verses returning most: "
            + ", ".join(
                f"BG {v['chapter']}.{v['verse']} (×{v['count']})"
                for v in stats["top_verses"][:3]
            )
        )

    user_msg = "\n".join(parts) + "\n\nWrite the one-line noticing now."

    try:
        response = _client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=120,
            system=INSIGHT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
    except Exception:
        return None

    text = next(
        (b.text for b in response.content if getattr(b, "type", None) == "text"),
        "",
    )
    line = text.strip().strip('"').strip("'").strip()
    if not line or len(line) > 300:
        return None
    return line


# ─────────────────────────────────────────────────────────────────────────
# The endpoint
# ─────────────────────────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return the user's full dashboard payload.

    Always 200 OK. Shape varies by reflection count:

    Below threshold (warm empty state):
      {
        enough_data: false,
        total_reflections: 2,
        threshold: 5,
        cadence: [...],          # always returned
        message: "...",          # frontend uses or ignores
      }

    Above threshold (full dashboard):
      {
        enough_data: true,
        total_reflections: 12,
        first_reflection_at: "...",
        cadence: [...],
        top_patterns: [{pattern, count}, ...],
        top_emotions: [{emotion, count}, ...],
        top_verses:   [{verse_id, chapter, verse, translation, count}, ...],
        insight:      "<one-line noticing>" | null,
        insight_cached: bool,
      }
    """
    user_id = user["id"]

    stats = _aggregate_reflections(conn, user_id)
    cadence = _build_cadence(conn, user_id)
    total = stats["total_reflections"]

    if total < MIN_REFLECTIONS_FOR_PATTERNS:
        remaining = MIN_REFLECTIONS_FOR_PATTERNS - total
        return {
            "enough_data": False,
            "total_reflections": total,
            "threshold": MIN_REFLECTIONS_FOR_PATTERNS,
            "remaining": remaining,
            "cadence": cadence,
            "first_reflection_at": stats["first_reflection_at"],
        }

    # ── Full dashboard ────────────────────────────────────────────────
    # Cache check for the AI insight
    insight: Optional[str] = None
    insight_cached = False
    cached = _INSIGHT_CACHE.get(user_id)
    if cached:
        ts, payload = cached
        if time.time() - ts < INSIGHT_CACHE_TTL_SECONDS:
            insight = payload.get("insight")
            insight_cached = True

    if not insight_cached:
        insight = _generate_insight(stats)
        if insight:
            _INSIGHT_CACHE[user_id] = (time.time(), {"insight": insight})
        else:
            # Failed to generate — short cache so we retry sooner
            _INSIGHT_CACHE[user_id] = (
                time.time() - INSIGHT_CACHE_TTL_SECONDS + 600,
                {"insight": None},
            )

    return {
        "enough_data": True,
        "total_reflections": total,
        "first_reflection_at": stats["first_reflection_at"],
        "cadence": cadence,
        "top_patterns": stats["top_patterns"],
        "top_emotions": stats["top_emotions"],
        "top_verses": stats["top_verses"],
        "insight": insight,
        "insight_cached": insight_cached,
    }
