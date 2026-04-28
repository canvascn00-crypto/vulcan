"""
Vulcan A2A — Agent-to-Agent Collaboration Protocol

Enables multiple VulcanAgent instances to:
  - Discover each other via AgentCard
  - Delegate tasks to best-suited peer agents
  - Share context and memory across agents
  - Collaborate on complex multi-step goals
  - Stream results back to the original caller
"""

from .protocol import (
    A2AChannel,
    A2AMessage,
    A2AMessageType,
    AgentCard,
    AgentStatus,
    DelegatedTask,
    InMemoryChannel,
    TaskPayload,
    TaskPriority,
    get_a2a_bus,
)
from .agent_pool import AgentPool, get_agent_pool

__all__ = [
    # Protocol
    "A2AChannel",
    "A2AMessage",
    "A2AMessageType",
    "AgentCard",
    "AgentStatus",
    "DelegatedTask",
    "InMemoryChannel",
    "TaskPayload",
    "TaskPriority",
    "get_a2a_bus",
    # Pool
    "AgentPool",
    "get_agent_pool",
]
