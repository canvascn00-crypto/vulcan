"""
Vulcan A2A Protocol — Agent-to-Agent Communication

Enables multiple VulcanAgent instances to:
  - Discover each other
  - Exchange tasks and results
  - Collaborate on complex goals
  - Share context and memory
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from collections.abc import Awaitable, Callable

logger = logging.getLogger("A2A.Protocol")


# ─── Enums ────────────────────────────────────────────────────────────────────

class A2AMessageType(str, Enum):
    # Lifecycle
    AGENT_REGISTER = "agent.register"
    AGENT_HEARTBEAT = "agent.heartbeat"
    AGENT_UNREGISTER = "agent.unregister"

    # Task lifecycle
    TASK_PROPOSE = "task.propose"       # propose a task to another agent
    TASK_ACCEPT = "task.accept"         # accept a task
    TASK_REJECT = "task.reject"          # reject a task
    TASK_RESULT = "task.result"          # return task result
    TASK_PROGRESS = "task.progress"      # progress update
    TASK_CANCEL = "task.cancel"          # cancel a running task

    # Collaboration
    CONTEXT_SHARE = "context.share"      # share context/memory with peers
    CONTEXT_ASK = "context.ask"          # ask peers for information
    CONTEXT_REPLY = "context.reply"      # reply to context.ask

    # Streaming
    STREAM_START = "stream.start"
    STREAM_CHUNK = "stream.chunk"
    STREAM_END = "stream.end"

    # Error
    ERROR = "error"


class AgentStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"
    STREAMING = "streaming"
    OFFLINE = "offline"


class TaskPriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


# ─── Message Schema ────────────────────────────────────────────────────────────

@dataclass
class A2AMessage:
    """Base A2A message envelope."""
    id: str                    # globally unique message id
    type: A2AMessageType       # message type
    sender: str                # agent name
    receiver: Optional[str]    # target agent name (None = broadcast)
    thread_id: str             # conversation thread
    timestamp: str             # ISO timestamp

    # Payload
    payload: dict = field(default_factory=dict)

    # Routing
    correlation_id: Optional[str] = None   # id this message replies to
    ttl: int = 10                           # hop limit

    def to_json(self) -> str:
        return json.dumps({
            "id": self.id,
            "type": self.type.value,
            "sender": self.sender,
            "receiver": self.receiver,
            "thread_id": self.thread_id,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "correlation_id": self.correlation_id,
            "ttl": self.ttl,
        })

    @classmethod
    def from_json(cls, raw: str | dict) -> A2AMessage:
        if isinstance(raw, str):
            data = json.loads(raw)
        else:
            data = raw
        return cls(
            id=data["id"],
            type=A2AMessageType(data["type"]),
            sender=data["sender"],
            receiver=data.get("receiver"),
            thread_id=data["thread_id"],
            timestamp=data["timestamp"],
            payload=data.get("payload", {}),
            correlation_id=data.get("correlation_id"),
            ttl=data.get("ttl", 10),
        )

    def decrement_ttl(self) -> bool:
        """Decrement TTL. Returns False if TTL exhausted."""
        self.ttl -= 1
        return self.ttl >= 0


# ─── Task Payload ─────────────────────────────────────────────────────────────

@dataclass
class TaskPayload:
    """Task-related payload data."""
    task_id: str
    goal: str
    description: Optional[str] = None
    priority: int = TaskPriority.NORMAL
    tools: list[str] = field(default_factory=list)       # allowed tools
    timeout_seconds: Optional[int] = None
    context: Optional[dict] = None                        # shared context
    checkpoints: Optional[list[str]] = None              # milestone descriptions
    result_schema: Optional[dict] = None                  # expected result shape

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "goal": self.goal,
            "description": self.description,
            "priority": self.priority,
            "tools": self.tools,
            "timeout_seconds": self.timeout_seconds,
            "context": self.context,
            "checkpoints": self.checkpoints,
            "result_schema": self.result_schema,
        }

    @classmethod
    def from_dict(cls, d: dict) -> TaskPayload:
        return cls(
            task_id=d["task_id"],
            goal=d["goal"],
            description=d.get("description"),
            priority=d.get("priority", TaskPriority.NORMAL),
            tools=d.get("tools", []),
            timeout_seconds=d.get("timeout_seconds"),
            context=d.get("context"),
            checkpoints=d.get("checkpoints"),
            result_schema=d.get("result_schema"),
        )


# ─── Agent Card ───────────────────────────────────────────────────────────────

@dataclass
class AgentCard:
    """Describes a peer agent in the A2A network."""
    name: str
    version: str
    status: AgentStatus
    role: str                           # e.g. "planner", "executor", "researcher"
    capabilities: list[str]             # e.g. ["web", "code", "data"]
    tools: list[str]                    # available tools
    description: Optional[str] = None
    endpoint: Optional[str] = None      # HTTP/WebSocket endpoint
    tags: list[str] = field(default_factory=list)
    maxConcurrentTasks: int = 3
    last_seen: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "status": self.status.value,
            "role": self.role,
            "capabilities": self.capabilities,
            "tools": self.tools,
            "description": self.description,
            "endpoint": self.endpoint,
            "tags": self.tags,
            "maxConcurrentTasks": self.maxConcurrentTasks,
            "last_seen": self.last_seen,
        }

    @classmethod
    def from_dict(cls, d: dict) -> AgentCard:
        return cls(
            name=d["name"],
            version=d.get("version", "0.1.0"),
            status=AgentStatus(d.get("status", "idle")),
            role=d.get("role", "general"),
            capabilities=d.get("capabilities", []),
            tools=d.get("tools", []),
            description=d.get("description"),
            endpoint=d.get("endpoint"),
            tags=d.get("tags", []),
            maxConcurrentTasks=d.get("maxConcurrentTasks", 3),
            last_seen=d.get("last_seen", datetime.now(timezone.utc).isoformat()),
        )


# ─── Task State ──────────────────────────────────────────────────────────────

@dataclass
class DelegatedTask:
    """Tracks a task delegated to a peer agent."""
    task_id: str
    thread_id: str
    goal: str
    proposer: str          # agent that created the task
    assignee: str          # agent the task was delegated to
    status: str            # proposed | accepted | rejected | completed | failed | cancelled
    priority: int
    created_at: str
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    progress_steps: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "thread_id": self.thread_id,
            "goal": self.goal,
            "proposer": self.proposer,
            "assignee": self.assignee,
            "status": self.status,
            "priority": self.priority,
            "created_at": self.created_at,
            "accepted_at": self.accepted_at,
            "completed_at": self.completed_at,
            "result": self.result,
            "error": self.error,
            "progress_steps": self.progress_steps,
        }

    @classmethod
    def from_dict(cls, d: dict) -> DelegatedTask:
        return cls(
            task_id=d["task_id"],
            thread_id=d["thread_id"],
            goal=d["goal"],
            proposer=d["proposer"],
            assignee=d["assignee"],
            status=d.get("status", "proposed"),
            priority=d.get("priority", 1),
            created_at=d.get("created_at", datetime.now(timezone.utc).isoformat()),
            accepted_at=d.get("accepted_at"),
            completed_at=d.get("completed_at"),
            result=d.get("result"),
            error=d.get("error"),
            progress_steps=d.get("progress_steps", []),
        )


# ─── A2A Channel Interface ────────────────────────────────────────────────────

class A2AChannel:
    """
    Abstract channel for A2A message transport.
    Implementors: InMemoryChannel (same process), HTTPChannel (distributed).
    """

    async def send(self, message: A2AMessage) -> None:
        raise NotImplementedError

    async def subscribe(
        self,
        agent_name: str,
        handler: Callable[[A2AMessage], Awaitable[None]],
    ) -> None:
        raise NotImplementedError

    async def unsubscribe(self, agent_name: str) -> None:
        raise NotImplementedError

    async def broadcast(
        self,
        message: A2AMessage,
        exclude: Optional[list[str]] = None,
    ) -> None:
        raise NotImplementedError


# ─── In-Memory Channel (same process) ────────────────────────────────────────

class InMemoryChannel(A2AChannel):
    """
    In-process A2A channel. All agents in the same process share this.
    Supports both direct messages and broadcast.
    """

    def __init__(self):
        self._subscribers: dict[str, Callable[[A2AMessage], Awaitable[None]]] = {}
        self._lock = asyncio.Lock()

    async def send(self, message: A2AMessage) -> None:
        async with self._lock:
            handler = self._subscribers.get(message.receiver or "")
            if handler:
                try:
                    await handler(message)
                except Exception as e:
                    logger.error(f"A2A channel deliver error: {e}")

    async def subscribe(
        self,
        agent_name: str,
        handler: Callable[[A2AMessage], Awaitable[None]],
    ) -> None:
        async with self._lock:
            self._subscribers[agent_name] = handler
        logger.info(f"A2A: Agent '{agent_name}' subscribed")

    async def unsubscribe(self, agent_name: str) -> None:
        async with self._lock:
            self._subscribers.pop(agent_name, None)
        logger.info(f"A2A: Agent '{agent_name}' unsubscribed")

    async def broadcast(
        self,
        message: A2AMessage,
        exclude: Optional[list[str]] = None,
    ) -> None:
        excludeset = set(exclude) if exclude else set()
        handlers: list[tuple[str, Callable[[A2AMessage], Awaitable[None]]]] = []
        async with self._lock:
            handlers = [(n, h) for n, h in self._subscribers.items() if n not in excludeset]

        for name, handler in handlers:
            try:
                await handler(message)
            except Exception as e:
                logger.error(f"A2A broadcast deliver to '{name}' error: {e}")


# ─── Global A2A Bus ────────────────────────────────────────────────────────────

_a2a_bus: Optional[InMemoryChannel] = None

def get_a2a_bus() -> InMemoryChannel:
    global _a2a_bus
    if _a2a_bus is None:
        _a2a_bus = InMemoryChannel()
    return _a2a_bus
