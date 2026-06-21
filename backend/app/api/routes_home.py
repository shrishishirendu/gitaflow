"""
Home insight — the continuity strip on the home screen.

Hybrid approach:
  1. Cheap deterministic rules decide WHETHER to surface anything.
  2. If rules trigger AND we don't have a fresh cached line, we call Claude
     once to generate a personalized one-liner.
  3. The result is cached per-user for 24 hours so we don't pay every time
     the user opens the app.

Why hybrid: pure-AI on every home open costs ~$0.005 + 1-3s latency. For an
app users open 5x/day, that adds up fast. Hybrid gives us the magic moments
without the constant cost.

The endpoint always returns quickly. If a fresh AI call is needed, it's
done inline (one shot, capped at ~600ms in practice). If we can serve from
cache or rules say "nothing to show," we return in milliseconds.

Also exposes:
  - GET /home/question : today's reflection question
  - GET /home/verse    : contextual verse-of-the-moment (replaces fixed daily)
"""

from __future__ import annotations

import json
import sqlite3
import time
from collections import Counter
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends
from anthropic import Anthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.db.deps import current_user, get_db_dep

router = APIRouter()

# In-process cache: {user_id: (timestamp, payload)}.
# 24-hour TTL. Resets on server restart, which is fine — re-generating a
# fresh insight on a new day is desirable anyway.
_CACHE: dict[str, tuple[float, dict]] = {}
CACHE_TTL_SECONDS = 24 * 60 * 60

_client: Optional[Anthropic] = (
    Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
)

# Load static assets at import time so we don't pay disk I/O per request.
_BASE_DIR = Path(__file__).resolve().parent.parent
_QUESTIONS_PATH = _BASE_DIR / "data" / "daily_questions.json"
_VERSES_PATH = _BASE_DIR / "data" / "bhagavad_gita.json"

with open(_QUESTIONS_PATH, encoding="utf-8") as f:
    _QUESTIONS: list[str] = json.load(f)["questions"]

with open(_VERSES_PATH, encoding="utf-8") as f:
    _GITA_VERSES: dict = json.load(f)

# Verses suitable for daily/contextual surfacing (exclude narrative verses).
_RETRIEVABLE_VERSES = {
    vid: v for vid, v in _GITA_VERSES.items()
    if not v.get("is_narrative", False) and v.get("themes")
}


# ─────────────────────────────────────────────────────────────────────────
# Step 1 — cheap rules: gather signals, decide if there's anything worth saying
# ─────────────────────────────────────────────────────────────────────────
def _gather_signals(conn: sqlite3.Connection, user_id: str) -> dict:
    """Pull last-30-days reflection + checkin signals from the DB."""
    rows = conn.execute(
        """
        SELECT a.primary_emotion, a.dominant_pattern, a.gita_theme,
               a.created_at, r.user_note
        FROM reflections r
        JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE r.user_id = ?
          AND r.saved_at > datetime('now', '-30 days')
        ORDER BY r.saved_at DESC
        LIMIT 20
        """,
        (user_id,),
    ).fetchall()

    reflections = [dict(r) for r in rows]

    checkins = conn.execute(
        """
        SELECT emotion, created_at FROM checkins
        WHERE user_id = ?
          AND created_at > datetime('now', '-7 days')
        ORDER BY created_at DESC
        """,
        (user_id,),
    ).fetchall()

    # Pattern recurrence: same dominant_pattern 3+ times in 30 days?
    patterns = [r["dominant_pattern"] for r in reflections if r["dominant_pattern"]]
    pattern_counts = Counter(patterns)
    recurring = [(p, n) for p, n in pattern_counts.items() if n >= 3]

    # Recent emotion?
    emotions = [r["primary_emotion"] for r in reflections if r["primary_emotion"]]
    emotion_counts = Counter(emotions)

    # Most recent reflection — for "you reflected N days ago"
    most_recent = reflections[0] if reflections else None

    return {
        "reflection_count_30d": len(reflections),
        "checkin_count_7d": len(checkins),
        "recurring_patterns": recurring,                     # [(pattern, count)]
        "top_emotions": emotion_counts.most_common(3),        # [(emotion, count)]
        "most_recent_reflection": dict(most_recent) if most_recent else None,
        "recent_reflections_summary": reflections[:5],        # for the AI prompt
    }


def _should_surface(signals: dict) -> tuple[bool, str]:
    """Return (yes_or_no, kind). 'kind' is the type of insight to generate.

    Rules — keep simple, edit freely as the product matures:
      - 'recurring_pattern' if any pattern showed up >= 3 times in 30 days
      - 'recent_reflection' if the most recent reflection is < 3 days old
        AND we have at least 2 reflections total
      - 'consistent_practice' if reflection_count_30d >= 5 and no specific signal
      - else nothing
    """
    if signals["recurring_patterns"]:
        return True, "recurring_pattern"

    most_recent = signals["most_recent_reflection"]
    if most_recent and signals["reflection_count_30d"] >= 2:
        from datetime import datetime, timedelta, timezone
        try:
            created = datetime.fromisoformat(
                most_recent["created_at"].replace(" ", "T")
            ).replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - created < timedelta(days=3):
                return True, "recent_reflection"
        except Exception:
            pass

    if signals["reflection_count_30d"] >= 5:
        return True, "consistent_practice"

    return False, ""


# ─────────────────────────────────────────────────────────────────────────
# Step 2 — AI: generate a single warm line, only when rules said yes
# ─────────────────────────────────────────────────────────────────────────
INSIGHT_SYSTEM_PROMPT = """You are GitaMoment's home-screen voice — a quiet, warm presence that notices the user's pattern of reflection across days.

Your job: given a user's recent reflection signals, write ONE LINE (10-25 words) that the user will see on their home screen. Not a quote, not advice, not a teaching. A noticing.

TONE: warm, observational, dignified. Like a thoughtful friend who has been paying attention. Never preachy. Never flattering. Never alarming.

GOOD examples:
  - "Anger has visited four times this month, often around recognition."
  - "You returned three days in a row. Something is being worked through."
  - "Two reflections this week — both circle attachment to outcome."

BAD examples (do not write like this):
  - "Wow, you've been so consistent! Keep it up!" (flattering)
  - "Your soul is calling out for peace." (preachy)
  - "You may be experiencing depression." (clinical, alarming)

Return ONLY the one line. No preamble. No quotes around it. No punctuation flourishes."""


def _generate_line(signals: dict, kind: str) -> Optional[str]:
    if _client is None:
        return None

    # Build a tight summary of signals — don't dump raw DB rows into the prompt.
    parts = [f"Kind of insight: {kind}", f"Reflections in last 30 days: {signals['reflection_count_30d']}"]

    if signals["recurring_patterns"]:
        for p, n in signals["recurring_patterns"]:
            parts.append(f"Pattern '{p}' appeared {n} times")

    if signals["top_emotions"]:
        parts.append(
            "Top emotions: " + ", ".join(f"{e} ({n})" for e, n in signals["top_emotions"])
        )

    if signals["most_recent_reflection"]:
        mr = signals["most_recent_reflection"]
        parts.append(
            f"Most recent reflection: emotion={mr.get('primary_emotion')}, "
            f"pattern={mr.get('dominant_pattern')}, theme={mr.get('gita_theme')}"
        )

    if signals["checkin_count_7d"]:
        parts.append(f"Quick check-ins in last 7 days: {signals['checkin_count_7d']}")

    user_msg = "\n".join(parts) + "\n\nWrite the one-line noticing now."

    try:
        response = _client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=80,
            system=INSIGHT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
    except Exception:
        return None

    text = next((b.text for b in response.content if getattr(b, "type", None) == "text"), "")
    line = text.strip().strip('"').strip("'").strip()
    if not line or len(line) > 200:
        return None
    return line


# ─────────────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────────────
@router.get("/home/insight")
def home_insight(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return the home-screen continuity strip payload.

    Always 200 OK. Possible shapes:
      {"line": null, "kind": null}                      # nothing to surface
      {"line": "<warm one-liner>", "kind": "recurring_pattern", "cached": true}
      {"line": "<warm one-liner>", "kind": "recent_reflection", "cached": false}
    """
    user_id = user["id"]

    # Cache check (skip if expired)
    cached = _CACHE.get(user_id)
    if cached:
        ts, payload = cached
        if time.time() - ts < CACHE_TTL_SECONDS:
            return {**payload, "cached": True}

    # Rules
    signals = _gather_signals(conn, user_id)
    surface, kind = _should_surface(signals)
    if not surface:
        empty = {"line": None, "kind": None}
        _CACHE[user_id] = (time.time(), empty)
        return {**empty, "cached": False}

    # AI
    line = _generate_line(signals, kind)
    if not line:
        empty = {"line": None, "kind": None}
        # Don't cache failures for the full 24h — try again sooner.
        _CACHE[user_id] = (time.time() - CACHE_TTL_SECONDS + 600, empty)  # retry in 10 min
        return {**empty, "cached": False}

    payload = {"line": line, "kind": kind}
    _CACHE[user_id] = (time.time(), payload)
    return {**payload, "cached": False}


# ─────────────────────────────────────────────────────────────────────────
# Today's question — rotates daily, deterministic
# ─────────────────────────────────────────────────────────────────────────
@router.get("/home/question")
def todays_question():
    """Return one Gita-shaped reflection question. Rotates by UTC day so
    every user globally sees the same question today."""
    day = int(time.time() // 86400)
    return {"question": _QUESTIONS[day % len(_QUESTIONS)]}


# ─────────────────────────────────────────────────────────────────────────
# Contextual verse — picks a verse based on user signals, falls back to
# deterministic daily rotation when there's no signal.
# ─────────────────────────────────────────────────────────────────────────

# Map arrival check-in chip → verse selection signal.
# Categories are intentionally broad: any verse with these emotional_tags
# becomes a candidate.
_CHIP_TO_TAGS = {
    "lifting": {"peace", "gratitude"},                 # joy, calm, hope
    "steady":  {"equanimity"},                         # neutral, settled (theme-only)
    "weighing": {
        "anxiety", "sadness", "grief", "fear",
        "overwhelm", "helplessness", "loneliness",
    },
}


def _pick_contextual_verse(conn: sqlite3.Connection, user_id: str) -> tuple[dict, str]:
    """Return (verse, reason) — picks a verse based on the user's recent
    signals. Falls back to the deterministic daily rotation if no signal.

    Reason is one of:
      - 'chip:<value>' if today's check-in shaped the pick
      - 'pattern:<name>' if a recurring reflection pattern shaped it
      - 'daily' if it's the rotating fallback
    """
    # 1. Did the user check in today? Use that as the strongest signal.
    today_chip = conn.execute(
        """
        SELECT emotion FROM checkins
        WHERE user_id = ? AND date(created_at) = date('now')
        ORDER BY created_at DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()

    if today_chip and today_chip["emotion"] in _CHIP_TO_TAGS:
        chip = today_chip["emotion"]
        wanted = _CHIP_TO_TAGS[chip]

        if chip == "steady":
            # 'Steady' uses theme matching, not emotional tags
            candidates = [
                v for v in _RETRIEVABLE_VERSES.values()
                if "equanimity" in (v.get("themes") or [])
            ]
        else:
            candidates = [
                v for v in _RETRIEVABLE_VERSES.values()
                if any(tag in (v.get("emotional_tags") or []) for tag in wanted)
            ]

        if candidates:
            # Stable but rotating: same pick today, different tomorrow.
            day = int(time.time() // 86400)
            picked = candidates[day % len(candidates)]
            return picked, f"chip:{chip}"

    # 2. No check-in today — does the user have a recurring pattern?
    rows = conn.execute(
        """
        SELECT a.dominant_pattern
        FROM reflections r JOIN karma_analyses a ON a.id = r.analysis_id
        WHERE r.user_id = ? AND r.saved_at > datetime('now', '-30 days')
        """,
        (user_id,),
    ).fetchall()
    patterns = [r["dominant_pattern"] for r in rows if r["dominant_pattern"]]
    if patterns:
        most_common, count = Counter(patterns).most_common(1)[0]
        if count >= 3:
            # Find a verse that addresses this pattern's likely emotional tags
            pattern_to_tags = {
                "attachment_to_outcome": {"attachment", "expectation", "frustration"},
                "ego_reaction": {"pride", "anger", "hurt"},
                "fear_based_avoidance": {"fear", "avoidance", "anxiety"},
                "comparison_and_jealousy": {"jealousy", "comparison_and_jealousy"},
                "rajasic_restlessness": {"restlessness", "overwhelm"},
                "tamasic_inertia": {"avoidance", "helplessness"},
            }
            wanted = pattern_to_tags.get(most_common, set())
            candidates = [
                v for v in _RETRIEVABLE_VERSES.values()
                if any(tag in (v.get("emotional_tags") or []) for tag in wanted)
            ]
            if candidates:
                day = int(time.time() // 86400)
                picked = candidates[day % len(candidates)]
                return picked, f"pattern:{most_common}"

    # 3. Fallback: deterministic daily rotation across all retrievable verses.
    ids = list(_RETRIEVABLE_VERSES.keys())
    day = int(time.time() // 86400)
    return _RETRIEVABLE_VERSES[ids[day % len(ids)]], "daily"


@router.get("/home/verse")
def home_verse(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return today's verse for the home screen, contextually chosen.

    Shape: { ...full verse fields..., "_reason": "chip:weighing" | "pattern:anger" | "daily" }
    """
    verse, reason = _pick_contextual_verse(conn, user["id"])
    return {**verse, "_reason": reason}
