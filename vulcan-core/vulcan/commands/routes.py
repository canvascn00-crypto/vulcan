"""
Vulcan 全局指令 API 路由
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from vulcan.commands.registry import CommandCategory, get_registry

logger = logging.getLogger("Vulcan.CommandsRoutes")

router = APIRouter(prefix="/commands", tags=["commands"])


# ── Request/Response Models ────────────────────────────────────────────────────


class CommandListResponse(BaseModel):
    commands: list[dict]
    total: int


class CommandMatchRequest(BaseModel):
    text: str


class CommandMatchResponse(BaseModel):
    matched: bool
    command: dict | None
    args: dict | None


class CommandExecRequest(BaseModel):
    command: str
    args: dict = {}


class CommandExecResponse(BaseModel):
    command: str
    args: dict
    result: Any
    success: bool
    error: str | None
    timestamp: str


class CommandHistoryResponse(BaseModel):
    history: list[dict]
    total: int


class CommandCategoriesResponse(BaseModel):
    categories: list[str]


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.get("/", response_model=CommandListResponse)
def list_commands() -> CommandListResponse:
    """列出所有内置指令"""
    reg = get_registry()
    commands = reg.get_all()
    return CommandListResponse(
        commands=[c.to_dict() for c in commands],
        total=len(commands),
    )


@router.get("/categories", response_model=CommandCategoriesResponse)
def list_categories() -> CommandCategoriesResponse:
    """列出所有指令分类"""
    reg = get_registry()
    return CommandCategoriesResponse(categories=reg.get_categories())


@router.get("/category/{category}", response_model=CommandListResponse)
def list_by_category(category: str) -> CommandListResponse:
    """按分类获取指令"""
    reg = get_registry()
    try:
        cat = CommandCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown category: {category}")

    commands = reg.get_by_category(cat)
    return CommandListResponse(
        commands=[c.to_dict() for c in commands],
        total=len(commands),
    )


@router.post("/match", response_model=CommandMatchResponse)
def match_command(body: CommandMatchRequest) -> CommandMatchResponse:
    """匹配文本是否触发指令"""
    reg = get_registry()
    cmd = reg.match(body.text)

    if cmd is None:
        return CommandMatchResponse(matched=False, command=None, args=None)

    args = reg.parse_args(body.text, cmd)
    return CommandMatchResponse(
        matched=True,
        command=cmd.to_dict(),
        args=args,
    )


@router.post("/execute", response_model=CommandExecResponse)
def execute_command(body: CommandExecRequest) -> CommandExecResponse:
    """执行指定指令"""
    reg = get_registry()
    cmd = reg.get_by_name(body.command)

    if cmd is None:
        return CommandExecResponse(
            command=body.command,
            args=body.args,
            result=None,
            success=False,
            error=f"Unknown command: {body.command}",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    try:
        # 根据指令类型返回模拟结果（实际执行由 Agent 层处理）
        result = _execute_builtin(cmd.name, body.args)
        reg.add_history(cmd.name, body.args, result)
        return CommandExecResponse(
            command=cmd.name,
            args=body.args,
            result=result,
            success=True,
            error=None,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        logger.error(f"Command execution error: {e}")
        return CommandExecResponse(
            command=cmd.name,
            args=body.args,
            result=None,
            success=False,
            error=str(e),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


@router.get("/history", response_model=CommandHistoryResponse)
def command_history(limit: int = 20) -> CommandHistoryResponse:
    """获取指令执行历史"""
    reg = get_registry()
    return CommandHistoryResponse(
        history=reg.get_history(limit),
        total=len(reg.get_history(999)),
    )


@router.get("/{command_name}", response_model=dict)
def get_command(command_name: str) -> dict:
    """获取指定指令详情"""
    reg = get_registry()
    cmd = reg.get_by_name(command_name)
    if cmd is None:
        raise HTTPException(status_code=404, detail=f"Command not found: {command_name}")
    return cmd.to_dict()


# ── Builtin Executor ───────────────────────────────────────────────────────────


def _execute_builtin(command: str, args: dict) -> Any:
    """
    执行内置指令的核心逻辑。
    返回模拟结果 — 实际调用深度集成在 Agent 层。
    """
    from vulcan.agent.vulcan_agent import VulcanAgent

    now = datetime.now(timezone.utc)

    if command == "ping":
        return {"pong": True, "timestamp": now.isoformat()}

    if command == "time":
        return {"iso": now.isoformat(), "unix": int(now.timestamp())}

    if command == "version":
        return {
            "version": "v0.6.0",
            "codename": "Vulcan",
            "build": "global-commands",
            "commit": "built-in-commands",
        }

    if command == "status":
        return {
            "status": "operational",
            "uptime": "running",
            "commands_loaded": len(get_registry().get_all()),
            "timestamp": now.isoformat(),
        }

    if command == "echo":
        return {"echoed": args.get("text", "")}

    if command == "help":
        reg = get_registry()
        cmds = reg.get_all()
        by_category = {}
        for c in cmds:
            cat = c.category.value
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append({"name": c.name, "syntax": c.syntax, "description": c.description})
        return {"categories": by_category, "total": len(cmds)}

    if command == "clear":
        return {"message": "会话上下文已清除"}

    if command == "reset":
        return {"message": "系统状态已重置"}

    if command == "retry":
        return {"message": "重试上次回复（模拟）"}

    if command == "summarize":
        return {"summary": "对话摘要：暂无内容", "tokens_saved": 0}

    if command == "agents":
        return {"agents": ["assistant", "coder", "researcher", "critic"], "total": 4}

    if command == "skills":
        return {"skills": "使用 /skills 查看技能市场", "total": 0}

    if command == "ask":
        prompt = args.get("prompt", "")
        return {"message": f"收到问题：{prompt}，请等待 AI 处理..."}

    if command == "search":
        return {"message": f"搜索：{args.get('query', '')}", "results": []}

    if command == "image":
        return {"message": f"正在生成图片：{args.get('prompt', '')}", "status": "processing"}

    if command == "model":
        return {"message": f"切换模型到：{args.get('model', '')}"}

    if command == "temperature":
        return {"message": f"设置 temperature 为：{args.get('value', 'default')}"}

    if command == "remember":
        return {"message": f"已记住：{args.get('content', '')}"}

    if command == "forget":
        return {"message": f"已忘记关于：{args.get('keyword', '')}"}

    if command == "translate":
        return {"original": args.get("text", ""), "translated": f"[translated] {args.get('text', '')}", "target": args.get("target", "zh")}

    if command == "shorten":
        return {"shortened": args.get("text", "")[:50] + "...", "original_length": len(args.get("text", ""))}

    if command == "expand":
        return {"expanded": f"详细说明：{args.get('text', '')}", "original_length": len(args.get("text", ""))}

    if command == "lookup":
        return {"term": args.get("term", ""), "result": "Wikipedia 条目（模拟）"}

    if command == "export":
        return {"format": args.get("format", "json"), "download_url": "/tmp/export.json"}

    if command == "config":
        action = args.get("action", "")
        key = args.get("key", "")
        if action == "get":
            return {"key": key, "value": "null"}
        return {"message": f"config {action} {key}"}

    if command == "cron":
        return {"message": f"定时任务：{args.get('action', 'list')}"}

    if command == "notify":
        return {"message": f"通知已发送至 {args.get('channel', '')}"}

    if command == "expert":
        return {"message": f"正在匹配专家处理：{args.get('task', '')}"}

    if command == "agent":
        return {"message": f"调度 Agent {args.get('agent_name', '')} 执行：{args.get('task', '')}"}

    if command == "skill":
        action = args.get("action", "")
        return {"message": f"技能操作：{action}"}

    if command == "memory":
        action = args.get("action", "")
        return {"message": f"记忆操作：{action}"}

    if command == "code":
        lang = args.get("language", "")
        code = args.get("code", "")
        return {"message": f"执行 {lang} 代码", "code_length": len(code)}

    if command == "eval":
        return {"message": f"求值：{args.get('expression', '')}"}

    if command == "script":
        return {"message": f"运行脚本：{args.get('path', '')}"}

    if command == "tts":
        return {"message": f"正在合成语音：{args.get('text', '')[:30]}..."}

    if command == "transcribe":
        return {"message": "请上传音频文件进行转写"}

    # default
    return {"message": f"Executed: {command}"}
