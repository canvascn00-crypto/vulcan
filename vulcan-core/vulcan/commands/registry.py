"""
Vulcan 内置全局指令系统 (Built-in Global Commands)

每个指令包含：
  - name: 指令名称（不带 /）
  - description: 功能描述
  - syntax: 使用语法示例
  - category: 分类
  - triggers: 触发关键词列表
  - handler: 处理函数引用
  - requires_auth: 是否需要认证
  - channel_scope: 可用渠道 ["*"] 表示全部

用法：用户在任何渠道发送 /<command> 或触发对应关键词，系统自动识别并执行。
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger("Vulcan.Commands")


class CommandCategory(str, Enum):
    SYSTEM = "system"
    AI = "ai"
    SEARCH = "search"
    MEDIA = "media"
    CODE = "code"
    AGENT = "agent"
    SKILL = "skill"
    MEMORY = "memory"
    UTILITY = "utility"


@dataclass
class BuiltinCommand:
    name: str
    description: str
    syntax: str
    category: CommandCategory
    triggers: list[str] = field(default_factory=list)
    handler: Optional[Callable[..., Any]] = None
    requires_auth: bool = False
    channel_scope: list[str] = field(default_factory=lambda: ["*"])
    metadata: dict = field(default_factory=dict)

    def match(self, text: str) -> bool:
        """检查文本是否匹配此指令"""
        text_lower = text.lower().strip()
        # 精确匹配指令名
        if text_lower == f"/{self.name.lower()}":
            return True
        # 触发词匹配
        for trigger in self.triggers:
            if trigger.lower() in text_lower:
                return True
        return False

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "syntax": self.syntax,
            "category": self.category.value,
            "triggers": self.triggers,
            "requires_auth": self.requires_auth,
            "channel_scope": self.channel_scope,
        }


class CommandRegistry:
    """全局指令注册表"""

    def __init__(self):
        self._commands: dict[str, BuiltinCommand] = {}
        self._history: list[dict] = []
        self._register_builtins()

    def _register_builtins(self) -> None:
        """注册所有内置指令"""
        builtins = [
            # ── System ──────────────────────────────────────────────────────────
            BuiltinCommand(
                name="help",
                description="显示所有可用指令和帮助信息",
                syntax="/help [command]",
                category=CommandCategory.SYSTEM,
                triggers=["帮助", "help", "指令列表", "命令列表"],
            ),
            BuiltinCommand(
                name="status",
                description="查看 Vulcan 系统状态、内存、模型连接",
                syntax="/status",
                category=CommandCategory.SYSTEM,
                triggers=["状态", "status", "系统状态", "运行状态"],
            ),
            BuiltinCommand(
                name="version",
                description="显示 Vulcan 版本和构建信息",
                syntax="/version",
                category=CommandCategory.SYSTEM,
                triggers=["版本", "version", "vulcan版本"],
            ),
            BuiltinCommand(
                name="clear",
                description="清除当前会话上下文",
                syntax="/clear",
                category=CommandCategory.SYSTEM,
                triggers=["清除会话", "clear", "清空"],
            ),
            BuiltinCommand(
                name="reset",
                description="重置所有状态和会话",
                syntax="/reset",
                category=CommandCategory.SYSTEM,
                triggers=["重置", "reset", "重启"],
            ),

            # ── AI / 对话 ───────────────────────────────────────────────────────
            BuiltinCommand(
                name="ask",
                description="向 AI 提问（不进入对话历史）",
                syntax="/ask <问题>",
                category=CommandCategory.AI,
                triggers=["问我", "ask"],
            ),
            BuiltinCommand(
                name="retry",
                description="重试上一次 AI 回复",
                syntax="/retry",
                category=CommandCategory.AI,
                triggers=["重试", "retry", "再试一次"],
            ),
            BuiltinCommand(
                name="summarize",
                description="对当前对话生成摘要",
                syntax="/summarize",
                category=CommandCategory.AI,
                triggers=["摘要", "summarize", "总结对话"],
            ),
            BuiltinCommand(
                name="model",
                description="切换当前使用的模型",
                syntax="/model <模型名>",
                category=CommandCategory.AI,
                triggers=["切换模型", "model", "使用模型"],
            ),
            BuiltinCommand(
                name="temperature",
                description="设置模型 temperature",
                syntax="/temperature <0.0-2.0>",
                category=CommandCategory.AI,
                triggers=["温度", "temperature", "创意度"],
            ),

            # ── 搜索 ────────────────────────────────────────────────────────────
            BuiltinCommand(
                name="search",
                description="执行网络搜索",
                syntax="/search <查询内容>",
                category=CommandCategory.SEARCH,
                triggers=["搜索", "search", "查找", "搜一下"],
            ),
            BuiltinCommand(
                name="lookup",
                description="快速查询 Wikipedia",
                syntax="/lookup <词条>",
                category=CommandCategory.SEARCH,
                triggers=["查询", "lookup", "百科"],
            ),

            # ── 媒体 ────────────────────────────────────────────────────────────
            BuiltinCommand(
                name="image",
                description="根据文字描述生成图片",
                syntax="/image <图片描述>",
                category=CommandCategory.MEDIA,
                triggers=["生成图片", "画图", "image", "生成图像", "绘图"],
            ),
            BuiltinCommand(
                name="tts",
                description="文字转语音",
                syntax="/tts <文字内容>",
                category=CommandCategory.MEDIA,
                triggers=["tts", "文字转语音", "语音合成", "读出来"],
            ),
            BuiltinCommand(
                name="transcribe",
                description="语音转文字（需上传音频）",
                syntax="/transcribe",
                category=CommandCategory.MEDIA,
                triggers=["转写", "transcribe", "语音转文字"],
            ),

            # ── 代码 ────────────────────────────────────────────────────────────
            BuiltinCommand(
                name="code",
                description="执行代码片段",
                syntax="/code <语言> <代码>",
                category=CommandCategory.CODE,
                triggers=["执行代码", "run code", "代码执行"],
            ),
            BuiltinCommand(
                name="eval",
                description="Python 表达式求值",
                syntax="/eval <表达式>",
                category=CommandCategory.CODE,
                triggers=["求值", "eval", "计算"],
            ),
            BuiltinCommand(
                name="script",
                description="运行脚本文件",
                syntax="/script <脚本路径>",
                category=CommandCategory.CODE,
                triggers=["脚本", "script", "运行脚本"],
            ),

            # ── Agent ───────────────────────────────────────────────────────────
            BuiltinCommand(
                name="agent",
                description="调度指定 Agent 执行任务",
                syntax="/agent <agent名> <任务描述>",
                category=CommandCategory.AGENT,
                triggers=["agent", "智能体", "调度agent"],
            ),
            BuiltinCommand(
                name="agents",
                description="列出所有可用 Agent",
                syntax="/agents",
                category=CommandCategory.AGENT,
                triggers=["列出agents", "agents列表"],
            ),
            BuiltinCommand(
                name="expert",
                description="查询匹配的 AI 专家并执行任务",
                syntax="/expert <任务描述>",
                category=CommandCategory.AGENT,
                triggers=["专家", "expert", "咨询专家"],
            ),

            # ── Skill ───────────────────────────────────────────────────────────
            BuiltinCommand(
                name="skill",
                description="技能管理：查看、安装、调用技能",
                syntax="/skill [list|install|invoke] [参数]",
                category=CommandCategory.SKILL,
                triggers=["技能", "skill"],
            ),
            BuiltinCommand(
                name="skills",
                description="列出所有已安装技能",
                syntax="/skills",
                category=CommandCategory.SKILL,
                triggers=["技能列表", "skills list"],
            ),

            # ── Memory ──────────────────────────────────────────────────────────
            BuiltinCommand(
                name="memory",
                description="记忆操作：查看、搜索、写入记忆",
                syntax="/memory [search|write|recall] [参数]",
                category=CommandCategory.MEMORY,
                triggers=["记忆", "memory"],
            ),
            BuiltinCommand(
                name="remember",
                description="将信息写入长期记忆",
                syntax="/remember <要记住的内容>",
                category=CommandCategory.MEMORY,
                triggers=["记住", "remember", "记下来"],
            ),
            BuiltinCommand(
                name="forget",
                description="从记忆中删除指定内容",
                syntax="/forget <内容关键词>",
                category=CommandCategory.MEMORY,
                triggers=["忘记", "forget", "删除记忆"],
            ),

            # ── Utility ─────────────────────────────────────────────────────────
            BuiltinCommand(
                name="echo",
                description="回显输入内容（调试用）",
                syntax="/echo <内容>",
                category=CommandCategory.UTILITY,
                triggers=["echo", "回显", "打印"],
            ),
            BuiltinCommand(
                name="ping",
                description="测试系统响应",
                syntax="/ping",
                category=CommandCategory.UTILITY,
                triggers=["ping", "心跳", "存活检测"],
            ),
            BuiltinCommand(
                name="time",
                description="显示当前时间",
                syntax="/time",
                category=CommandCategory.UTILITY,
                triggers=["时间", "time", "现在几点"],
            ),
            BuiltinCommand(
                name="export",
                description="导出对话/数据为文件",
                syntax="/export [json|md|txt]",
                category=CommandCategory.UTILITY,
                triggers=["导出", "export", "下载"],
            ),
            BuiltinCommand(
                name="config",
                description="查看和修改配置",
                syntax="/config [get|set] <key> [value]",
                category=CommandCategory.UTILITY,
                triggers=["配置", "config", "设置参数"],
            ),
            BuiltinCommand(
                name="cron",
                description="定时任务管理",
                syntax="/cron [list|create|remove] [参数]",
                category=CommandCategory.UTILITY,
                triggers=["定时任务", "cron", "计划任务"],
            ),
            BuiltinCommand(
                name="notify",
                description="发送通知到指定渠道",
                syntax="/notify <渠道> <消息>",
                category=CommandCategory.UTILITY,
                triggers=["通知", "notify", "提醒"],
            ),
            BuiltinCommand(
                name="translate",
                description="翻译文本",
                syntax="/translate <文本> [目标语言]",
                category=CommandCategory.UTILITY,
                triggers=["翻译", "translate", "中英翻译"],
            ),
            BuiltinCommand(
                name="shorten",
                description="将长文本缩短为摘要",
                syntax="/shorten <文本>",
                category=CommandCategory.UTILITY,
                triggers=["缩短", "shorten", "精简"],
            ),
            BuiltinCommand(
                name="expand",
                description="将简短描述扩展为详细内容",
                syntax="/expand <简短描述>",
                category=CommandCategory.UTILITY,
                triggers=["扩展", "expand", "详细说明"],
            ),
        ]

        for cmd in builtins:
            self._commands[cmd.name] = cmd

        logger.info(f"Registered {len(self._commands)} built-in commands")

    # ── Public API ────────────────────────────────────────────────────────────

    def get_all(self) -> list[BuiltinCommand]:
        """返回所有注册指令"""
        return list(self._commands.values())

    def get_by_name(self, name: str) -> Optional[BuiltinCommand]:
        return self._commands.get(name.lower())

    def get_by_category(self, category: CommandCategory) -> list[BuiltinCommand]:
        return [c for c in self._commands.values() if c.category == category]

    def match(self, text: str) -> Optional[BuiltinCommand]:
        """从文本中匹配指令"""
        text_lower = text.lower().strip()
        # 优先精确匹配指令名
        if text_lower.startswith("/"):
            cmd_name = text_lower[1:].split()[0]
            if cmd_name in self._commands:
                return self._commands[cmd_name]
        # 触发词匹配
        for cmd in self._commands.values():
            if any(t.lower() in text_lower for t in cmd.triggers):
                return cmd
        return None

    def parse_args(self, text: str, cmd: BuiltinCommand) -> dict:
        """解析指令参数"""
        text = text.strip()
        # 去掉指令名
        if text.startswith("/"):
            parts = text[1:].split(None, 1)
        else:
            parts = text.split(None, 1)

        args_text = parts[1] if len(parts) > 1 else ""

        if cmd.name == "image" or cmd.name == "ask":
            return {"prompt": args_text.strip()}

        if cmd.name == "search":
            return {"query": args_text.strip()}

        if cmd.name == "model":
            return {"model": args_text.strip()}

        if cmd.name == "temperature":
            try:
                return {"value": float(args_text.strip())}
            except ValueError:
                return {"value": None, "raw": args_text}

        if cmd.name == "code":
            parts = args_text.split(None, 1)
            return {"language": parts[0] if len(parts) > 0 else "", "code": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "translate":
            parts = args_text.rsplit(None, 1)
            text_content = parts[0] if len(parts) > 0 else args_text
            target = parts[1] if len(parts) > 1 else "zh"
            return {"text": text_content, "target": target}

        if cmd.name == "remember":
            return {"content": args_text.strip()}

        if cmd.name == "forget":
            return {"keyword": args_text.strip()}

        if cmd.name == "echo":
            return {"text": args_text}

        if cmd.name == "shorten":
            return {"text": args_text.strip()}

        if cmd.name == "expand":
            return {"text": args_text.strip()}

        if cmd.name == "expert":
            return {"task": args_text.strip()}

        if cmd.name == "agent":
            parts = args_text.split(None, 1)
            return {"agent_name": parts[0] if len(parts) > 0 else "", "task": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "config":
            parts = args_text.split(None, 2)
            return {"action": parts[0] if len(parts) > 0 else "", "key": parts[1] if len(parts) > 1 else "", "value": parts[2] if len(parts) > 2 else ""}

        if cmd.name == "cron":
            parts = args_text.split(None, 1)
            return {"action": parts[0] if len(parts) > 0 else "", "params": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "notify":
            parts = args_text.split(None, 1)
            return {"channel": parts[0] if len(parts) > 0 else "", "message": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "skill":
            parts = args_text.split(None, 1)
            return {"action": parts[0] if len(parts) > 0 else "", "args": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "memory":
            parts = args_text.split(None, 1)
            return {"action": parts[0] if len(parts) > 0 else "", "params": parts[1] if len(parts) > 1 else ""}

        if cmd.name == "export":
            return {"format": args_text.strip() or "json"}

        if cmd.name == "lookup":
            return {"term": args_text.strip()}

        if cmd.name == "script":
            return {"path": args_text.strip()}

        if cmd.name == "eval":
            return {"expression": args_text.strip()}

        if cmd.name == "ping":
            return {}

        if cmd.name == "time":
            return {}

        if cmd.name == "version":
            return {}

        if cmd.name == "status":
            return {}

        if cmd.name == "clear":
            return {}

        if cmd.name == "reset":
            return {}

        if cmd.name == "retry":
            return {}

        if cmd.name == "summarize":
            return {}

        if cmd.name == "agents":
            return {}

        if cmd.name == "skills":
            return {}

        if cmd.name == "tts":
            return {"text": args_text.strip()}

        if cmd.name == "transcribe":
            return {}

        # default
        return {"raw": args_text}

    def add_history(self, command_name: str, args: dict, result: Any) -> None:
        self._history.append({
            "command": command_name,
            "args": args,
            "result": str(result)[:500] if result else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        # 保留最近 100 条
        if len(self._history) > 100:
            self._history = self._history[-100:]

    def get_history(self, limit: int = 20) -> list[dict]:
        return self._history[-limit:]

    def get_categories(self) -> list[str]:
        return [c.value for c in CommandCategory]


# Singleton
_registry: Optional[CommandRegistry] = None


def get_registry() -> CommandRegistry:
    global _registry
    if _registry is None:
        _registry = CommandRegistry()
    return _registry
