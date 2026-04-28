"""
VulcanAgent — 双核统一入口
Planner（思考） + Executor（执行）协作处理任务
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from vulcan.agent.memory.unified_memory import UnifiedMemory
from vulcan.agent.tools.registry import VulcanToolRegistry
from vulcan.agent.planner import Planner, Plan
from vulcan.agent.executor import Executor, ExecutionResult
from vulcan.agent.task_queue import Task, TaskQueue, TaskStatus
from vulcan.agent.observability.logger import VulcanLogger, LogLevel


@dataclass
class AgentConfig:
    model: str = "claude-sonnet-4"
    provider: str = "anthropic"
    base_url: str = None
    api_key: str = None
    max_iterations: int = 50
    max_steps_per_task: int = 20
    tool_timeout: float = 120.0
    planner_temperature: float = 0.3
    executor_temperature: float = 0.0
    enable_observability: bool = True
    enable_memory: bool = True
    enable_self_evolver: bool = False
    trace_id: str = None

    def __post_init__(self):
        if not self.trace_id:
            self.trace_id = str(uuid.uuid4())


class VulcanAgent:
    """
    双核 Agent：Planner 负责思考规划，Executor 负责执行工具。
    两者通过 TaskQueue 异步协作，支持步骤级反馈和中断。
    """

    def __init__(self, config: AgentConfig = None):
        self.config = config or AgentConfig()
        self.trace_id = self.config.trace_id

        # Logger
        self.logger = VulcanLogger(
            session_id="VulcanAgent",
            log_level="INFO" if self.config.enable_observability else "WARNING",
        )

        # Core components
        self.memory = UnifiedMemory() if self.config.enable_memory else None
        self.tools = VulcanToolRegistry(hermes_tools_path="/root/.hermes/hermes-agent/tools")
        self.task_queue = TaskQueue()

        # Planner + Executor
        self.planner = Planner(
            model=self.config.model,
            provider=self.config.provider,
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            temperature=self.config.planner_temperature,
            logger=self.logger,
        )
        self.executor = Executor(
            tools=self.tools,
            timeout=self.config.tool_timeout,
            logger=self.logger,
        )

        # Runtime state
        self._running_tasks: dict[str, asyncio.Task] = {}
        self._shutdown = False

        self.logger.info("VulcanAgent initialized", extra={"config": self.config.__dict__})

    async def run_async(self, goal: str, session_id: str = None) -> dict:
        """
        异步运行一个任务，返回完整结果。
        """
        task_id = str(uuid.uuid4())[:12]

        # Create task
        task = Task(
            id=task_id,
            goal=goal,
            priority=0,
            on_step_done=self._on_step_done,
        )
        task.metadata["session_id"] = session_id

        self.logger.info("task_started", extra={"task_id": task_id, "goal": goal})

        try:
            # Enqueue and process
            await self.task_queue.enqueue(task)
            result = await self._process_task(task)

            self.logger.info(
                "task_completed",
                extra={"task_id": task_id, "result": str(result)[:200]},
            )
            return {
                "task_id": task_id,
                "status": "done",
                "result": result,
                "steps": [s.to_dict() for s in task.steps],
                "trace_id": self.trace_id,
            }

        except Exception as e:
            self.logger.error("task_failed", extra={"task_id": task_id, "error": str(e)})
            return {
                "task_id": task_id,
                "status": "failed",
                "error": str(e),
                "steps": [s.to_dict() for s in task.steps],
                "trace_id": self.trace_id,
            }

    def run(self, goal: str, session_id: str = None) -> dict:
        """同步入口（兼容旧代码）。"""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're inside an async context, can't use run_until_complete
                # Return a coroutine that the caller should await
                raise RuntimeError(
                    "Use run_async() when already inside an async context"
                )
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.run_async(goal, session_id))

    async def _process_task(self, task: Task) -> Any:
        """处理单个任务：Planner 生成计划 → Executor 执行 → 步骤反馈 → 完成。"""
        max_steps = self.config.max_steps_per_task
        iteration = 0

        while task.current_step < max_steps and not self._shutdown:
            iteration += 1

            # Planner: decide next step(s)
            context = await self._build_context(task)
            plan: Plan = await self.planner.plan(
                goal=task.goal,
                context=context,
                step_number=task.current_step,
            )

            if plan.done:
                # Task concluded
                return plan.final_result or plan.summary

            if plan.steps:
                for step_name, step_action in plan.steps:
                    step = task.add_step(step_name)
                    step.status = "running"  # type: ignore
                    step.started_at = time.time()

                    try:
                        result = await self.executor.execute(step_action)
                        await self.task_queue.mark_step_done(task.id, step.id, result=result)
                    except Exception as e:
                        await self.task_queue.mark_step_done(task.id, step.id, error=str(e))
                        if plan.on_error == "stop":
                            break
            else:
                # No more steps, done
                break

        return plan.final_result or f"Completed {iteration} iterations"

    async def _build_context(self, task: Task) -> dict:
        """构建 Planner 上下文：记忆 + 历史步骤 + 工具列表。"""
        ctx = {
            "task_id": task.id,
            "current_step": task.current_step,
            "completed_steps": [s.to_dict() for s in task.steps if s.result],
            "available_tools": self.tools.list_tools(),
        }
        if self.memory:
            ctx["memory"] = await self.memory.retrieve(task.goal, limit=5)
        return ctx

    async def _on_step_done(self, task: Task, step):
        """步骤级反馈：Planner 可以根据结果调整后续计划。"""
        if step.error and self.config.enable_self_evolver:
            # Self-evolver would analyze failure here
            self.logger.warning(
                "step_failed",
                extra={"task_id": task.id, "step": step.name, "error": step.error},
            )

    async def chat(self, message: str, session_id: str = None) -> str:
        """简单对话接口。"""
        result = await self.run_async(message, session_id=session_id)
        return result.get("result", result.get("error", "No result"))

    async def shutdown(self):
        """优雅关闭。"""
        self._shutdown = True
        self.logger.info("VulcanAgent shutting down")
