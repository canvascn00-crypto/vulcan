"""
SkillForge FastAPI routes — /api/skills/*
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .marketplace import MarketplaceClient, SkillInstaller, get_marketplace
from .skill_forge import (
    SkillForge, SkillMeta, SkillSource, SkillStatus, TrustLevel, get_forge,
)

logger = logging.getLogger("Vulcan.SkillRoutes")

router = APIRouter(prefix="/api/skills", tags=["skills"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SkillSearchQuery(BaseModel):
    q: str = ""
    source: Optional[str] = None
    trust: Optional[str] = None
    tool: Optional[str] = None
    status: Optional[str] = None
    limit: int = 50


class SkillInstallRequest(BaseModel):
    source: str
    identifier: str


class SkillRatingRequest(BaseModel):
    name: str
    rating: float


class SkillTriggerRequest(BaseModel):
    text: str
    tools_available: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _meta_to_dict(m: SkillMeta) -> dict:
    return {
        "name": m.name,
        "description": m.description,
        "trigger_keywords": m.trigger.keywords,
        "trigger_patterns": m.trigger.patterns,
        "tools": m.tools,
        "source": m.source.value,
        "source_path": m.source_path,
        "trust_level": m.trust_level.value,
        "version": m.version,
        "author": m.author,
        "tags": m.tags,
        "status": m.status.value,
        "installed_at": m.installed_at,
        "last_used": m.last_used,
        "use_count": m.use_count,
        "rating": m.rating,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/")
def list_skills(
    q: str = Query(""),
    source: Optional[str] = Query(None),
    trust: Optional[str] = Query(None),
    tool: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """List/search skills."""
    forge = get_forge()
    src = SkillSource(source) if source else None
    tr = TrustLevel(trust) if trust else None
    st = SkillStatus(status) if status else None
    if q:
        skills = forge.search(q, source=src, trust=tr, tool=tool, status=st, limit=limit)
    else:
        skills = forge.all_skills()
        if src:
            skills = [s for s in skills if s.source == src]
        if tr:
            skills = [s for s in skills if s.trust_level == tr]
        if st:
            skills = [s for s in skills if s.status == st]
        skills = skills[:limit]
    return {"skills": [_meta_to_dict(s) for s in skills], "total": len(skills)}


@router.get("/stats")
def skills_stats():
    """Skill registry statistics."""
    forge = get_forge()
    return forge.stats()


@router.get("/{name}")
def get_skill(name: str):
    """Get skill details + full SKILL.md content."""
    forge = get_forge()
    meta = forge.get(name)
    if not meta:
        raise HTTPException(404, f"Skill '{name}' not found")
    content = forge.get_content(name) or ""
    return {
        **_meta_to_dict(meta),
        "content": content,
    }


@router.post("/{name}/enable")
def enable_skill(name: str):
    forge = get_forge()
    if not forge.get(name):
        raise HTTPException(404, f"Skill '{name}' not found")
    forge.enable(name)
    return {"ok": True, "name": name, "status": "active"}


@router.post("/{name}/disable")
def disable_skill(name: str):
    forge = get_forge()
    if not forge.get(name):
        raise HTTPException(404, f"Skill '{name}' not found")
    forge.disable(name)
    return {"ok": True, "name": name, "status": "disabled"}


@router.post("/{name}/rate")
def rate_skill(req: SkillRatingRequest):
    forge = get_forge()
    if not forge.get(req.name):
        raise HTTPException(404, f"Skill '{req.name}' not found")
    forge.set_rating(req.name, req.rating)
    return {"ok": True, "name": req.name, "rating": req.rating}


@router.post("/install")
def install_skill(req: SkillInstallRequest):
    """Install a skill from marketplace or GitHub."""
    forge = get_forge()
    installer = SkillInstaller(forge)
    result = installer.install_from_marketplace(req.source, req.identifier)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "Installation failed"))
    return result


@router.post("/{name}/uninstall")
def uninstall_skill(name: str):
    forge = get_forge()
    if not forge.get(name):
        raise HTTPException(404, f"Skill '{name}' not found")
    # Only allow uninstalling Vulcan-installed skills
    meta = forge.get(name)
    if meta and meta.source == SkillSource.HERMES_LEGACY:
        raise HTTPException(403, "Cannot uninstall Hermes legacy skills")
    forge.uninstall(name)
    return {"ok": True, "name": name}


@router.post("/trigger-match")
def match_triggers(req: SkillTriggerRequest):
    """Find skills that match a text trigger."""
    forge = get_forge()
    matched = forge.match_triggers(req.text, req.tools_available)
    return {"matched": [_meta_to_dict(s) for s in matched]}


@router.post("/reload")
def reload_skills():
    """Force reload the skill registry."""
    forge = get_forge()
    forge.reload()
    return {"ok": True, "total": len(forge.all_skills())}


# ---------------------------------------------------------------------------
# Marketplace routes
# ---------------------------------------------------------------------------

@router.get("/marketplace/search")
def marketplace_search(
    q: str = Query(""),
    source: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """Search the remote skill marketplace."""
    mp = get_marketplace()
    entries = mp.search(q, source=source, limit=limit)
    return {
        "entries": [
            {
                "name": e.name,
                "description": e.description,
                "source": e.source,
                "identifier": e.identifier,
                "repo": e.repo,
                "path": e.path,
                "trust_level": e.trust_level.value,
                "version": e.version,
                "author": e.author,
                "tags": e.tags,
                "rating": e.rating,
                "install_count": e.install_count,
            }
            for e in entries
        ],
        "total": len(entries),
    }


@router.get("/marketplace/bundle/{source}/{identifier:path}")
def get_marketplace_bundle(source: str, identifier: str):
    """Fetch a skill bundle from marketplace (preview before install)."""
    mp = get_marketplace()
    bundle = mp.fetch_bundle(source, identifier)
    if not bundle:
        raise HTTPException(404, f"Bundle '{identifier}' not found in {source}")
    return {
        "name": bundle.meta.name,
        "description": bundle.meta.description,
        "version": bundle.meta.version,
        "content": bundle.content,
        "source": bundle.meta.source.value,
    }


# ---------------------------------------------------------------------------
# Skill content (for rendering skill editor)
# ---------------------------------------------------------------------------

@router.get("/{name}/content")
def get_skill_content(name: str):
    """Get raw SKILL.md content of a skill."""
    forge = get_forge()
    content = forge.get_content(name)
    if content is None:
        raise HTTPException(404, f"Skill '{name}' not found")
    return {"name": name, "content": content}


# ---------------------------------------------------------------------------
# Vulcan legacy skill path discovery (for import)
# ---------------------------------------------------------------------------

@router.get("/paths/discover")
def discover_skill_paths():
    """Return all known skill root paths."""
    from .skill_forge import HERMES_SKILLS_DIR, VULCAN_SKILLS_DIR
    vulcan_skills = []
    hermes_skills = []

    for p in VULCAN_SKILLS_DIR.rglob("SKILL.md"):
        rel = p.parent.relative_to(VULCAN_SKILLS_DIR)
        vulcan_skills.append({"name": rel.name if rel.parts else p.parent.name, "path": str(p.parent)})

    for p in HERMES_SKILLS_DIR.rglob("SKILL.md"):
        rel = p.parent.relative_to(HERMES_SKILLS_DIR)
        hermes_skills.append({"name": rel.name if rel.parts else p.parent.name, "path": str(p.parent)})

    return {
        "vulcan_skills_dir": str(VULCAN_SKILLS_DIR),
        "hermes_skills_dir": str(HERMES_SKILLS_DIR),
        "vulcan_skills": vulcan_skills,
        "hermes_skills": hermes_skills,
    }
