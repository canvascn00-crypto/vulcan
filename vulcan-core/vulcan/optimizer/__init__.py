"""
Vulcan Optimizer — Model parameter tuning, cache strategy, cost optimization, performance profiles.

API routes (prefix=/optimizer):
- GET  /optimizer/status       — current optimization state
- POST /optimizer/tune         — trigger parameter tuning
- GET  /optimizer/cache        — cache statistics
- POST /optimizer/cache/invalidate — invalidate cache
- GET  /optimizer/costs        — cost breakdown
- POST /optimizer/costs/budget — set budget limits
"""

from __future__ import annotations

import threading
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/optimizer", tags=["optimizer"])

# ─── Pydantic Models ────────────────────────────────────────────────────────────


class OptimizationStatus(BaseModel):
    """Current optimization state snapshot."""
    tuning_active: bool = False
    last_tune_ts: Optional[float] = None
    cache_entries: int = 0
    cache_hit_rate: float = 0.0
    total_token_cost_usd: float = 0.0
    budget_limit_usd: Optional[float] = None
    budget_remaining_usd: Optional[float] = None
    models_monitored: int = 0


class TuneRequest(BaseModel):
    """Request body for triggering a parameter tune."""
    model_id: str
    target_temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    target_top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    target_max_tokens: Optional[int] = Field(default=None, ge=1)


class TuneResult(BaseModel):
    """Result of a tuning operation."""
    model_id: str
    previous_temperature: float
    new_temperature: float
    previous_top_p: float
    new_top_p: float
    previous_max_tokens: Optional[int]
    new_max_tokens: Optional[int]
    tuned_at: float


class CacheEntry(BaseModel):
    key: str
    value_summary: str
    created_at: float
    hits: int
    ttl_seconds: Optional[int] = None


class CacheStats(BaseModel):
    total_entries: int
    total_hits: int
    total_misses: int
    hit_rate: float
    entries: List[CacheEntry] = []


class CostEntry(BaseModel):
    model_id: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    timestamp: float


class CostBreakdown(BaseModel):
    total_cost_usd: float
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    per_model: Dict[str, float] = {}
    recent: List[CostEntry] = []


class BudgetRequest(BaseModel):
    monthly_limit_usd: float = Field(..., ge=0.0)
    alert_threshold_pct: float = Field(default=80.0, ge=0.0, le=100.0)


class BudgetInfo(BaseModel):
    monthly_limit_usd: float
    alert_threshold_pct: float
    current_spend_usd: float
    remaining_usd: float
    percent_used: float


# ─── In-Memory State ────────────────────────────────────────────────────────────

_lock = threading.Lock()

# Cache store
_cache: Dict[str, dict] = {}
_cache_hits: int = 0
_cache_misses: int = 0

# Cost tracking
_cost_entries: List[CostEntry] = []

# Budget
_budget: Optional[BudgetInfo] = None

# Tuning state
_tuning_active: bool = False
_last_tune_ts: Optional[float] = None

# Default model parameters (model_id → {temperature, top_p, max_tokens})
_model_params: Dict[str, dict] = {
    "anthropic-default": {"temperature": 0.7, "top_p": 1.0, "max_tokens": 4096},
    "openai-default": {"temperature": 0.7, "top_p": 1.0, "max_tokens": 4096},
    "google-default": {"temperature": 0.7, "top_p": 0.95, "max_tokens": 4096},
    "ollama-local": {"temperature": 0.8, "top_p": 0.9, "max_tokens": 4096},
    "deepseek-default": {"temperature": 0.7, "top_p": 0.95, "max_tokens": 4096},
}

# ─── Routes ─────────────────────────────────────────────────────────────────────


@router.get("/status", response_model=OptimizationStatus)
async def get_status():
    """Return current optimization state."""
    with _lock:
        hit_rate = _cache_hits / max(_cache_hits + _cache_misses, 1)
        total_cost = sum(e.cost_usd for e in _cost_entries)
        return OptimizationStatus(
            tuning_active=_tuning_active,
            last_tune_ts=_last_tune_ts,
            cache_entries=len(_cache),
            cache_hit_rate=round(hit_rate, 4),
            total_token_cost_usd=round(total_cost, 4),
            budget_limit_usd=_budget.monthly_limit_usd if _budget else None,
            budget_remaining_usd=_budget.remaining_usd if _budget else None,
            models_monitored=len(_model_params),
        )


@router.post("/tune", response_model=TuneResult)
async def tune_parameters(req: TuneRequest):
    """Trigger a parameter tuning operation for a model."""
    with _lock:
        if req.model_id not in _model_params:
            raise HTTPException(status_code=404, detail=f"Model '{req.model_id}' not found")
        current = _model_params[req.model_id]

    # Capture previous
    prev_temp = current["temperature"]
    prev_top_p = current["top_p"]
    prev_max = current.get("max_tokens")

    # Apply new values (fall back to current if not specified)
    new_temp = req.target_temperature if req.target_temperature is not None else prev_temp
    new_top_p = req.target_top_p if req.target_top_p is not None else prev_top_p
    new_max = req.target_max_tokens if req.target_max_tokens is not None else prev_max

    with _lock:
        _model_params[req.model_id] = {
            "temperature": new_temp,
            "top_p": new_top_p,
            "max_tokens": new_max,
        }
        _tuning_active = False
        _last_tune_ts = time.time()

    return TuneResult(
        model_id=req.model_id,
        previous_temperature=prev_temp,
        new_temperature=new_temp,
        previous_top_p=prev_top_p,
        new_top_p=new_top_p,
        previous_max_tokens=prev_max,
        new_max_tokens=new_max,
        tuned_at=_last_tune_ts,
    )


@router.get("/cache", response_model=CacheStats)
async def get_cache_stats():
    """Return cache statistics."""
    with _lock:
        total = _cache_hits + _cache_misses
        hit_rate = _cache_hits / total if total > 0 else 0.0
        entries = []
        for key, data in _cache.items():
            entries.append(CacheEntry(
                key=key,
                value_summary=str(data.get("value", ""))[:80],
                created_at=data.get("created_at", 0),
                hits=data.get("hits", 0),
                ttl_seconds=data.get("ttl"),
            ))
        return CacheStats(
            total_entries=len(_cache),
            total_hits=_cache_hits,
            total_misses=_cache_misses,
            hit_rate=round(hit_rate, 4),
            entries=entries,
        )


@router.post("/cache/invalidate")
async def invalidate_cache(keys: Optional[List[str]] = None):
    """Invalidate cache entries. If keys is empty/None, invalidate all."""
    with _lock:
        if keys:
            for k in keys:
                _cache.pop(k, None)
        else:
            _cache.clear()
        # Reset counters
        global _cache_hits, _cache_misses
        _cache_hits = 0
        _cache_misses = 0
    return {"ok": True, "invalidated": len(keys) if keys else "all"}


@router.get("/costs", response_model=CostBreakdown)
async def get_costs():
    """Return cost breakdown."""
    with _lock:
        total_cost = sum(e.cost_usd for e in _cost_entries)
        total_prompt = sum(e.prompt_tokens for e in _cost_entries)
        total_completion = sum(e.completion_tokens for e in _cost_entries)
        per_model: Dict[str, float] = {}
        for e in _cost_entries:
            per_model[e.model_id] = per_model.get(e.model_id, 0.0) + e.cost_usd
        # Return last 20 entries as recent
        recent = _cost_entries[-20:]
        return CostBreakdown(
            total_cost_usd=round(total_cost, 4),
            total_prompt_tokens=total_prompt,
            total_completion_tokens=total_completion,
            total_tokens=total_prompt + total_completion,
            per_model=per_model,
            recent=recent,
        )


@router.post("/costs/budget", response_model=BudgetInfo)
async def set_budget(req: BudgetRequest):
    """Set monthly budget limits."""
    with _lock:
        current_spend = sum(e.cost_usd for e in _cost_entries)
        info = BudgetInfo(
            monthly_limit_usd=req.monthly_limit_usd,
            alert_threshold_pct=req.alert_threshold_pct,
            current_spend_usd=round(current_spend, 4),
            remaining_usd=round(req.monthly_limit_usd - current_spend, 4),
            percent_used=round((current_spend / req.monthly_limit_usd) * 100, 2) if req.monthly_limit_usd > 0 else 0.0,
        )
    return info
