"""
VulcanToolRegistry — 动态工具注册表
继承 Vulcan 60+ built-in tools，新增工具链编排、速率限制
Self-discovery from/ 目录自动发现并接入
"""

import asyncio
import importlib.util
import logging
import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class ToolInfo:
    name: str
    description: str
    toolset: str
    schema: dict
    handler: Callable
    emoji: str = "🔧"
    check_fn: Optional[Callable] = None
    legacy_path: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "toolset": self.toolset,
            "schema": self.schema,
            "emoji": self.emoji,
        }


@dataclass
class ToolResult:
    success: bool
    result: Any = None
    error: str = None
    duration_ms: float = 0

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "result": self.result,
            "error": self.error,
            "duration_ms": self.duration_ms,
        }


class VulcanToolRegistry:
    """
    Vulcan 工具注册表。

    Self-discovery from legacy tools directory。
    同时支持直接注册 Python 函数作为工具。
    """

    def __init__(self, legacy_tools_path: str = None):
        self._tools: dict[str, ToolInfo] = {}
        self._handlers: dict[str, Callable] = {}
        self._legacy_path = legacy_tools_path
        self._initialized = False
        self._lock = asyncio.Lock()

        # Rate limiter (simple token bucket)
        self._rate_limits: dict[str, list[float]] = {}

    async def initialize(self):
        """初始化：Load legacy 工具。"""
        if self._initialized:
            return
        async with self._lock:
            if self._initialized:
                return
            await self._discover_legacy_tools()
            self._initialized = True
            logger.info(f"VulcanToolRegistry initialized with {len(self._tools)} tools")

    async def _discover_legacy_tools(self):
        """Self-discovery from legacy tools directory。"""
        if not self._legacy_path or not Path(self._legacy_path).exists():
            logger.warning(f"Legacy tools path not found: {self._legacy_path}")
            return

        tools_dir = Path(self._legacy_path)
        sys.path.insert(0, str(tools_dir.parent))

        for tool_file in sorted(tools_dir.glob("*_tool.py")):
            if tool_file.name in ("__init__.py", "registry.py"):
                continue
            try:
                await self._load_legacy_tool(tool_file)
            except Exception as e:
                logger.debug(f"Could not load {tool_file.name}: {e}")

        sys.path.pop(0)

    async def _load_legacy_tool(self, tool_file: Path):
        """加载单个 legacy tool file。"""
        module_name = tool_file.stem

        # Import module
        spec = importlib.util.spec_from_file_location(module_name, tool_file)
        if not spec or not spec.loader:
            return
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module

        # Make legacy registry available
        from types import ModuleType
        legacy_registry = ModuleType("registry")
        registered_tools: list = []

        def register(name, toolset, schema, handler, check_fn=None, emoji="🔧", max_result_size_chars=None):
            registered_tools.append({
                "name": name,
                "toolset": toolset,
                "schema": schema,
                "handler": handler,
                "check_fn": check_fn,
                "emoji": emoji,
            })

        legacy_registry.register = register
        sys.modules["tools.registry"] = legacy_registry

        try:
            spec.loader.exec_module(module)
        except Exception as e:
            logger.debug(f"Exec {module_name} failed: {e}")
            return

        # Register found tools
        for t in registered_tools:
            info = ToolInfo(
                name=t["name"],
                description=t["schema"].get("description", ""),
                toolset=t["toolset"],
                schema=t["schema"],
                handler=t["handler"],
                emoji=t.get("emoji", "🔧"),
                check_fn=t.get("check_fn"),
                legacy_path=str(tool_file),
            )
            self._tools[info.name] = info
            self._handlers[info.name] = t["handler"]

    def register(
        self,
        name: str,
        description: str,
        schema: dict,
        handler: Callable,
        toolset: str = "custom",
        emoji: str = "🔧",
    ):
        """直接注册 Python 函数为 Vulcan 工具。"""
        info = ToolInfo(
            name=name,
            description=description,
            toolset=toolset,
            schema=schema,
            handler=handler,
            emoji=emoji,
        )
        self._tools[name] = info
        self._handlers[name] = handler

    async def call(self, name: str, arguments: dict) -> ToolResult:
        """调用工具（含速率限制、超时）。"""
        await self.initialize()

        if name not in self._handlers:
            return ToolResult(success=False, error=f"Unknown tool: {name}")

        # Rate limit check
        if not await self._check_rate_limit(name):
            return ToolResult(success=False, error=f"Rate limit exceeded for: {name}")

        handler = self._handlers[name]
        start = time.time()

        try:
            # Run sync handlers in thread pool
            if asyncio.iscoroutinefunction(handler):
                result = await asyncio.wait_for(handler(**arguments), timeout=120)
            else:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: handler(**arguments)
                )
            duration = (time.time() - start) * 1000
            return ToolResult(success=True, result=result, duration_ms=duration)
        except asyncio.TimeoutError:
            return ToolResult(success=False, error="Tool call timed out", duration_ms=120000)
        except Exception as e:
            duration = (time.time() - start) * 1000
            return ToolResult(success=False, error=str(e), duration_ms=duration)

    async def _check_rate_limit(self, name: str, max_calls: int = 30, window: float = 60.0) -> bool:
        """简单滑动窗口速率限制。"""
        now = time.time()
        if name not in self._rate_limits:
            self._rate_limits[name] = []
        # Remove old entries
        self._rate_limits[name] = [
            t for t in self._rate_limits[name] if now - t < window
        ]
        if len(self._rate_limits[name]) >= max_calls:
            return False
        self._rate_limits[name].append(now)
        return True

    def list_tools(self, toolset: str = None) -> list[dict]:
        """列出工具（可选按 toolset 过滤）。"""
        tools = self._tools.values()
        if toolset:
            tools = [t for t in tools if t.toolset == toolset]
        return [t.to_dict() for t in tools]

    def get_tool(self, name: str) -> Optional[ToolInfo]:
        return self._tools.get(name)

    def get_toolsets(self) -> list[str]:
        """列出所有已知的 toolset。"""
        return sorted(set(t.toolset for t in self._tools.values()))

    def tool_schemas(self, toolset: str = None) -> list[dict]:
        """返回 OpenAI 格式的工具 schema。"""
        schemas = []
        for tool in self._tools.values():
            if toolset and tool.toolset != toolset:
                continue
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.schema,
                },
            })
        return schemas
