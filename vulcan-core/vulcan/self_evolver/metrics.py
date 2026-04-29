"""
Self-Evolver Metrics — Pydantic models and in-memory storage for evolution tracking.
"""
from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


# ─── Models ────────────────────────────────────────────────────────────────────


class PromptScore(BaseModel):
    """Performance score for a single prompt variant."""
    prompt_id: str
    label: str
    score: float = Field(ge=0, le=100)
    latency_ms: float = 0.0
    success: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SkillScoreEntry(BaseModel):
    """Effectiveness score for a skill."""
    skill_id: str
    skill_name: str
    score: int = Field(ge=0, le=100)
    before_score: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EvolutionEvent(BaseModel):
    """A single evolution event with before/after metrics."""
    event_id: str
    event_type: str  # "prompt_optimization" | "skill_scoring" | "auto_evolution"
    description: str
    before: Optional[dict] = None
    after: Optional[dict] = None
    improvements: list[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EvolutionConfig(BaseModel):
    """Tunable evolution parameters."""
    check_interval_sec: int = 300
    auto_evolve: bool = True
    score_threshold: float = 60.0  # below this → trigger evolution
    max_history: int = 500


class EvolutionStatus(BaseModel):
    """Current evolution state snapshot."""
    total_prompts_tracked: int = 0
    total_skills_scored: int = 0
    total_events: int = 0
    avg_prompt_score: float = 0.0
    avg_skill_score: float = 0.0
    last_evolution: Optional[str] = None
    config: EvolutionConfig = Field(default_factory=EvolutionConfig)


# ─── In-Memory Stores ─────────────────────────────────────────────────────────


class MetricsStore:
    """In-memory store backed by deques for bounded history."""

    def __init__(self, max_history: int = 500):
        self.prompt_scores: deque[PromptScore] = deque(maxlen=max_history)
        self.skill_scores: deque[SkillScoreEntry] = deque(maxlen=max_history)
        self.events: deque[EvolutionEvent] = deque(maxlen=max_history)
        self.config = EvolutionConfig()

    # ── Prompt scores ──────────────────────────────────────────────────────

    def add_prompt_score(self, entry: PromptScore) -> None:
        self.prompt_scores.append(entry)

    def get_prompt_scores(self, limit: int = 50) -> list[PromptScore]:
        return list(self.prompt_scores)[-limit:]

    def avg_prompt_score(self) -> float:
        if not self.prompt_scores:
            return 0.0
        return sum(p.score for p in self.prompt_scores) / len(self.prompt_scores)

    # ── Skill scores ──────────────────────────────────────────────────────

    def add_skill_score(self, entry: SkillScoreEntry) -> None:
        self.skill_scores.append(entry)

    def get_skill_scores(self, limit: int = 50) -> list[SkillScoreEntry]:
        return list(self.skill_scores)[-limit:]

    def avg_skill_score(self) -> float:
        if not self.skill_scores:
            return 0.0
        return sum(s.score for s in self.skill_scores) / len(self.skill_scores)

    # ── Events ────────────────────────────────────────────────────────────

    def add_event(self, event: EvolutionEvent) -> None:
        self.events.append(event)

    def get_events(self, limit: int = 100) -> list[EvolutionEvent]:
        return list(self.events)[-limit:]

    def get_status(self) -> EvolutionStatus:
        last_ts = None
        if self.events:
            last_ts = self.events[-1].timestamp
        return EvolutionStatus(
            total_prompts_tracked=len(self.prompt_scores),
            total_skills_scored=len(self.skill_scores),
            total_events=len(self.events),
            avg_prompt_score=self.avg_prompt_score(),
            avg_skill_score=self.avg_skill_score(),
            last_evolution=last_ts,
            config=self.config,
        )
