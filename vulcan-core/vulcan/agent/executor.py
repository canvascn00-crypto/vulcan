"""
Executor — 任务执行器（行动核）
负责：调用工具、执行步骤、处理错误、返回结果
继承 Hermes 全部 60+ 工具，新增工具链自动编排
"""

import asyncio
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Optional

from vulcan.agent.tools.registry import VulcanToolRegistry
from vulcan.agent.observability.logger import VulcanLogger


@dataclass
class ExecutionResult:
    """单次工具执行结果。"""
    tool_name: str
    args: dict
    success: bool
    result: Any = None
    error: str = None
    duration_ms: float = 0

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "args": self.args,
            "success": self.success,
            "result": str(self.result)[:500] if self.result else None,
            "error": self.error,
            "duration_ms": round(self.duration_ms, 2),
        }


class Executor:
    """
    执行器：解析 Plan 中的 action，调用对应的工具。

    支持三种 action 格式：
    1. tool_name{arg1: value1}  — JSON 格式
    2. tool_name(arg1=value1)  — Python call 格式
    3. 直接函数调用（内部链）
    """

    def __init__(
        self,
        tools: VulcanToolRegistry,
        timeout: float = 120.0,
        logger: VulcanLogger = None,
    ):
        self.tools = tools
        self.timeout = timeout
        self.logger = logger or VulcanLogger(session_id="Executor")

    async def execute(self, action: str) -> Any:
        """
        执行一个 action 字符串，返回结果。

        action 格式示例：
        - 'web_search{"query": "python latest version"}'
        - 'terminal{"command": "ls -la"}'
        - 'browser_navigate{"url": "https://example.com"}'
        """
        tool_name, args = self._parse_action(action)
        if not tool_name:
            return ExecutionResult(
                tool_name="unknown",
                args={},
                success=False,
                error=f"Could not parse action: {action}",
            )

        # Call tool through registry
        result = await self.tools.call(tool_name, args)

        exec_result = ExecutionResult(
            tool_name=tool_name,
            args=args,
            success=result.success,
            result=result.result,
            error=result.error,
            duration_ms=result.duration_ms,
        )

        self.logger.info(
            "tool_executed",
            extra=exec_result.to_dict(),
        )

        if not result.success:
            self.logger.warning(
                "tool_failed",
                extra={"tool": tool_name, "error": result.error},
            )

        return exec_result

    def _parse_action(self, action: str) -> tuple[Optional[str], dict]:
        """
        解析 action 字符串，返回 (tool_name, args_dict)。

        支持格式：
        - tool_name{...}      → JSON
        - tool_name(...)      → Python call
        """
        # Try JSON format: tool_name{...}
        match = re.match(r'^(\w+)\s*(\{.*\})?$', action.strip(), re.DOTALL)
        if not match:
            return None, {}

        tool_name = match.group(1)
        args_str = match.group(2) or "{}"

        # Clean up JSON
        args_str = args_str.strip()
        if args_str.startswith("{") and args_str.endswith("}"):
            try:
                args = json.loads(args_str)
                return tool_name, args
            except json.JSONDecodeError:
                pass

        # Try Python call format: tool_name(...)
        match2 = re.match(r'^(\w+)\s*\((.*)?\)$', action.strip(), re.DOTALL)
        if match2:
            tool_name = match2.group(1)
            args_str2 = match2.group(2) or ""
            if args_str2:
                args = self._parse_python_args(args_str2)
                return tool_name, args

        return tool_name, {}

    def _parse_python_args(self, args_str: str) -> dict:
        """
        解析 Python 函数参数格式: key=value, key2="string", key3=123
        """
        args = {}
        # Simple regex for key=value pairs
        pairs = re.findall(r'(\w+)\s*=\s*("([^"]*)"|\'([^\']*)\'|(\d+\.?\d*))', args_str)
        for name, _, dquote, squote, number in pairs:
            if dquote:
                args[name] = dquote
            elif squote:
                args[name] = squote
            elif number:
                args[name] = float(number) if '.' in number else int(number)
        return args

    async def execute_chain(self, actions: list[str]) -> list[ExecutionResult]:
        """
        顺序执行多个 action，返回所有结果。
        遇到失败默认停止（除非 on_error="skip"）。
        """
        results = []
        for action in actions:
            result: ExecutionResult = await self.execute(action)
            results.append(result)
            if not result.success:
                break
        return results
