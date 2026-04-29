"""
Self-Evolver Module — Prompt optimization, skill scoring, auto-evolution.
"""
from vulcan.self_evolver.engine import SelfEvolverEngine
from vulcan.self_evolver.metrics import (
    EvolutionConfig,
    EvolutionEvent,
    EvolutionStatus,
    MetricsStore,
    PromptScore,
    SkillScoreEntry,
)
from vulcan.self_evolver.routes import router

__all__ = [
    "SelfEvolverEngine",
    "MetricsStore",
    "EvolutionConfig",
    "EvolutionEvent",
    "EvolutionStatus",
    "PromptScore",
    "SkillScoreEntry",
    "router",
]
