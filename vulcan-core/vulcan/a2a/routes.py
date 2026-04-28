"""
A2A FastAPI Routes — /api/a2a/*
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from .protocol import AgentCard, AgentStatus, DelegatedTask, TaskPayload, A2AMessageType
from .agent_pool import get_agent_pool

logger = logging.getLogger("A2A.Routes")
router = APIRouter(prefix="/api/a2a", tags=["A2A"])


# ─── Agent Management ────────────────────────────────────────────────────────

@router.get("/agents")
async def list_agents():
    """List all registered agents in the A2A network."""
    pool = get_agent_pool()
    agents = await pool.list_agents()
    return {"agents": [a.to_dict() for a in agents]}


@router.post("/agents/register")
async def register_agent(card: AgentCard):
    """Register an agent with the A2A pool."""
    pool = get_agent_pool()
    await pool.register(card)
    return {"ok": True, "agent": card.name}


@router.post("/agents/{name}/heartbeat")
async def agent_heartbeat(name: str, heartbeat_status: str = "idle"):
    """Update agent heartbeat (also updates status)."""
    pool = get_agent_pool()
    status_enum = AgentStatus(heartbeat_status) if heartbeat_status else AgentStatus.IDLE
    await pool.heartbeat(name, status_enum)
    return {"ok": True}


@router.delete("/agents/{name}")
async def unregister_agent(name: str):
    """Unregister an agent from the A2A network."""
    pool = get_agent_pool()
    await pool.unregister(name)
    return {"ok": True}


@router.get("/agents/{name}")
async def get_agent(name: str):
    """Get details of a specific agent."""
    pool = get_agent_pool()
    agent = await pool.get_agent(name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    return agent.to_dict()


# ─── Task Delegation ──────────────────────────────────────────────────────────

@router.post("/tasks/delegate")
async def delegate_task(
    goal: str,
    assignee: Optional[str] = None,
    role: Optional[str] = None,
    priority: int = 1,
    description: Optional[str] = None,
    tools: Optional[list[str]] = None,
    context: Optional[dict] = None,
    checkpoints: Optional[list[str]] = None,
    timeout_seconds: Optional[int] = None,
    thread_id: Optional[str] = None,
    proposer: str = "vulcan",
):
    """
    Delegate a task to a peer agent in the A2A network.

    If assignee is provided, send directly to that agent.
    If role is provided, find first available agent with that role.
    Otherwise, broadcast to all available agents.
    """
    import uuid
    pool = get_agent_pool()
    task_id = f"delegated-{uuid.uuid4().hex[:8]}"

    task = DelegatedTask(
        task_id=task_id,
        thread_id=thread_id or f"thread-{uuid.uuid4().hex[:8]}",
        goal=goal,
        proposer=proposer,
        assignee=assignee or "",
        status="proposed",
        priority=priority,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # Find target agent
    target_agent = None
    if assignee:
        target_agent = await pool.get_agent(assignee)
    elif role:
        candidates = await pool.find_agents(role=role, status=AgentStatus.IDLE, exclude=[proposer])
        if candidates:
            target_agent = candidates[0]

    if not target_agent and not assignee:
        raise HTTPException(
            status_code=503,
            detail="No available agent found for delegation. Try specifying a role or assignee.",
        )

    if target_agent:
        task.assignee = target_agent.name

    # Propose the task
    results = await pool.propose_task(task)
    return {
        "task_id": task_id,
        "status": "proposed",
        "assignee": task.assignee,
        "thread_id": task.thread_id,
        "proposed_to": [r[0].name for r in results],
    }


@router.get("/tasks/delegated")
async def list_delegated_tasks(agent_name: Optional[str] = None):
    """List all delegated tasks, optionally filtered by agent."""
    pool = get_agent_pool()
    tasks = await pool.list_delegated_tasks(agent_name)
    return {"tasks": [t.to_dict() for t in tasks]}


@router.get("/tasks/delegated/{task_id}")
async def get_delegated_task(task_id: str):
    """Get status of a delegated task."""
    pool = get_agent_pool()
    task = await pool.get_delegated_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return task.to_dict()


@router.post("/tasks/delegated/{task_id}/accept")
async def accept_delegated_task(task_id: str, agent_name: str):
    """Accept a delegated task (called by the assigned agent)."""
    pool = get_agent_pool()
    task = await pool.accept_task(task_id, agent_name)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return {"ok": True, "task": task.to_dict()}


@router.post("/tasks/delegated/{task_id}/complete")
async def complete_delegated_task(
    task_id: str,
    result: Optional[dict] = None,
    error: Optional[str] = None,
):
    """Mark a delegated task as completed or failed."""
    pool = get_agent_pool()
    await pool.complete_task(task_id, result or {}, error)
    return {"ok": True}


@router.delete("/tasks/delegated/{task_id}")
async def cancel_delegated_task(task_id: str):
    """Cancel a delegated task."""
    pool = get_agent_pool()
    task = await pool.get_delegated_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    task.status = "cancelled"
    task.completed_at = datetime.now(timezone.utc).isoformat()
    return {"ok": True}


# ─── Pool Status ──────────────────────────────────────────────────────────────

@router.get("/status")
async def a2a_status():
    """Get overall A2A network status."""
    pool = get_agent_pool()
    return await pool.get_pool_status()


@router.get("/pool/stats")
async def pool_stats():
    """Get aggregate pool statistics."""
    pool = get_agent_pool()
    status = await pool.get_pool_status()
    return {
        "total_agents": status["total_agents"],
        "idle_agents": status["idle"],
        "busy_agents": status["busy"],
        "active_tasks": status["active_delegated"],
        "total_delegated": status["total_delegated_tasks"],
    }
