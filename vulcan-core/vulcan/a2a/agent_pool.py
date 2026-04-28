"""
A2A Agent Pool — Manages multiple VulcanAgent instances in the A2A network.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from .protocol import (
    A2AMessage, A2AMessageType, AgentCard, AgentStatus,
    DelegatedTask, TaskPayload, get_a2a_bus, logger,
)

logger = logging.getLogger("A2A.AgentPool")


class AgentPool:
    """
    Central registry of all VulcanAgent instances in the A2A network.

    Responsibilities:
    - Register/unregister agents
    - Track agent health via heartbeats
    - Match tasks to suitable agents
    - Route A2A messages to correct agents
    """

    def __init__(self):
        self._agents: dict[str, AgentCard] = {}
        self._heartbeats: dict[str, float] = {}     # name → last heartbeat time
        self._active_tasks: dict[str, list[str]] = defaultdict(list)  # agent → task_ids
        self._delegated_tasks: dict[str, DelegatedTask] = {}  # task_id → task
        self._lock = asyncio.Lock()
        self._bus = get_a2a_bus()
        self._heartbeat_interval = 30  # seconds
        self._offline_threshold = 90    # seconds without heartbeat → offline

    # ── Registration ───────────────────────────────────────────────────────────

    async def register(self, card: AgentCard) -> None:
        """Register an agent with the pool."""
        async with self._lock:
            card.last_seen = datetime.now(timezone.utc).isoformat()
            self._agents[card.name] = card
            self._heartbeats[card.name] = time.time()
        logger.info(f"A2A AgentPool: registered '{card.name}' (role={card.role})")

    async def unregister(self, name: str) -> None:
        """Remove an agent from the pool."""
        async with self._lock:
            self._agents.pop(name, None)
            self._heartbeats.pop(name, None)
            self._active_tasks.pop(name, None)
        logger.info(f"A2A AgentPool: unregistered '{name}'")

    async def heartbeat(self, name: str, status: AgentStatus = AgentStatus.IDLE) -> None:
        """Update agent heartbeat timestamp."""
        async with self._lock:
            if name in self._agents:
                self._agents[name].status = status
                self._agents[name].last_seen = datetime.now(timezone.utc).isoformat()
                self._heartbeats[name] = time.time()

    # ── Discovery ──────────────────────────────────────────────────────────────

    async def list_agents(self) -> list[AgentCard]:
        """List all registered agents (pruning offline ones)."""
        await self._prune_offline()
        async with self._lock:
            return list(self._agents.values())

    async def get_agent(self, name: str) -> Optional[AgentCard]:
        await self._prune_offline()
        async with self._lock:
            return self._agents.get(name)

    async def find_agents(
        self,
        capability: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[AgentStatus] = None,
        exclude: Optional[list[str]] = None,
    ) -> list[AgentCard]:
        """Find agents matching criteria."""
        candidates = await self.list_agents()
        excludeset = set(exclude) if exclude else set()
        results = []
        for agent in candidates:
            if agent.name in excludeset:
                continue
            if status and agent.status != status:
                continue
            if role and agent.role != role:
                continue
            if capability and capability not in agent.capabilities:
                continue
            results.append(agent)
        # Sort by active task load (prefer less busy agents)
        results.sort(key=lambda a: len(self._active_tasks.get(a.name, [])))
        return results

    # ── Task Delegation ────────────────────────────────────────────────────────

    async def propose_task(
        self,
        task: DelegatedTask,
    ) -> list[tuple[AgentCard, bool]]:
        """
        Propose a task to the best-matching agents.

        Returns list of (agent, accepted) tuples.
        The first agent to accept wins; others get TASK_CANCELLED.
        """
        candidates = await self.find_agents(
            status=AgentStatus.IDLE,
            exclude=[task.proposer],
        )
        if not candidates:
            logger.warning(f"A2A: No available agents for task '{task.task_id}'")
            return []

        winner: Optional[AgentCard] = None
        acceptances: list[tuple[AgentCard, bool]] = []

        # Propose to all candidates
        propose_msg = A2AMessage(
            id=f"propose-{task.task_id}",
            type=A2AMessageType.TASK_PROPOSE,
            sender=task.proposer,
            receiver=None,   # broadcast
            thread_id=task.thread_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            payload={"task": task.to_dict()},
        )

        # Route to each candidate
        for agent in candidates:
            msg = A2AMessage(
                id=f"propose-{task.task_id}-{agent.name}",
                type=A2AMessageType.TASK_PROPOSE,
                sender=task.proposer,
                receiver=agent.name,
                thread_id=task.thread_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                payload={"task": task.to_dict()},
            )
            try:
                await self._bus.send(msg)
            except Exception as e:
                logger.error(f"Failed to send TASK_PROPOSE to '{agent.name}': {e}")

        # Store the task as "proposed"
        async with self._lock:
            self._delegated_tasks[task.task_id] = task

        return acceptances

    async def accept_task(self, task_id: str, agent_name: str) -> Optional[DelegatedTask]:
        """Mark a delegated task as accepted by an agent."""
        async with self._lock:
            task = self._delegated_tasks.get(task_id)
            if not task:
                return None
            task.status = "accepted"
            task.assignee = agent_name
            task.accepted_at = datetime.now(timezone.utc).isoformat()
            self._active_tasks[agent_name].append(task_id)
        logger.info(f"A2A: Agent '{agent_name}' accepted task '{task_id}'")
        return task

    async def complete_task(
        self,
        task_id: str,
        result: dict,
        error: Optional[str] = None,
    ) -> None:
        """Mark a delegated task as completed or failed."""
        async with self._lock:
            task = self._delegated_tasks.get(task_id)
            if not task:
                return
            task.status = "failed" if error else "completed"
            task.completed_at = datetime.now(timezone.utc).isoformat()
            task.result = result
            task.error = error
            if task.assignee:
                self._active_tasks[task.assignee] = [
                    t for t in self._active_tasks.get(task.assignee, []) if t != task_id
                ]
        logger.info(f"A2A: Task '{task_id}' completed (status={task.status})")

    async def get_delegated_task(self, task_id: str) -> Optional[DelegatedTask]:
        async with self._lock:
            return self._delegated_tasks.get(task_id)

    async def list_delegated_tasks(self, agent_name: Optional[str] = None) -> list[DelegatedTask]:
        async with self._lock:
            tasks = list(self._delegated_tasks.values())
        if agent_name:
            return [t for t in tasks if t.proposer == agent_name or t.assignee == agent_name]
        return tasks

    async def get_pool_status(self) -> dict:
        """Return aggregate pool statistics."""
        await self._prune_offline()
        async with self._lock:
            agents = list(self._agents.values())
            return {
                "total_agents": len(agents),
                "idle": sum(1 for a in agents if a.status == AgentStatus.IDLE),
                "busy": sum(1 for a in agents if a.status == AgentStatus.BUSY),
                "streaming": sum(1 for a in agents if a.status == AgentStatus.STREAMING),
                "total_delegated_tasks": len(self._delegated_tasks),
                "active_delegated": sum(1 for t in self._delegated_tasks.values() if t.status in ("proposed", "accepted")),
                "agents": [a.to_dict() for a in agents],
            }

    # ── Internal ───────────────────────────────────────────────────────────────

    async def _prune_offline(self) -> None:
        """Remove agents that haven't sent a heartbeat recently."""
        now = time.time()
        threshold = self._offline_threshold
        async with self._lock:
            stale = [name for name, last in self._heartbeats.items() if now - last > threshold]
            for name in stale:
                if name in self._agents:
                    self._agents[name].status = AgentStatus.OFFLINE
                    logger.warning(f"A2A: Agent '{name}' marked OFFLINE (no heartbeat)")


# ─── Singleton ────────────────────────────────────────────────────────────────

_pool: Optional[AgentPool] = None

def get_agent_pool() -> AgentPool:
    global _pool
    if _pool is None:
        _pool = AgentPool()
    return _pool
