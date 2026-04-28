"""
Vulcan FastAPI 主服务
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import asyncio
import uuid

from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
from vulcan.agent.task_queue import TaskQueue
from vulcan.agent.observability.logger import VulcanLogger, LogLevel
from vulcan.skills import skills_router
from vulcan.a2a.routes import router as a2a_router
from vulcan.auth.routes import router as auth_router
from vulcan.memory.mempalace_routes import router as mempalace_router
from vulcan.auth.rbac import create_api_key, Role

# Gateway integration (lazy import to avoid circular dependency)
gateway_integration: Optional["GatewayIntegration"] = None


# --- Lifespan ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage VulcanAgent and Gateway lifecycle."""
    global agent, gateway_integration
    from vulcan.gateway_integration import gateway_integration as _gi
    from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
    from vulcan.skills import get_forge

    config = AgentConfig(enable_observability=True, enable_memory=True)
    agent = VulcanAgent(config)
    logger.info("Vulcan API started")

    # Load SkillForge registry
    try:
        forge = get_forge()
        forge.reload()
        stats = forge.stats()
        by_src = ", ".join(f"{k}={v}" for k, v in stats["by_source"].items())
        logger.info(f"SkillForge loaded: {stats['total']} skills ({by_src})")
    except Exception as e:
        logger.warn(f"SkillForge init failed (non-fatal): {e}")

    # Start the messaging gateway (all 20 platforms)
    try:
        gateway_integration = await _gi(vulcan_agent=agent)
        logger.info("Vulcan Gateway started")
    except Exception as e:
        logger.error(f"Failed to start gateway: {e}")

    # Register this agent with the A2A pool
    try:
        from vulcan.a2a import AgentCard, AgentStatus, get_agent_pool
        pool = get_agent_pool()
        my_card = AgentCard(
            name="vulcan-primary",
            version="0.1.0",
            status=AgentStatus.IDLE,
            role="orchestrator",
            capabilities=["reasoning", "tool_use", "planning", "code", "web", "memory"],
            tools=[],  # filled by VulcanToolRegistry at runtime
            description="Primary Vulcan orchestrator agent",
            tags=["vulcan", "primary", "orchestrator"],
        )
        await pool.register(my_card)
        logger.info("A2A AgentPool: registered 'vulcan-primary'")
    except Exception as e:
        logger.warn(f"A2A init failed (non-fatal): {e}")

    # Create default admin API key (shown once, store it!)
    try:
        from vulcan.auth.rbac import list_api_keys
        existing = list_api_keys()
        if not existing:
            record, raw_key = create_api_key(
                name="default-admin",
                role=Role.ADMIN,
                rate_limit=99999,
                rate_window=60,
            )
            logger.info(
                f"🔑 Default admin API key created (save it now!):\n"
                f"   X-Vulcan-Key: {raw_key}\n"
                f"   Prefix: {record.key_prefix}***\n"
                f"   Role: admin"
            )
        else:
            logger.info(f"API keys loaded: {len(existing)} key(s)")
    except Exception as e:
        logger.warn(f"Auth init failed (non-fatal): {e}")

    yield

    # Shutdown
    try:
        from vulcan.a2a import get_agent_pool
        pool = get_agent_pool()
        await pool.unregister("vulcan-primary")
    except Exception:
        pass
    if gateway_integration:
        await gateway_integration.stop()
    if agent:
        await agent.shutdown()


# App
app = FastAPI(title="Vulcan API", version="0.1.0", lifespan=lifespan)

# Skills router (SkillForge + Marketplace)
app.include_router(skills_router)

# A2A multi-agent router
app.include_router(a2a_router)

# Auth + API keys router
app.include_router(auth_router)

# MemPalace 4-layer memory router
app.include_router(mempalace_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals (set in lifespan)
agent: Optional[VulcanAgent] = None
logger = VulcanLogger(session_id="vulcan-api", log_level="INFO")


# --- Request/Response Models ---


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


class ChatResponse(BaseModel):
    task_id: str
    reply: str
    trace_id: str


class TaskStatusRequest(BaseModel):
    task_id: str


# --- Routes ---


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "vulcan",
        "version": "0.1.0",
        "gateway": gateway_integration.is_running if gateway_integration else False,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    try:
        result = await agent.run_async(goal=req.message, session_id=req.session_id)
        return ChatResponse(
            task_id=result["task_id"],
            reply=str(result.get("result", "")),
            trace_id=result.get("trace_id", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tasks")
async def list_tasks() -> List[Dict[str, Any]]:
    if not agent:
        return []
    tasks = await agent.task_queue.list_tasks()
    return [t.to_dict() for t in tasks]


@app.get("/tasks/{task_id}")
async def get_task(task_id: str) -> Dict[str, Any]:
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    task = await agent.task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()


@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str) -> Dict[str, str]:
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    ok = await agent.task_queue.cancel_task(task_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot cancel task")
    return {"ok": True}


@app.get("/tools")
async def list_tools() -> Dict[str, Any]:
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    return {
        "tools": agent.tools.list_tools(),
        "toolsets": agent.tools.get_toolsets(),
    }


# --- Gateway Routes ---


@app.get("/gateway/status")
async def gateway_status() -> Dict[str, Any]:
    """Get status of all messaging platform adapters."""
    if not gateway_integration:
        return {"running": False, "platforms": []}
    return {
        "running": gateway_integration.is_running,
        "platforms": gateway_integration.manager.list_adapters(),
    }


@app.post("/gateway/send")
async def gateway_send(req: ChatRequest) -> Dict[str, Any]:
    """
    Send a message via a specific platform.
    Use delivery target format: "platform:chat_id" or just "platform" for home channel.
    """
    if not gateway_integration:
        raise HTTPException(status_code=503, detail="Gateway not initialized")

    delivery = req.session_id or "local"
    platform, chat_id = gateway_integration.manager.resolve_destination(delivery)
    result = await gateway_integration.send_message(platform, chat_id, req.message)
    return {"ok": result.success if result else False, "platform": platform, "chat_id": chat_id}


@app.get("/gateway/home-channels")
async def list_home_channels() -> List[Dict[str, Any]]:
    """List all configured home channels."""
    if not gateway_integration:
        return []
    result = []
    for platform_name in gateway_integration.manager.config.platforms:
        home = gateway_integration.manager.get_home_channel(platform_name)
        if home:
            result.append({"platform": home[0], "chat_id": home[1]})
    return result


# --- WebSocket for streaming ---


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}


_ws_manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(ws: WebSocket, client_id: str):
    await _ws_manager.connect(ws, client_id)
    try:
        while True:
            data = await ws.receive_json()
            message = data.get("message", "")
            if not message:
                continue
            # Run agent
            result = await agent.run_async(goal=message, session_id=client_id)
            await ws.send_json({
                "type": "result",
                "task_id": result["task_id"],
                "reply": str(result.get("result", "")),
                "trace_id": result.get("trace_id", ""),
            })
    except WebSocketDisconnect:
        _ws_manager.disconnect(client_id)
