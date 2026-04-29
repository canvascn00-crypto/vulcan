"""
Self-Evolver API Routes — prefix=/evolver
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from vulcan.self_evolver.engine import SelfEvolverEngine
from vulcan.self_evolver.metrics import (
    EvolutionConfig,
    EvolutionEvent,
    MetricsStore,
    PromptScore,
    SkillScoreEntry,
)

logger = logging.getLogger("vulcan.self_evolver.routes")

router = APIRouter(prefix="/evolver", tags=["evolver"])

# ── Shared engine instance (in-memory) ────────────────────────────────────────

_store = MetricsStore()
_engine = SelfEvolverEngine(store=_store)


# ── Request/Response Models ───────────────────────────────────────────────────


class CheckResponse(BaseModel):
    suggestions: list[dict]
    status: dict


class EvolveResponse(BaseModel):
    event_id: str
    event_type: str
    description: str
    improvements: list[str]


class StatusResponse(BaseModel):
    total_prompts_tracked: int
    total_skills_scored: int
    total_events: int
    avg_prompt_score: float
    avg_skill_score: float
    last_evolution: Optional[str]
    config: EvolutionConfig


class HistoryResponse(BaseModel):
    events: list[dict]
    total: int


class ConfigUpdateRequest(BaseModel):
    check_interval_sec: Optional[int] = None
    auto_evolve: Optional[bool] = None
    score_threshold: Optional[float] = None
    max_history: Optional[int] = None


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/check", response_model=CheckResponse)
async def check_performance():
    """Analyze current performance and suggest improvements."""
    result = await _engine.check_performance()
    return CheckResponse(
        suggestions=result["suggestions"],
        status=result["status"],
    )


@router.post("/evolve", response_model=EvolveResponse)
async def trigger_evolution():
    """Trigger an evolution cycle."""
    event = await _engine.evolve()
    return EvolveResponse(
        event_id=event.event_id,
        event_type=event.event_type,
        description=event.description,
        improvements=event.improvements,
    )


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Get current evolution state and scores."""
    status = _store.get_status()
    return StatusResponse(**status.model_dump())


@router.get("/history", response_model=HistoryResponse)
async def get_history(limit: int = 100):
    """Get evolution event log."""
    events = _store.get_events(limit=limit)
    return HistoryResponse(
        events=[e.model_dump() for e in events],
        total=len(events),
    )


@router.post("/config")
async def update_config(body: ConfigUpdateRequest):
    """Update evolution parameters."""
    current = _store.config
    if body.check_interval_sec is not None:
        current.check_interval_sec = body.check_interval_sec
    if body.auto_evolve is not None:
        current.auto_evolve = body.auto_evolve
    if body.score_threshold is not None:
        current.score_threshold = body.score_threshold
    if body.max_history is not None:
        current.max_history = body.max_history

    await _engine.update_config(current)
    return {"ok": True, "config": current.model_dump()}
