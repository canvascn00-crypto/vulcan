"""
Planner — 任务规划器（思考核）
专门负责：理解任务意图、分解步骤、选择模型、验证结果
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional
from vulcan.agent.tools.registry import ToolRegistry


@dataclass
class Plan:
    steps: list[dict]
    model_selected: str
    intent: str
    context_window: int = 0


class Planner:
    """
    任务规划器 — Vulcan 双核架构的"思考"部分

    职责：
    1. NLU — 理解用户意图
    2. 任务分解 (Task Decomposition) — 将复杂任务拆成可执行步骤
    3. 模型路由 (Model Routing) — 根据任务类型选择最优模型
    4. 验证结果 (Verification) — 检查 Executor 返回的结果是否满足
    5. Reflexion — 失败时反思原因，生成新计划
    """

    def __init__(self, model: str, provider: str, logger):
        self.model = model
        self.provider = provider
        self.logger = logger
        self.task_decomposer = TaskDecomposer()

    async def create_plan(self, task: str, memory) -> Plan:
        """创建执行计划"""
        # 1. 检索相关记忆作为上下文
        context = await memory.retrieve(task, top_k=10)

        # 2. NLU 理解意图
        intent = await self._nlu(task, context)

        # 3. 任务分解
        steps = await self.task_decomposer.decompose(task, context)

        # 4. 模型路由
        model_selected = await self._route_model(steps)

        return Plan(
            steps=steps,
            model_selected=model_selected,
            intent=intent,
        )

    async def _nlu(self, task: str, context) -> str:
        """自然语言理解 — 判断用户意图"""
        # 简化版：后续接入 LLM 做 NLU
        return "general_conversation"

    async def _route_model(self, steps: list[dict]) -> str:
        """智能模型路由 — 根据任务类型选择最优模型"""
        # 简化版：后续实现完整的模型路由逻辑
        # 目前直接返回默认模型
        return f"{self.provider}/{self.model}"

    async def verify(self, result, memory) -> bool:
        """验证结果是否满足用户意图"""
        # 简化版：后续实现完整的验证逻辑
        return result.is_satisfactory

    async def reflexion(self, original_plan: Plan, failed_result, memory) -> Plan:
        """反思失败原因，生成改进计划"""
        self.logger.info("Reflexion: 分析失败原因")

        # 提取失败原因
        failure_reason = failed_result.error_message or "执行结果不满足"

        # 基于失败原因生成新计划（减少步骤或更换方法）
        new_steps = await self.task_decomposer.decompose_with_constraints(
            task=original_plan.steps[0].get("description", ""),
            constraints=failure_reason,
        )

        return Plan(
            steps=new_steps,
            model_selected=original_plan.model_selected,
            intent=original_plan.intent,
        )


class TaskDecomposer:
    """任务分解引擎 — 自动将复杂任务拆解为可执行步骤"""

    async def decompose(self, task: str, context) -> list[dict]:
        """
        将任务分解为步骤列表

        每个步骤格式：
        {
            "id": "step_1",
            "type": "tool_call" | "reasoning" | "delegate",
            "description": str,
            "tool": Optional[str],
            "args": Optional[dict],
            "depends_on": Optional[list[str]],  # 依赖的前置步骤
        }
        """
        # 简化版：后续接入 LLM 做智能分解
        # 目前返回单步计划
        return [
            {
                "id": "step_1",
                "type": "tool_call",
                "description": task,
                "tool": "general",
                "args": {"task": task},
                "depends_on": [],
            }
        ]

    async def decompose_with_constraints(
        self, task: str, constraints: str
    ) -> list[dict]:
        """带约束的分解（Reflexion 失败重试时用）"""
        # 简化版：减少步骤或简化任务
        return [
            {
                "id": "step_1",
                "type": "tool_call",
                "description": f"简化任务：{task}（约束：{constraints}）",
                "tool": "general",
                "args": {"task": task},
                "depends_on": [],
            }
        ]
