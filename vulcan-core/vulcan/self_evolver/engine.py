"""
Self-Evolver Engine — core evolution logic (prompt optimization, skill scoring, auto-evolution).
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Optional

from vulcan.self_evolver.metrics import (
    EvolutionConfig,
    EvolutionEvent,
    MetricsStore,
    PromptScore,
    SkillScoreEntry,
)

logger = logging.getLogger("vulcan.self_evolver")


class SelfEvolverEngine:
    """
    Core engine for the Self-Evolver module.

    Responsibilities:
    - Analyze current performance and suggest improvements
    - Run evolution cycles (prompt optimization, skill scoring)
    - Track evolution history
    """

    def __init__(self, store: Optional[MetricsStore] = None):
        self.store = store or MetricsStore()
        self._evolve_lock = asyncio.Lock()

    # ── Prompt Optimization ────────────────────────────────────────────────

    async def optimize_prompt(self, prompt_id: str, label: str) -> PromptScore:
        """Analyze and improve a prompt, returning the updated score."""
        # Simulate optimization: generate a score with some variance
        base_score = self.store.avg_prompt_score() or 50.0
        optimized_score = min(100.0, base_score + 10.0 + (hash(prompt_id) % 15))
        entry = PromptScore(
            prompt_id=prompt_id,
            label=label,
            score=optimized_score,
            latency_ms=120.0,
            success=True,
        )
        self.store.add_prompt_score(entry)

        # Log event
        event = EvolutionEvent(
            event_id=str(uuid.uuid4()),
            event_type="prompt_optimization",
            description=f"Optimized prompt '{label}' ({prompt_id})",
            before={"score": base_score},
            after={"score": optimized_score},
            improvements=[f"Score improved from {base_score:.1f} to {optimized_score:.1f}"],
        )
        self.store.add_event(event)
        return entry

    # ── Skill Scoring ─────────────────────────────────────────────────────

    async def score_skill(self, skill_id: str, skill_name: str) -> SkillScoreEntry:
        """Rate a skill's effectiveness (0-100)."""
        before = None
        # Check if there's a previous score for this skill
        for s in reversed(self.store.skill_scores):
            if s.skill_id == skill_id:
                before = s.score
                break

        # Generate score (simulated)
        raw = 50 + (hash(skill_id) % 50)
        score = min(100, raw)

        entry = SkillScoreEntry(
            skill_id=skill_id,
            skill_name=skill_name,
            score=score,
            before_score=before,
        )
        self.store.add_skill_score(entry)

        # Log event
        event = EvolutionEvent(
            event_id=str(uuid.uuid4()),
            event_type="skill_scoring",
            description=f"Scored skill '{skill_name}' ({skill_id})",
            before={"score": before},
            after={"score": score},
            improvements=[] if before and before >= score else [
                f"Score improved from {before} to {score}"
            ] if before else [f"Initial score: {score}"],
        )
        self.store.add_event(event)
        return entry

    # ── Check & Suggest ───────────────────────────────────────────────────

    async def check_performance(self) -> dict:
        """Analyze current performance and suggest improvements."""
        status = self.store.get_status()
        suggestions: list[dict] = []

        avg_prompt = status.avg_prompt_score
        avg_skill = status.avg_skill_score

        if avg_prompt < self.store.config.score_threshold:
            suggestions.append({
                "area": "prompts",
                "issue": f"Average prompt score {avg_prompt:.1f} below threshold {self.store.config.score_threshold}",
                "action": "Re-optimize underperforming prompts",
            })

        if avg_skill < self.store.config.score_threshold:
            suggestions.append({
                "area": "skills",
                "issue": f"Average skill score {avg_skill:.1f} below threshold {self.store.config.score_threshold}",
                "action": "Re-evaluate and tune underperforming skills",
            })

        if not suggestions:
            suggestions.append({
                "area": "general",
                "issue": "Performance is within acceptable range",
                "action": "No immediate action needed",
            })

        return {
            "status": status.model_dump(),
            "suggestions": suggestions,
        }

    # ── Auto-Evolve Cycle ─────────────────────────────────────────────────

    async def evolve(self) -> EvolutionEvent:
        """
        Trigger a full evolution cycle:
        1. Detect underperforming areas
        2. Apply improvements
        3. Record the evolution event
        """
        async with self._evolve_lock:
            before_status = self.store.get_status()

            # Identify underperforming prompts
            underperforming_prompts = [
                p for p in self.store.prompt_scores
                if p.score < self.store.config.score_threshold
            ]

            # Identify underperforming skills
            underperforming_skills = [
                s for s in self.store.skill_scores
                if s.score < self.store.config.score_threshold
            ]

            improvements: list[str] = []

            # Re-optimize underperforming prompts
            if underperforming_prompts:
                for p in underperforming_prompts[:5]:
                    new = await self.optimize_prompt(p.prompt_id, p.label)
                    improvements.append(
                        f"Prompt '{p.label}' re-optimized: {p.score:.1f} → {new.score:.1f}"
                    )

            # Re-score underperforming skills
            if underperforming_skills:
                for s in underperforming_skills[:5]:
                    new = await self.score_skill(s.skill_id, s.skill_name)
                    improvements.append(
                        f"Skill '{s.skill_name}' re-scored: {s.score} → {new.score}"
                    )

            # If nothing was underperforming, still log the cycle
            if not improvements:
                improvements.append("Evolution cycle completed — no underperforming areas detected")

            after_status = self.store.get_status()

            event = EvolutionEvent(
                event_id=str(uuid.uuid4()),
                event_type="auto_evolution",
                description="Auto-evolution cycle completed",
                before=before_status.model_dump(),
                after=after_status.model_dump(),
                improvements=improvements,
            )
            self.store.add_event(event)
            return event

    # ── Config Update ─────────────────────────────────────────────────────

    async def update_config(self, config: EvolutionConfig) -> EvolutionConfig:
        """Update evolution parameters."""
        self.store.config = config
        return config
