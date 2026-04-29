"""
Vulcan DevTools — API testing, debug logging, performance profiling, system inspection.

API routes (prefix=/devtools):
- POST /devtools/test       — execute test request
- GET  /devtools/logs       — get recent logs (filterable)
- POST /devtools/logs/level — set log level
- GET  /devtools/profile    — performance profile
- GET  /devtools/inspect    — system inspection data
- GET  /devtools/config     — current configuration
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/devtools", tags=["devtools"])

# ─── Pydantic Models ────────────────────────────────────────────────────────────


class TestRequest(BaseModel):
    """Execute a test request against a Vulcan endpoint."""
    method: str = Field(..., description="HTTP method: GET, POST, PUT, DELETE")
    path: str = Field(..., description="Endpoint path, e.g. /health")
    body: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None


class TestResult(BaseModel):
    success: bool
    status_code: Optional[int] = None
    response_time_ms: float
    body: Optional[Any] = None
    error: Optional[str] = None


class LogEntry(BaseModel):
    timestamp: float
    level: str
    module: str
    message: str


class LogLevelSetRequest(BaseModel):
    module: str = Field(..., description="Logger module name, e.g. 'vulcan.agent'")
    level: str = Field(..., description="Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL")


class ProfileData(BaseModel):
    """Performance profile snapshot."""
    timestamp: float
    request_count: int
    avg_latency_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    slowest_endpoints: List[Dict[str, Any]] = []


class InspectionData(BaseModel):
    """System inspection data."""
    routes: List[Dict[str, str]]
    middleware: List[str]
    active_modules: List[str]
    uptime_seconds: float


class ConfigData(BaseModel):
    """Current configuration."""
    log_levels: Dict[str, str]
    profiling_enabled: bool
    slow_query_threshold_ms: float
    max_log_entries: int


# ─── In-Memory State ────────────────────────────────────────────────────────────

_lock = threading.Lock()

# Log storage
_log_entries: List[LogEntry] = []
_max_log_entries: int = 1000

# Custom log levels
_log_levels: Dict[str, str] = {}

# Profile data
_request_latencies: List[Dict[str, Any]] = []  # {path, method, latency_ms, timestamp}

# App start time
_start_time: float = time.time()

# Config
_profiling_enabled: bool = True
_slow_query_threshold_ms: float = 1000.0


# ─── Routes ─────────────────────────────────────────────────────────────────────


@router.post("/test", response_model=TestResult)
async def execute_test(req: TestRequest):
    """Execute a test request against a Vulcan endpoint (simulated)."""
    import httpx

    start = time.monotonic()
    try:
        # Build the request
        method = req.method.upper()
        if method not in ("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"):
            return TestResult(success=False, response_time_ms=0, error=f"Invalid method: {req.method}")

        # For this implementation, we simulate the test by making a real internal call
        # In production, this would route to the actual running server
        base_url = "http://localhost:8000"
        url = f"{base_url}{req.path}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                method=method,
                url=url,
                json=req.body,
                headers=req.headers or {},
            )

        elapsed_ms = (time.monotonic() - start) * 1000
        return TestResult(
            success=200 <= resp.status_code < 300,
            status_code=resp.status_code,
            response_time_ms=round(elapsed_ms, 2),
            body=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
        )
    except Exception as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        return TestResult(success=False, response_time_ms=round(elapsed_ms, 2), error=str(e))


@router.get("/logs")
async def get_logs(
    module: Optional[str] = Query(None, description="Filter by module"),
    level: Optional[str] = Query(None, description="Filter by level"),
    limit: int = Query(100, description="Max entries to return"),
) -> List[LogEntry]:
    """Get recent log entries, optionally filtered."""
    with _lock:
        entries = list(_log_entries)

    if module:
        entries = [e for e in entries if e.module == module]
    if level:
        entries = [e for e in entries if e.level == level.upper()]

    return entries[-limit:]


@router.post("/logs/level")
async def set_log_level(req: LogLevelSetRequest) -> Dict[str, str]:
    """Set the log level for a module."""
    level = req.level.upper()
    if level not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
        raise HTTPException(status_code=400, detail=f"Invalid log level: {level}")

    with _lock:
        _log_levels[req.module] = level

    # Actually apply to Python logging
    logger = logging.getLogger(req.module)
    logger.setLevel(getattr(logging, level))

    return {"module": req.module, "level": level}


@router.get("/profile", response_model=ProfileData)
async def get_profile():
    """Return performance profile data."""
    with _lock:
        latencies = list(_request_latencies)

    if not latencies:
        return ProfileData(
            timestamp=time.time(),
            request_count=0,
            avg_latency_ms=0,
            p50_ms=0,
            p95_ms=0,
            p99_ms=0,
            slowest_endpoints=[],
        )

    # Compute statistics
    lat_values = [e["latency_ms"] for e in latencies]
    count = len(lat_values)
    avg = sum(lat_values) / count
    sorted_lat = sorted(lat_values)
    p50 = sorted_lat[int(count * 0.5)]
    p95 = sorted_lat[int(count * 0.95)] if count > 1 else sorted_lat[0]
    p99 = sorted_lat[int(count * 0.99)] if count > 1 else sorted_lat[0]

    # Slowest endpoints
    slowest = sorted(latencies, key=lambda x: x["latency_ms"], reverse=True)[:5]
    slowest_endpoints = [
        {"path": e["path"], "method": e["method"], "latency_ms": e["latency_ms"]}
        for e in slowest
    ]

    return ProfileData(
        timestamp=time.time(),
        request_count=count,
        avg_latency_ms=round(avg, 2),
        p50_ms=round(p50, 2),
        p95_ms=round(p95, 2),
        p99_ms=round(p99, 2),
        slowest_endpoints=slowest_endpoints,
    )


@router.get("/inspect", response_model=InspectionData)
async def inspect_system():
    """Return system inspection data: routes, middleware, active modules."""
    from fastapi import FastAPI
    from vulcan.main import app

    # Extract routes
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            methods = ",".join(route.methods) if route.methods else "GET"
            routes.append({"path": route.path, "methods": methods})

    # Middleware names
    middleware = []
    if hasattr(app, "user_middleware"):
        for mw in app.user_middleware:
            middleware.append(type(mw).__name__ if hasattr(mw, "__class__") else str(mw))

    # Active modules
    active_modules = sorted(_log_levels.keys())

    uptime = time.time() - _start_time

    return InspectionData(
        routes=routes,
        middleware=middleware,
        active_modules=active_modules,
        uptime_seconds=round(uptime, 2),
    )


@router.get("/config", response_model=ConfigData)
async def get_config():
    """Return current devtools configuration."""
    with _lock:
        return ConfigData(
            log_levels=dict(_log_levels),
            profiling_enabled=_profiling_enabled,
            slow_query_threshold_ms=_slow_query_threshold_ms,
            max_log_entries=_max_log_entries,
        )
