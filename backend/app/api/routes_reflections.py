"""
Reflections API.

  POST   /api/reflections           save a reflection (after analyse)
  GET    /api/reflections           list my reflections (most recent first)
  DELETE /api/reflections/{id}      delete a reflection
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.deps import current_user, get_db_dep
from app.db.repositories import (
    delete_reflection,
    get_analysis,
    list_reflections,
    save_reflection,
)

router = APIRouter()


class SaveReflectionRequest(BaseModel):
    analysis_id: str = Field(..., description="ID returned by /karma-lens/analyse")
    user_note: str | None = Field(None, max_length=2000)


@router.post("/reflections")
def save(
    body: SaveReflectionRequest,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    # Verify the analysis exists and belongs to this user
    analysis = get_analysis(conn, body.analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    if analysis["user_id"] != user["id"]:
        raise HTTPException(403, "This analysis belongs to another user")

    reflection_id = save_reflection(
        conn, user["id"], body.analysis_id, body.user_note
    )
    return {"id": reflection_id, "saved": True}


@router.get("/reflections/count")
def count_mine(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    """Lightweight count endpoint. Cheap to call from home screen on every
    open. Avoids paying for the full list response just to show 'X saved'."""
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM reflections WHERE user_id = ?",
        (user["id"],),
    ).fetchone()
    return {"count": row["n"]}


@router.get("/reflections")
def list_mine(
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
    limit: int = 100,
):
    return {"reflections": list_reflections(conn, user["id"], limit=limit)}


@router.delete("/reflections/{reflection_id}")
def delete(
    reflection_id: str,
    user: dict = Depends(current_user),
    conn: sqlite3.Connection = Depends(get_db_dep),
):
    ok = delete_reflection(conn, user["id"], reflection_id)
    if not ok:
        raise HTTPException(404, "Reflection not found")
    return {"deleted": True}
