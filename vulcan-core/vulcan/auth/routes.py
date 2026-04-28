"""
API Keys Management Routes — /api/api-keys/*
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from vulcan.auth.rbac import (
    Role, create_api_key, revoke_api_key, list_api_keys,
    APIKeyRecord, get_api_key, API_KEY_HEADER,
)
from fastapi import Depends

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _record_to_dict(r: APIKeyRecord) -> dict:
    return {
        "key_prefix": r.key_prefix,
        "role": r.role.value,
        "name": r.name,
        "created_at": r.created_at,
        "last_used": r.last_used,
        "rate_limit": r.rate_limit,
        "rate_window": r.rate_window,
        "active": r.active,
    }


@router.get("")
async def list_keys() -> list[dict]:
    """List all API keys (metadata only — never the actual key)."""
    return [_record_to_dict(r) for r in list_api_keys()]


@router.post("")
async def create_key(
    name: str,
    role: str = "external",
    rate_limit: int = 60,
    rate_window: int = 60,
) -> dict:
    """
    Create a new API key.
    The raw key is only returned ONCE — store it securely.
    """
    try:
        r = Role(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    record, raw_key = create_api_key(
        name=name,
        role=r,
        rate_limit=rate_limit,
        rate_window=rate_window,
    )
    return {
        "name": record.name,
        "key_prefix": record.key_prefix,
        "role": record.role.value,
        "api_key": raw_key,  # Only shown once!
        "rate_limit": record.rate_limit,
        "rate_window": record.rate_window,
        "created_at": record.created_at,
        "warning": "Store this API key securely — it will not be shown again!",
    }


@router.delete("/{key_prefix}")
async def revoke_key(key_prefix: str) -> dict:
    """Revoke an API key by its prefix."""
    ok = revoke_api_key(key_prefix)
    if not ok:
        raise HTTPException(status_code=404, detail=f"API key '{key_prefix}***' not found")
    return {"ok": True, "message": f"API key '{key_prefix}***' has been revoked"}


@router.post("/{key_prefix}/activate")
async def activate_key(key_prefix: str) -> dict:
    """Re-activate a revoked API key."""
    for r in list_api_keys():
        if r.key_prefix == key_prefix:
            r.active = True
            return {"ok": True, "message": f"API key '{key_prefix}***' activated"}
    raise HTTPException(status_code=404, detail=f"API key '{key_prefix}***' not found")


@router.get("/{key_prefix}/test")
async def test_key(key_prefix: str) -> dict:
    """Test if an API key is valid (no auth required for this endpoint)."""
    for r in list_api_keys():
        if r.key_prefix == key_prefix:
            return {
                "valid": r.active,
                "role": r.role.value,
                "name": r.name,
                "last_used": r.last_used,
            }
    raise HTTPException(status_code=404, detail=f"API key '{key_prefix}***' not found")
