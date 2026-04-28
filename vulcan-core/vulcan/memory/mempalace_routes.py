"""
MemPalace API Routes — FastAPI router for MemPalace 4-layer memory system.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .mempalace_integration import VulcanMemPalace, get_mempalace

router = APIRouter(prefix="/mempalace", tags=["mempalace"])


# ── Request/Response Models ────────────────────────────────────────────────

class IdentitySetRequest(BaseModel):
    text: str


class SearchRequest(BaseModel):
    query: str
    wing: Optional[str] = None
    room: Optional[str] = None
    n_results: int = 5


class RecallRequest(BaseModel):
    wing: Optional[str] = None
    room: Optional[str] = None
    n_results: int = 10


class MineRequest(BaseModel):
    path: str
    wing: Optional[str] = None


class ConfigureRequest(BaseModel):
    palace_path: Optional[str] = None
    topic_wings: Optional[list[str]] = None
    hall_keywords: Optional[dict[str, list[str]]] = None


class ConvoImportRequest(BaseModel):
    path: str
    format: str = "auto"


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """Check if MemPalace source is available."""
    try:
        mp = get_mempalace()
        status = mp.status()
        return {
            "ok": "error" not in status,
            "status": status,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/status")
async def status():
    """Return status of all 4 memory layers."""
    try:
        mp = get_mempalace()
        return mp.status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/identity")
async def get_identity():
    """L0: Get identity text."""
    try:
        mp = get_mempalace()
        return {"identity": mp.get_identity()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/identity")
async def set_identity(req: IdentitySetRequest):
    """Set identity text."""
    try:
        mp = get_mempalace()
        result = mp.set_identity(req.text)
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wake-up")
async def wake_up(wing: Optional[str] = Query(None)):
    """
    L0 + L1: Generate wake-up text (~600-900 tokens).
    Inject into system prompt before conversation.
    """
    try:
        mp = get_mempalace()
        text = mp.wake_up(wing=wing)
        return {"wake_up": text, "tokens_estimate": len(text) // 4}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recall")
async def recall(
    wing: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    n_results: int = Query(10, ge=1, le=100),
):
    """L2: On-demand retrieval filtered by wing/room."""
    try:
        mp = get_mempalace()
        text = mp.recall(wing=wing, room=room, n_results=n_results)
        return {"recall": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search(
    query: str = Query(..., min_length=1),
    wing: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    n_results: int = Query(5, ge=1, le=50),
):
    """L3: Deep semantic search against the full palace."""
    try:
        mp = get_mempalace()
        text = mp.search(query=query, wing=wing, room=room, n_results=n_results)
        return {"search": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_post(req: SearchRequest):
    """L3: Deep semantic search (POST variant)."""
    try:
        mp = get_mempalace()
        text = mp.search(
            query=req.query,
            wing=req.wing,
            room=req.room,
            n_results=req.n_results,
        )
        return {"search": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wings")
async def wings():
    """List all wings with drawer counts."""
    try:
        mp = get_mempalace()
        return {"wings": mp.wings()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mine")
async def mine(req: MineRequest):
    """
    Ingest project files into the palace.
    Runs mempalace mine CLI command.
    """
    try:
        mp = get_mempalace()
        result = mp.mine(path=req.path, wing=req.wing)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convo-import")
async def convo_import(req: ConvoImportRequest):
    """Import conversation exports into the palace."""
    try:
        mp = get_mempalace()
        result = mp.convo_import(path=req.path, format=req.format)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph-stats")
async def graph_stats():
    """Return palace graph statistics."""
    try:
        mp = get_mempalace()
        return mp.graph_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configure")
async def configure(req: ConfigureRequest):
    """Update MemPalace configuration."""
    try:
        mp = get_mempalace()
        result = mp.configure(
            palace_path=req.palace_path,
            topic_wings=req.topic_wings,
            hall_keywords=req.hall_keywords,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
