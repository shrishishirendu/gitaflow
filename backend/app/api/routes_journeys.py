"""
Journeys API.

Endpoints:
  GET   /api/journeys                              list available journeys + my progress
  GET   /api/journeys/{slug}                       full journey content (all 7 days, no progress)
  GET   /api/journeys/active                       my active journey + progress (or null)
  POST  /api/journeys/{slug}/start                 start (or resume) a journey
  POST  /api/journeys/active/pause                 pause the active journey
  POST  /api/journeys/{progress_id}/resume         resume a paused journey
  GET   /api/journeys/progress/{progress_id}/day/{n}   get one day's content + my response if complete
  POST  /api/journeys/progress/{progress_id}/day/{n}   complete a day with optional response

Pacing: soft 24h gate with override. The endpoint that fetches a day always
returns the day's content; whether it's "unlocked" is computed in the response
as `unlocked_at`. The frontend decides whether to show the [Continue anyway]
override.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.deps import current_user, get_db_dep
from app.db.journey_repo import (
    complete_day,
    get_active_journey,
    get_day_completion,
    get_progress_by_id,
    list_day_completions,
    list_journey_progress,
    mark_completed_if_finished,
    pause_journey,
    resume_journey,
    start_journey,
)


router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────
# Static content loading — journeys live as JSON files on disk.
# Loaded once at import time.
# ─────────────────────────────────────────────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent
_JOURNEYS_DIR = _BASE / "data" / "journeys"
_VERSES_PATH = _BASE / "data" / "bhagavad_gita.json"

with open(_VERSES_PATH, encoding="utf-8") as f:
    _VERSES = json.load(f)


def _load_index() -> list[dict]:
    with open(_JOURNEYS_DIR / "index.json", encoding="utf-8") as f:
        return json.load(f)["journeys"]


def _load_journey(slug: str) -> Optional[dict]:
    path = _JOURNEYS_DIR / f"{slug}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _hydrate_day_verse(day: dict) -> dict:
    """Replace verse_id with the full verse object."""
    out = dict(day)
    vid = out.pop("verse_id", None)
    if vid and vid in _VERSES:
        out["verse"] = _VERSES[vid]
    else:
        out["verse"] = None
    return out


# ─────────────────────────────────────────────────────────────────────────
# Pacing — soft 24h gate
# ─────────────────────────────────────────────────────────────────────────
def _compute_unlocked_at(
    completions: list[dict], day_number: int
) -> Optional[str]:
    """Return ISO timestamp when this day "naturally" unlocks, given the
    completion history. Day 1 is always unlocked. Day N unlocks 24h after
    Day N-1 was completed."""
    if day_number <= 1:
        return None  # always unlocked
    prev = next((c for c in completions if c["day_number"] == day_number - 1), None)
    if not prev:
        return None  # previous day not done — frontend treats this as locked
    try:
        completed_at = datetime.fromisoformat(
            prev["completed_at"].replace(" ", "T")
        ).replace(tzinfo=timezone.utc)
    except Exception:
        return None
    return (completed_at + timedelta(hours=24)).isoformat()


def _is_naturally_unlocked(unlocked_at: Optional[str]) -> bool:
    if unlocked_at is None:
        return True  # day 1 or no gate computed
    try:
        when = datetime.fromisoformat(unlocked_at.replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= when
    except Exception:
        return True


# ─────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────
@router.get("/journeys")
def list_journeys(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """List available journeys + my progress on each."""
    user_progress = list_journey_progress(conn, user["id"])
    progress_by_slug: dict[str, dict] = {}
    for p in user_progress:
        # Most recent (any state) per slug wins
        if p["journey_slug"] not in progress_by_slug:
            progress_by_slug[p["journey_slug"]] = p

    out = []
    for entry in _load_index():
        if not entry.get("available", True):
            continue
        journey = _load_journey(entry["slug"])
        if not journey:
            continue
        progress = progress_by_slug.get(entry["slug"])

        # Lightweight progress info for the index
        progress_summary = None
        if progress:
            done_days = list_day_completions(conn, progress["id"])
            progress_summary = {
                "id": progress["id"],
                "state": progress["state"],
                "started_at": progress["started_at"],
                "days_completed": len(done_days),
                "current_day": (max(d["day_number"] for d in done_days) + 1
                                if done_days else 1),
            }
        out.append({
            "slug": journey["slug"],
            "title": journey["title"],
            "subtitle": journey["subtitle"],
            "description": journey["description"],
            "category": journey.get("category"),
            "duration_days": journey["duration_days"],
            "estimated_minutes_per_day": journey.get("estimated_minutes_per_day"),
            "progress": progress_summary,
        })
    return {"journeys": out}


@router.get("/journeys/active")
def get_active(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Return the user's active journey with summary progress, or null."""
    progress = get_active_journey(conn, user["id"])
    if not progress:
        return {"active": None}

    journey = _load_journey(progress["journey_slug"])
    if not journey:
        return {"active": None}

    completions = list_day_completions(conn, progress["id"])
    days_completed = len(completions)
    current_day = (max(c["day_number"] for c in completions) + 1) if completions else 1
    if current_day > journey["duration_days"]:
        current_day = journey["duration_days"]  # cap at last day

    # Compute unlock time for the current day
    unlocked_at = _compute_unlocked_at(completions, current_day)
    is_unlocked = _is_naturally_unlocked(unlocked_at)

    return {
        "active": {
            "progress_id": progress["id"],
            "journey_slug": journey["slug"],
            "journey_title": journey["title"],
            "journey_subtitle": journey["subtitle"],
            "duration_days": journey["duration_days"],
            "days_completed": days_completed,
            "current_day": current_day,
            "current_day_unlocked_at": unlocked_at,
            "current_day_is_unlocked": is_unlocked,
            "started_at": progress["started_at"],
        }
    }


@router.get("/journeys/{slug}")
def get_journey(slug: str):
    """Full journey definition — all 7 days. Verses hydrated."""
    journey = _load_journey(slug)
    if not journey:
        raise HTTPException(404, "Journey not found")
    out = {**journey, "days": [_hydrate_day_verse(d) for d in journey["days"]]}
    return out


class StartJourneyRequest(BaseModel):
    pass  # nothing in body — slug in path


@router.post("/journeys/{slug}/start")
def start(
    slug: str,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    journey = _load_journey(slug)
    if not journey:
        raise HTTPException(404, "Journey not found")

    progress = start_journey(conn, user["id"], slug)
    return {
        "progress_id": progress["id"],
        "state": progress["state"],
        "journey_slug": slug,
        "duration_days": journey["duration_days"],
    }


@router.post("/journeys/active/pause")
def pause_active(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    active = get_active_journey(conn, user["id"])
    if not active:
        return {"paused": False, "reason": "no_active_journey"}
    pause_journey(conn, user["id"], active["id"])
    return {"paused": True, "progress_id": active["id"]}


@router.post("/journeys/{progress_id}/resume")
def resume(
    progress_id: str,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    ok = resume_journey(conn, user["id"], progress_id)
    if not ok:
        raise HTTPException(400, "Could not resume — journey not found or not paused")
    return {"resumed": True, "progress_id": progress_id}


@router.get("/journeys/progress/{progress_id}/day/{day_number}")
def get_day(
    progress_id: str,
    day_number: int,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Get one day of an in-progress journey. Includes user's previous responses
    for threading days, and pacing info."""
    progress = get_progress_by_id(conn, user["id"], progress_id)
    if not progress:
        raise HTTPException(404, "Journey progress not found")

    journey = _load_journey(progress["journey_slug"])
    if not journey:
        raise HTTPException(404, "Journey content not found")

    if day_number < 1 or day_number > journey["duration_days"]:
        raise HTTPException(400, "Invalid day number")

    day_def = next((d for d in journey["days"] if d["day_number"] == day_number), None)
    if not day_def:
        raise HTTPException(404, "Day not found")

    completions = list_day_completions(conn, progress_id)

    # Threading: if this day references back, include the previous response(s)
    thread_data = None
    if day_def.get("thread_back") and completions:
        # Reference yesterday's response, or earlier if more than one available
        prev_responses = [
            {"day_number": c["day_number"], "response": c["user_response"]}
            for c in completions
            if c["day_number"] < day_number and c["user_response"]
        ]
        if prev_responses:
            thread_data = prev_responses

    # User's own response for this day, if already complete
    my_completion = get_day_completion(conn, progress_id, day_number)

    # Pacing
    unlocked_at = _compute_unlocked_at(completions, day_number)
    is_unlocked = _is_naturally_unlocked(unlocked_at)

    return {
        "day": _hydrate_day_verse(day_def),
        "progress_id": progress_id,
        "journey": {
            "slug": journey["slug"],
            "title": journey["title"],
            "duration_days": journey["duration_days"],
            "days": [
                {
                    "day_number": d["day_number"],
                    "title": d["title"],
                    "completed": any(c["day_number"] == d["day_number"] for c in completions),
                    "is_current": d["day_number"] == day_number,
                }
                for d in journey["days"]
            ],
        },
        "thread": thread_data,
        "my_response": my_completion["user_response"] if my_completion else None,
        "completed": my_completion is not None,
        "unlocked_at": unlocked_at,
        "is_unlocked": is_unlocked,
    }


class CompleteDayRequest(BaseModel):
    user_response: Optional[str] = Field(None, max_length=4000)


@router.post("/journeys/progress/{progress_id}/day/{day_number}")
def complete_day_endpoint(
    progress_id: str,
    day_number: int,
    body: CompleteDayRequest,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    progress = get_progress_by_id(conn, user["id"], progress_id)
    if not progress:
        raise HTTPException(404, "Journey progress not found")
    if progress["state"] not in ("active", "paused"):
        # Allow editing past responses on completed journeys, but don't change state
        pass

    journey = _load_journey(progress["journey_slug"])
    if not journey or day_number < 1 or day_number > journey["duration_days"]:
        raise HTTPException(400, "Invalid day")

    completion = complete_day(
        conn, user["id"], progress_id, day_number, body.user_response
    )

    # Maybe transition the journey to completed
    just_completed = mark_completed_if_finished(
        conn, progress_id, journey["duration_days"]
    )

    return {
        "completed": True,
        "day_number": day_number,
        "completion_id": completion["id"],
        "journey_just_finished": just_completed,
    }
