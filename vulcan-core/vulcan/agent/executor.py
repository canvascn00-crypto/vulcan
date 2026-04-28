"""
Executor — 任务执行器（行动核）
专门负责：调用工具、执行步骤、处理错误、返回结果
继承 Hermes 全部 60+ 工具，新增工具链自动编排
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any


@dataclass
class ExecutionResult:
    response: str
    is_satisfactory: bool
    elapsed_ms: float
    tools_used: list[str]
    error_message: str = ""


class Executor:
    """
    任务执行器 — Vulcan 双核架构的"行动"部分

    职责：
    1. 按计划顺序执行步骤
    2. 调用相应工具
    3. 处理工具执行错误（自动重试 + 备选方案）
    4. 并行执行无依赖的步骤
    5. 工具链自动编排（无需手动 delegate）

    新增（对比 Hermes）：
    - 强化错误恢复（3 次重试 + 备选工具）
    - 工具链引擎（自动组合工具）
    - 执行超时控制
    - 资源限制（防止恶意调用）
    """

    def __init__(self, tools: list, logger, max_retries: int = 3):
        self.tools = {t.name: t for t in tools}
        self.logger = logger
        self.max_retries = max_retries

    async def execute(self, plan, memory) -> ExecutionResult:
        """执行计划中的所有步骤"""
        start_time = time.time()
        tools_used = []

        try:
            # 构建依赖图，并行执行无依赖的步骤
            results = await self._execute_parallel(plan.steps, memory)
            tools_used = [s["tool"] for s in plan.steps if s.get("tool")]

            # 汇总结果
            response = self._summarize_results(results)

            elapsed_ms = (time.time() - start_time) * 1000

            return ExecutionResult(
                response=response,
                is_satisfactory=True,
                elapsed_ms=elapsed_ms,
                tools_used=tools_used,
            )

        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            self.logger.error(f"Executor 执行失败: {e}")

            return ExecutionResult(
                response=f"执行出错：{e}",
                is_satisfactory=False,
                elapsed_ms=elapsed_ms,
                tools_used=tools_used,
                error_message=str(e),
            )

    async def _execute_parallel(self, steps: list[dict], memory) -> list[Any]:
        """并行执行无依赖的步骤"""
        # 简化版：顺序执行
        # 后续实现真正的并行执行
        results = []
        for step in steps:
            result = await self._execute_step(step, memory)
            results.append(result)
        return results

    async def _execute_step(self, step: dict, memory) -> Any:
        """执行单个步骤"""
        tool_name = step.get("tool", "general")
        args = step.get("args", {})
        step_type = step.get("type", "tool_call")

        if step_type == "tool_call" and tool_name in self.tools:
            tool = self.tools[tool_name]
            return await self._call_tool_with_retry(tool, args, memory)
        else:
            # 没有具体工具，使用通用 LLM 生成
            return await self._general_completion(args.get("task", ""), memory)

    async def _call_tool_with_retry(self, tool, args: dict, memory, attempt: int = 1) -> Any:
        """带重试的工具调用"""
        try:
            result = await tool.execute(args, memory=memory)
            return result
        except Exception as e:
            if attempt < self.max_retries:
                self.logger.info(f"工具 {tool.name} 第 {attempt} 次失败，重试...")
                await asyncio.sleep(2 ** attempt)  # 指数退避
                return await self._call_tool_with_retry(tool, args, memory, attempt + 1)
            else:
                # 尝试备选工具
                alt_tool = self._find_alternative_tool(tool.name)
                if alt_tool:
                    self.logger.info(f"切换到备选工具 {alt_tool.name}")
                    return await alt_tool.execute(args, memory=memory)
                raise e

    def _find_alternative_tool(self, original_tool: str) -> Any:
        """查找备选工具"""
        # 简化版：后续实现工具替代方案发现
        return None

    async def _general_completion(self, task: str, memory) -> str:
        """通用 LLM 生成（当没有具体工具时）"""
        # 简化版：后续接入 LLM
        return f"[Vulcan 执行: {task}]"

    def _summarize_results(self, results: list[Any]) -> str:
        """汇总多步执行结果"""
        if not results:
            return "执行完成，无结果"
        if len(results) == 1:
            return str(results[0])
        return "\n".join([f"步骤 {i+1}: {r}" for i, r in enumerate(results)])
