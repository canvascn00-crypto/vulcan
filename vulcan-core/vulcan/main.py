"""
Vulcan FastAPI 主服务
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
import uuid

from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
from vulcan.agent.task_queue import TaskQueue
from vulcan.agent.observability.logger import VulcanLogger, LogLevel

# App
app = FastAPI(title="Vulcan API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals
agent: Optional[VulcanAgent] = None
logger = VulcanLogger(name="VulcanAPI", level=LogLevel.INFO)


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


# --- Lifespan ---

@app.on_event("startup")
async def startup():
    global agent
    config = AgentConfig(
        enable_observability=True,
        enable_memory=True,
    )
    agent = VulcanAgent(config)
    logger.info("Vulcan API started")


@app.on_event("shutdown")
async def shutdown():
    if agent:
        await agent.shutdown()


# --- Routes ---

@app.get("/health")
async def health():
    return {"status": "ok", "service": "vulcan", "version": "0.1.0"}


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
async def list_tasks():
    if not agent:
        return []
    tasks = await agent.task_queue.list_tasks()
    return [t.to_dict() for t in tasks]


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    task = await agent.task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()


@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    ok = await agent.task_queue.cancel_task(task_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot cancel task")
    return {"ok": True}


@app.get("/tools")
async def list_tools():
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    return {
        "tools": agent.tools.list_tools(),
        "toolsets": agent.tools.get_toolsets(),
    }


# --- WebSocket for streaming ---

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, ws: WebSocket, client_id: str):
        await ws.accept()
        self.active[client_id] = ws

    def disconnect(self, client_id: str):
        self.active.pop(client_id, None)


manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(ws: WebSocket, client_id: str):
    await manager.connect(ws, client_id)
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
        manager.disconnect(client_id)
