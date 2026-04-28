"""
Vulcan Agent — 双核架构：Planner + Executor
继承自 Hermes Agent AIAgent，完全兼容并全面升级
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Optional

from vulcan.agent.memory.unified_memory import UnifiedMemory
from vulcan.agent.planner import Planner
from vulcan.agent.executor import Executor
from vulcan.agent.tools.registry import ToolRegistry
from vulcan.agent.a2a.bus import A2ABus
from vulcan.agent.observability.logger import VulcanLogger


@dataclass
class AgentConfig:
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"
    session_id: Optional[str] = None
    hermes_home: str = "~/.vulcan"
    max_retries: int = 3
    enable_reflexion: bool = True


class VulcanAgent:
    """
    双核 Agent 架构：

    - Planner:  负责理解任务、分解步骤、制定计划、验证结果
    - Executor: 负责调用工具、执行步骤、处理错误、返回结果

    对比 Hermes 单 AIAgent 循环：双核让复杂任务的拆解和执行完全分离，
    互不干扰，效率大幅提升。

    新增功能（对比 Hermes）：
    - Chain-of-Thought 推理内置
    - ReAct + Reflexion 自主错误恢复
    - 智能模型路由
    - 自动任务分解
    - 三层统一记忆
    - A2A 多 Agent 协作
    - 完整可观测性
    """

    def __init__(self, config: Optional[AgentConfig] = None, **kwargs):
        if config is None:
            config = AgentConfig(**kwargs)

        self.config = config
        self.session_id = config.session_id or str(uuid.uuid4())

        # 初始化核心组件
        self.logger = VulcanLogger(session_id=self.session_id)

        # Planner: 思考核
        self.planner = Planner(
            model=config.model,
            provider=config.provider,
            logger=self.logger,
        )

        # Executor: 行动核
        self.executor = Executor(
            tools=ToolRegistry.all(),
            logger=self.logger,
            max_retries=config.max_retries,
        )

        # 统一记忆层（三层：瞬时 + 短期 + 长期）
        self.memory = UnifiedMemory(
            hermes_home=config.hermes_home,
            session_id=self.session_id,
        )

        # A2A 消息总线（多 Agent 协作）
        self.a2a = A2ABus(agent_id=self.session_id)

        # 自我进化引擎
        self.self_evolver = None  # 延迟加载，Phase 3 启用

        self.logger.info("VulcanAgent 初始化完成", {
            "session_id": self.session_id,
            "model": f"{config.provider}/{config.model}",
        })

    async def run(self, user_message: str) -> str:
        """
        主循环：
        1. Planner 理解并拆解任务
        2. Executor 按计划执行
        3. Planner 验证结果（Reflexion 失败重试）
        4. 更新记忆
        """
        self.logger.start_trace(user_message)

        try:
            # Step 1: Planner 创建计划
            plan = await self.planner.create_plan(
                task=user_message,
                memory=self.memory,
            )
            self.logger.info("计划创建完成", {
                "steps": len(plan.steps),
                "model_selected": plan.model_selected,
            })

            # Step 2: Executor 执行计划
            result = await self.executor.execute(
                plan=plan,
                memory=self.memory,
            )

            # Step 3: Planner 验证结果（Reflexion）
            if self.config.enable_reflexion and not result.is_satisfactory:
                self.logger.info("结果不满足，开始 Reflexion")
                new_plan = await self.planner.reflexion(
                    original_plan=plan,
                    failed_result=result,
                    memory=self.memory,
                )
                result = await self.executor.execute(
                    plan=new_plan,
                    memory=self.memory,
                )

            # Step 4: 更新记忆
            await self.memory.store_session(
                user_message=user_message,
                agent_response=result.response,
                metadata={
                    "plan_steps": len(plan.steps),
                    "execution_time": result.elapsed_ms,
                }
            )

            self.logger.end_trace(success=True)
            return result.response

        except Exception as e:
            self.logger.error(f"Agent 执行异常: {e}")
            self.logger.end_trace(success=False)
            return f"抱歉，发生了错误：{e}"

    async def run_with_tools(self, user_message: str) -> str:
        """带工具调用的完整 Agent 循环（兼容 Hermes 原有接口）"""
        return await self.run(user_message)

    def get_session_id(self) -> str:
        return self.session_id

    async def shutdown(self):
        """优雅关闭"""
        self.logger.info("VulcanAgent 关闭")
        await self.memory.flush()
