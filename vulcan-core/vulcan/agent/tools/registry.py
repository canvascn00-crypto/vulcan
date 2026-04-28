"""
ToolRegistry — 动态工具注册表
继承 Hermes 全部 60+ 工具，新增工具链编排、API 自动发现、速率限制
"""

import asyncio
from typing import Any, Optional
from dataclasses import dataclass, field


@dataclass
class ToolInfo:
    name: str
    description: str
    category: str
    rate_limit: Optional[int] = None  # 每分钟调用上限
    requires_auth: bool = False
    is_sandboxed: bool = True


class BaseTool:
    """工具基类 — 所有 Vulcan 工具继承此基类"""

    name: str = "base_tool"
    description: str = ""
    category: str = "general"

    async def execute(self, args: dict, memory=None) -> Any:
        """执行工具逻辑，子类必须实现"""
        raise NotImplementedError

    def get_info(self) -> ToolInfo:
        return ToolInfo(
            name=self.name,
            description=self.description,
            category=self.category,
        )


class ToolRegistry:
    """
    动态工具注册表

    对比 Hermes：
    - Hermes: 固定工具列表，无动态注册
    - Vulcan: 动态注册表 + 工具链编排 + 速率限制 + 沙箱
    """

    _tools: dict[str, BaseTool] = {}
    _rate_limiter: dict[str, list[float]] = {}

    @classmethod
    def register(cls, tool: BaseTool):
        """注册工具"""
        cls._tools[tool.name] = tool

    @classmethod
    def all(cls) -> list[BaseTool]:
        """获取所有已注册工具"""
        return list(cls._tools.values())

    @classmethod
    def get(cls, name: str) -> Optional[BaseTool]:
        """获取指定工具"""
        return cls._tools.get(name)

    @classmethod
    def list_by_category(cls, category: str) -> list[BaseTool]:
        """按分类列出工具"""
        return [t for t in cls._tools.values() if t.category == category]

    @classmethod
    async def execute_with_rate_limit(cls, tool_name: str, args: dict, memory=None) -> Any:
        """带速率限制的工具执行"""
        tool = cls._tools.get(tool_name)
        if not tool:
            raise ValueError(f"Tool not found: {tool_name}")

        info = tool.get_info()
        if info.rate_limit:
            await cls._check_rate_limit(tool_name, info.rate_limit)

        return await tool.execute(args, memory=memory)

    @classmethod
    async def _check_rate_limit(cls, tool_name: str, limit: int):
        """检查速率限制"""
        now = asyncio.get_event_loop().time()
        if tool_name not in cls._rate_limiter:
            cls._rate_limiter[tool_name] = []

        # 清理超过 60 秒的记录
        cls._rate_limiter[tool_name] = [
            t for t in cls._rate_limiter[tool_name] if now - t < 60
        ]

        if len(cls._rate_limiter[tool_name]) >= limit:
            wait_time = 60 - (now - cls._rate_limiter[tool_name][0])
            if wait_time > 0:
                await asyncio.sleep(wait_time)

        cls._rate_limiter[tool_name].append(now)

    @classmethod
    def discover_from_openapi(cls, openapi_schema: dict):
        """从 OpenAPI Schema 自动发现并注册工具"""
        # Phase 2 实现
        pass


# ===============================
# 内置基础工具（继承 Hermes）
# ===============================

class GeneralTool(BaseTool):
    """通用工具 — 处理没有特定工具匹配的任务"""
    name = "general"
    description = "通用工具，用于没有特定工具匹配的任务"
    category = "core"

    async def execute(self, args: dict, memory=None) -> str:
        task = args.get("task", "")
        return f"[Vulcan General] {task}"


class TerminalTool(BaseTool):
    """终端工具 — 执行 Shell 命令"""
    name = "terminal"
    description = "在服务器上执行 Shell 命令"
    category = "system"
    rate_limit = 60

    async def execute(self, args: dict, memory=None) -> str:
        command = args.get("command", "")
        # Phase 2 实现真正的终端执行
        return f"[Terminal] {command}"


class BrowserTool(BaseTool):
    """浏览器工具 — 网页抓取和交互"""
    name = "browser"
    description = "使用浏览器访问网页、填写表单、点击元素"
    category = "web"

    async def execute(self, args: dict, memory=None) -> str:
        url = args.get("url", "")
        action = args.get("action", "snapshot")
        return f"[Browser] {action} {url}"


# 注册内置工具
_tool_registry_initialized = False

def _init_registry():
    global _tool_registry_initialized
    if _tool_registry_initialized:
        return
    ToolRegistry.register(GeneralTool())
    ToolRegistry.register(TerminalTool())
    ToolRegistry.register(BrowserTool())
    _tool_registry_initialized = True

_init_registry()
