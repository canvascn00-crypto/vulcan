"""
Shield — Security Routes (FastAPI router, prefix=/shield)

API endpoints for threat analysis, health, events, blocklist, and config.
"""

import hashlib
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from vulcan.shield.filter import SanitizeConfig, sanitize_input
from vulcan.shield.injection import ThreatLevel, detect_injection
from vulcan.shield.rate_limiter import RateLimiter, RateLimitConfig

router = APIRouter(prefix="/shield", tags=["shield"])

# ─── In-Memory Storage ────────────────────────────────────────────────────────

_blocklist_lock = threading.Lock()
_blocklist_entries: Dict[str, dict] = {}  # pattern -> {pattern, added_at, reason}

_rate_limiter = RateLimiter(RateLimitConfig(max_requests=100, window_seconds=60))

_events_lock = threading.Lock()
_events: List[dict] = []
_MAX_EVENTS = 10000


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class CheckRequest(BaseModel):
    input: str


class CheckResponse(BaseModel):
    safe: bool
    threats: list
    threat_level: str
    sanitized: str


class BlocklistEntry(BaseModel):
    pattern: str
    reason: Optional[str] = None
    added_at: Optional[str] = None


class BlocklistAction(BaseModel):
    pattern: str
    reason: Optional[str] = None
    action: str = "add"  # "add" or "remove"


class ConfigUpdate(BaseModel):
    max_requests: Optional[int] = None
    window_seconds: Optional[int] = None


class EventLogEntry(BaseModel):
    id: int
    timestamp: str
    event_type: str
    severity: str
    input_hash: str
    details: Optional[dict] = None


# ─── Helper: Record Security Event ────────────────────────────────────────────

def _record_event(event_type: str, severity: str, input_hash: str, details: Optional[dict] = None):
    with _events_lock:
        entry = {
            "id": len(_events) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "severity": severity,
            "input_hash": input_hash,
            "details": details or {},
        }
        _events.append(entry)
        # Cap events
        if len(_events) > _MAX_EVENTS:
            _events[:] = _events[-_MAX_EVENTS:]


def _hash_input(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/check", response_model=CheckResponse)
async def check_input(req: CheckRequest, request: Request):
    """Analyze input for threats and return sanitized output."""
    raw = req.input

    # Rate limit check
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = _rate_limiter.check(client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Retry after {retry_after}s")

    # Sanitize
    sanitized = sanitize_input(raw)

    # Detect injection
    result = detect_injection(sanitized)

    # Check blocklist patterns
    input_lower = raw.lower()
    with _blocklist_lock:
        for pattern_key, entry in _blocklist_entries.items():
            if pattern_key in input_lower:
                result.threat_level = ThreatLevel.CRITICAL
                result.threats.append({
                    "pattern": pattern_key,
                    "match": pattern_key,
                    "score": 10,
                })
                break

    is_safe = result.threat_level == ThreatLevel.NONE

    # Record event
    input_hash = _hash_input(raw)
    _record_event(
        event_type="check",
        severity=result.threat_level.value,
        input_hash=input_hash,
        details={
            "threat_count": len(result.threats),
            "threat_level": result.threat_level.value,
            "ip": client_ip,
        },
    )

    return CheckResponse(
        safe=is_safe,
        threats=[t.dict() if hasattr(t, "dict") else t for t in result.threats],
        threat_level=result.threat_level.value,
        sanitized=sanitized,
    )


@router.get("/status")
async def shield_status():
    """Shield health check + stats."""
    limiter_stats = _rate_limiter.stats()
    with _blocklist_lock:
        blocklist_count = len(_blocklist_entries)
    with _events_lock:
        event_count = len(_events)

    return {
        "status": "ok",
        "rate_limiter": limiter_stats,
        "blocklist_entries": blocklist_count,
        "event_count": event_count,
    }


@router.get("/events")
async def list_events(limit: int = 100, offset: int = 0, severity: Optional[str] = None):
    """Paginated security event log."""
    with _events_lock:
        events = list(_events)

    if severity:
        events = [e for e in events if e["severity"] == severity]

    total = len(events)
    page = events[offset : offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": page,
    }


@router.post("/blocklist")
async def manage_blocklist(action: BlocklistAction):
    """Add or remove blocklist entries."""
    with _blocklist_lock:
        if action.action == "add":
            _blocklist_entries[action.pattern.lower()] = {
                "pattern": action.pattern,
                "reason": action.reason or "Blocked by admin",
                "added_at": datetime.now(timezone.utc).isoformat(),
            }
        elif action.action == "remove":
            _blocklist_entries.pop(action.pattern.lower(), None)
        else:
            raise HTTPException(400, f"Invalid action: {action.action}")

    return {"ok": True, "action": action.action, "pattern": action.pattern}


@router.get("/blocklist")
async def list_blocklist():
    """List all blocklist entries."""
    with _blocklist_lock:
        entries = list(_blocklist_entries.values())
    return {"entries": entries, "total": len(entries)}


@router.post("/config")
async def update_config(cfg: ConfigUpdate):
    """Update rate limit configuration."""
    _rate_limiter.update_config(
        max_requests=cfg.max_requests,
        window_seconds=cfg.window_seconds,
    )
    return {"ok": True, "config": _rate_limiter.get_config().dict()}
