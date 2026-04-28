"""
Vulcan API Authentication & RBAC
==================================
- API Key authentication for external callers
- RBAC: admin, operator, readonly, external
- Rate limiting per API key
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional

from fastapi import HTTPException, Request, status
from fastapi.security import APIKeyHeader

# ─── Config ───────────────────────────────────────────────────────────────────

API_KEY_HEADER = APIKeyHeader(name="X-Vulcan-Key")

# In-memory store (replace with Redis/DB in production)
_api_keys: dict[str, APIKeyRecord] = {}


# ─── RBAC Roles ───────────────────────────────────────────────────────────────

class Role(str, Enum):
    ADMIN = "admin"          # Full access
    OPERATOR = "operator"    # Read + write operational access
    READONLY = "readonly"    # Read only
    EXTERNAL = "external"     # External API callers (limited)


# ─── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class APIKeyRecord:
    key_hash: str          # SHA256 of the actual key
    key_prefix: str        # First 8 chars for identification
    role: Role
    name: str              # Human-readable name
    created_at: float
    last_used: float
    rate_limit: int        # requests per window
    rate_window: int       # window in seconds
    quotas: dict[str, int] = field(default_factory=dict)  # per-endpoint quotas
    active: bool = True
    # Request counters
    _requests: list[float] = field(default_factory=list)

    def is_active(self) -> bool:
        return self.active

    def check_rate(self) -> bool:
        now = time.time()
        # Remove old requests outside window
        self._requests = [t for t in self._requests if now - t < self.rate_window]
        if len(self._requests) >= self.rate_limit:
            return False
        self._requests.append(now)
        return True

    def touch(self):
        self.last_used = time.time()


@dataclass
class RBACPolicy:
    role: Role
    allowed_paths: list[str]   # glob patterns
    denied_paths: list[str]    # glob patterns (takes precedence)
    max_requests_per_minute: int


# ─── Default policies ──────────────────────────────────────────────────────────

POLICIES: dict[Role, RBACPolicy] = {
    Role.ADMIN: RBACPolicy(
        role=Role.ADMIN,
        allowed_paths=["*"],
        denied_paths=[],
        max_requests_per_minute=99999,
    ),
    Role.OPERATOR: RBACPolicy(
        role=Role.OPERATOR,
        allowed_paths=[
            "/chat", "/tasks", "/tasks/*",
            "/tools", "/gateway/status", "/gateway/send",
            "/skills", "/skills/*",
            "/a2a/status", "/a2a/tasks/delegate", "/a2a/tasks/delegated",
            "/memory/*",
            "/api keys", "/health",
        ],
        denied_paths=["/admin", "/api keys"],
        max_requests_per_minute=300,
    ),
    Role.READONLY: RBACPolicy(
        role=Role.READONLY,
        allowed_paths=[
            "/health", "/tools", "/gateway/status",
            "/skills", "/skills/*",
            "/a2a/status",
            "/tasks",
        ],
        denied_paths=["/tasks/*/cancel", "/tasks/*/complete", "/gateway/send"],
        max_requests_per_minute=60,
    ),
    Role.EXTERNAL: RBACPolicy(
        role=Role.EXTERNAL,
        allowed_paths=["/chat", "/tasks", "/health"],
        denied_paths=["/admin", "/gateway", "/a2a", "/skills", "/memory", "/api keys"],
        max_requests_per_minute=30,
    ),
}


# ─── Key Management ───────────────────────────────────────────────────────────

def generate_api_key() -> tuple[str, str]:
    """Generate a new API key. Returns (raw_key, key_prefix). The raw key is only shown once."""
    raw = f"vulcan_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[:12]
    return raw, key_prefix


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def create_api_key(
    name: str,
    role: Role = Role.EXTERNAL,
    rate_limit: int = 60,
    rate_window: int = 60,
) -> tuple[APIKeyRecord, str]:
    """Create a new API key. Returns (record, raw_key). Store the raw_key securely!"""
    raw, prefix = generate_api_key()
    record = APIKeyRecord(
        key_hash=hash_key(raw),
        key_prefix=prefix,
        role=role,
        name=name,
        created_at=time.time(),
        last_used=time.time(),
        rate_limit=rate_limit,
        rate_window=rate_window,
    )
    _api_keys[record.key_hash] = record
    return record, raw


def get_api_key(raw_key: str) -> Optional[APIKeyRecord]:
    record = _api_keys.get(hash_key(raw_key))
    if record:
        record.touch()
    return record


def revoke_api_key(key_prefix: str) -> bool:
    """Revoke by key prefix (first 8 chars)."""
    for record in _api_keys.values():
        if record.key_prefix == key_prefix:
            record.active = False
            return True
    return False


def list_api_keys() -> list[APIKeyRecord]:
    return list(_api_keys.values())


# ─── Path Matching ─────────────────────────────────────────────────────────────

import fnmatch


def _path_matches(pattern: str, path: str) -> bool:
    return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, "/" + pattern)


def check_rbac(role: Role, path: str, method: str = "GET") -> bool:
    """Check if role allows access to path+method."""
    policy = POLICIES.get(role)
    if not policy:
        return False

    # Check denied first
    for pattern in policy.denied_paths:
        if _path_matches(pattern, path):
            return False

    # Then allowed
    for pattern in policy.allowed_paths:
        if _path_matches(pattern, path):
            return True

    return False


# ─── FastAPI Dependency ────────────────────────────────────────────────────────

async def get_current_api_key(
    request: Request,
    key: Optional[str] = None,
) -> APIKeyRecord:
    """
    Dependency for protected routes.
    Accepts API key from X-Vulcan-Key header.
    Raises 401 if missing/invalid, 429 if rate limited, 403 if not allowed.
    """
    # Bypass auth for health check in dev
    if request.url.path in ("/health", "/api/health") and key is None:
        # Return a dummy admin record for health checks
        class DummyRecord:
            role = Role.ADMIN
            name = "health_check"
            active = True
            key_prefix = "health"
            def check_rate(self) -> bool:
                return True
        return DummyRecord()

    if not key:
        # Try to read header manually
        key = request.headers.get("X-Vulcan-Key")
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-Vulcan-Key header",
            )

    record = get_api_key(key)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if not record.is_active():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has been revoked",
        )

    if not record.check_rate():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )

    if not check_rbac(record.role, request.url.path):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{record.role.value}' is not allowed to access '{request.url.path}'",
        )

    return record


# ─── RBAC-Aware decorator ─────────────────────────────────────────────────────

def require_role(*roles: Role):
    """Decorator to restrict endpoint to specific roles."""
    async def dependency(record: APIKeyRecord = get_current_api_key(None, None)) -> APIKeyRecord:
        if record.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in roles]}",
            )
        return record
    return dependency
