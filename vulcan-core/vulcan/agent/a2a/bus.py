"""
A2ABus — Agent-to-Agent 消息总线
支持多 Agent 协作：委托、查询、通知、协作、投票
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class A2AAction(Enum):
    DELEGATE = "delegate"          # 委托任务
    QUERY = "query"                # 查询信息
    NOTIFY = "notify"              # 通知事件
    COLLABORATE = "collaborate"    # 协作完成
    VOTE = "vote"                  # 投票决策
    SHARE_MEMORY = "share_memory"  # 共享记忆


@dataclass
class A2AMessage:
    id: str
    sender: str
    receivers: list[str]
    action: A2AAction
    payload: dict
    reply_to: Optional[str] = None
    expires_at: float = 0
    consensus_required: bool = False


@dataclass
class AgentInfo:
    id: str
    capabilities: list[str]
    status: str = "online"


class A2ABus:
    """
    A2A 消息总线 — Vulcan 多 Agent 协作的核心

    Comparison:
    - Without Vulcan: no multi-agent coordination
    - Vulcan: 完整 A2A 协议，消息总线，协作调度

    支持：
    - 单播、广播
    - 委托任务并等待结果（RPC 模式）
    - 共识引擎（多 Agent 投票决策）
    - 共享知识库
    """

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.registry: dict[str, AgentInfo] = {}
        self.message_queues: dict[str, asyncio.Queue] = {}
        self.pubsub: dict[str, list[asyncio.Queue]] = {}
        self.pending_replies: dict[str, asyncio.Future] = {}

    async def register(self, agent_id: str, capabilities: list[str]):
        """注册 Agent 到总线"""
        self.registry[agent_id] = AgentInfo(id=agent_id, capabilities=capabilities)
        self.message_queues[agent_id] = asyncio.Queue()
        self.pubsub[agent_id] = []

    async def send(self, msg: A2AMessage) -> str:
        """发送消息给指定接收者"""
        msg_id = msg.id or str(uuid.uuid4())
        for receiver in msg.receivers:
            if receiver in self.message_queues:
                await self.message_queues[receiver].put(msg)
        return msg_id

    async def broadcast(self, msg: A2AMessage):
        """广播消息给所有注册 Agent"""
        for agent_id in self.registry:
            msg_copy = A2AMessage(
                id=msg.id or str(uuid.uuid4()),
                sender=msg.sender,
                receivers=[agent_id],
                action=msg.action,
                payload=msg.payload,
            )
            await self.send(msg_copy)

    async def delegate_and_wait(
        self, task: dict, target: str, timeout: float = 30.0
    ) -> dict:
        """
        委托任务给目标 Agent 并等待结果（RPC 模式）
        """
        msg_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self.pending_replies[msg_id] = future

        msg = A2AMessage(
            id=msg_id,
            sender=self.agent_id,
            receivers=[target],
            action=A2AAction.DELEGATE,
            payload=task,
            expires_at=asyncio.get_event_loop().time() + timeout,
        )

        await self.send(msg)

        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            return {"error": "timeout", "task_id": msg_id}
        finally:
            self.pending_replies.pop(msg_id, None)

    async def receive(self) -> A2AMessage:
        """接收消息（当前 Agent 的队列）"""
        if self.agent_id in self.message_queues:
            return await self.message_queues[self.agent_id].get()
        raise asyncio.CancelledError()

    async def reply(self, original_msg: A2AMessage, payload: dict):
        """回复消息"""
        if original_msg.reply_to and original_msg.reply_to in self.pending_replies:
            self.pending_replies[original_msg.reply_to].set_result(payload)
        else:
            reply_msg = A2AMessage(
                id=str(uuid.uuid4()),
                sender=self.agent_id,
                receivers=[original_msg.sender],
                action=A2AAction.NOTIFY,
                payload=payload,
                reply_to=original_msg.id,
            )
            await self.send(reply_msg)

    async def vote(self, topic: str, options: list[str], voters: list[str]) -> str:
        """
        投票决策 — 收集所有投票者意见，返回胜出选项
        """
        votes: dict[str, int] = {opt: 0 for opt in options}
        vote_results = {}

        for voter in voters:
            # 向每个投票者发起查询
            future = asyncio.create_task(
                self.delegate_and_wait(
                    {"action": "vote", "topic": topic, "options": options},
                    voter,
                    timeout=10.0,
                )
            )
            # Phase 2 实现完整投票逻辑

        return max(votes, key=votes.get) if votes else options[0]
