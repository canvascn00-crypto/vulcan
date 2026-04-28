"""
Skill Marketplace — Browse and install skills from Vulcan's skill registry.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
import yaml

from .skill_forge import (
    SkillBundle, SkillForge, SkillMeta, SkillSource, SkillStatus, TrustLevel,
    get_forge,
)

logger = logging.getLogger("Vulcan.SkillMarketplace")


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

MARKETPLACE_INDEX_URL = "https://raw.githubusercontent.com/vulcan-ai/skillhub/main/index.json"
INDEX_CACHE_TTL = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Marketplace entry
# ---------------------------------------------------------------------------

@dataclass
class MarketplaceEntry:
    name: str
    description: str
    source: str          # "vulcan", "clawhub", "github"
    identifier: str       # source-specific ID
    repo: Optional[str] = None
    path: Optional[str] = None
    trust_level: TrustLevel = TrustLevel.COMMUNITY
    version: str = "1.0.0"
    author: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    rating: float = 0.0
    install_count: int = 0
    extra: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Marketplace client
# ---------------------------------------------------------------------------

class MarketplaceClient:
    """
    Fetches skill listings from remote marketplaces.
    Currently supports: clawhub (hermes official), GitHub raw URLs.
    """

    def __init__(self):
        self._cache: dict[str, tuple[float, list[MarketplaceEntry]]] = {}
        self._http = httpx.Client(timeout=15.0)

    def close(self):
        self._http.close()

    def _get_cache(self, url: str) -> Optional[list[MarketplaceEntry]]:
        if url in self._cache:
            ts, data = self._cache[url]
            if time.time() - ts < INDEX_CACHE_TTL:
                return data
        return None

    def _set_cache(self, url: str, data: list[MarketplaceEntry]):
        self._cache[url] = (time.time(), data)

    def search(self, query: str, source: Optional[str] = None, limit: int = 20) -> list[MarketplaceEntry]:
        """
        Search the marketplace. Falls back to local Vulcan skills if offline.
        """
        # Try clawhub (Hermes official marketplace)
        entries = self._search_clawhub(query, limit)
        if entries:
            self._set_cache("clawhub", entries)
            return entries[:limit]
        # Fallback to local skills
        forge = get_forge()
        local = forge.search(query, limit=limit)
        return [
            MarketplaceEntry(
                name=m.name,
                description=m.description,
                source=m.source.value,
                identifier=m.name,
                trust_level=m.trust_level,
                version=m.version,
                author=m.author,
                tags=m.tags,
                rating=m.rating,
            )
            for m in local
        ]

    def _search_clawhub(self, query: str, limit: int) -> list[MarketplaceEntry]:
        """Try to fetch from Hermes clawhub (inherited marketplace)."""
        try:
            # Try the skills index from Hermes official repo
            resp = self._http.get(
                "https://raw.githubusercontent.com/dustin-vulcan/hermes-skills/main/index.json",
                timeout=10.0,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            q = query.lower()
            results = []
            for item in data:
                name = item.get("name", "")
                desc = item.get("description", "")
                if q in name.lower() or q in desc.lower():
                    results.append(MarketplaceEntry(
                        name=name,
                        description=desc,
                        source="clawhub",
                        identifier=item.get("identifier", name),
                        repo=item.get("repo"),
                        path=item.get("path"),
                        tags=item.get("tags", []),
                        rating=item.get("rating", 0.0),
                        install_count=item.get("install_count", 0),
                        extra=item,
                    ))
            return results[:limit]
        except Exception:
            return []

    def fetch_bundle(self, source: str, identifier: str) -> Optional[SkillBundle]:
        """Download a skill bundle from a marketplace."""
        if source == "clawhub":
            return self._fetch_clawhub(identifier)
        elif source == "github":
            return self._fetch_github(identifier)
        return None

    def _fetch_clawhub(self, identifier: str) -> Optional[SkillBundle]:
        """Fetch a skill from clawhub by name or path."""
        try:
            # Try GitHub raw content
            url = f"https://raw.githubusercontent.com/dustin-vulcan/hermes-skills/main/{identifier}/SKILL.md"
            resp = self._http.get(url, timeout=10.0)
            if resp.status_code != 200:
                return None
            content = resp.text
            fm = self._parse_frontmatter(content)
            meta = self._fm_to_meta(fm, content)
            meta.source = SkillSource.MARKETPLACE
            meta.source_path = identifier
            return SkillBundle(meta=meta, content=content)
        except Exception:
            return None

    def _fetch_github(self, identifier: str) -> Optional[SkillBundle]:
        """
        Fetch a skill from a raw GitHub URL or 'owner/repo/path' spec.
        identifier examples:
          - 'https://raw.githubusercontent.com/owner/repo/main/skills/my-skill/SKILL.md'
          - 'owner/repo/path/to/skill'
        """
        try:
            if identifier.startswith("http"):
                url = identifier if identifier.endswith("SKILL.md") else f"{identifier}/SKILL.md"
            else:
                parts = identifier.split("/")
                if len(parts) >= 3:
                    owner, repo, *path_parts = parts
                    path = "/".join(path_parts)
                    url = f"https://raw.githubusercontent.com/{owner}/{repo}/main/{path}/SKILL.md"
                else:
                    return None
            resp = self._http.get(url, timeout=10.0)
            if resp.status_code != 200:
                return None
            content = resp.text
            fm = self._parse_frontmatter(content)
            meta = self._fm_to_meta(fm, content)
            meta.source = SkillSource.GITHUB
            meta.source_path = identifier
            return SkillBundle(meta=meta, content=content)
        except Exception:
            return None

    def _parse_frontmatter(self, content: str) -> dict:
        match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
        if not match:
            return {}
        try:
            return yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            return {}

    def _fm_to_meta(self, fm: dict, content: str) -> SkillMeta:
        from .skill_forge import parse_trigger
        trigger = parse_trigger(fm.get("trigger", ""))
        tools = fm.get("tools", [])
        if isinstance(tools, str):
            tools = [tools]
        return SkillMeta(
            name=fm.get("name", "unknown"),
            description=fm.get("description", ""),
            trigger=trigger,
            tools=tools,
            version=str(fm.get("version", "1.0.0")),
            author=fm.get("author"),
            tags=fm.get("tags", []) if isinstance(fm.get("tags"), list) else [],
            extra=fm,
        )


# ---------------------------------------------------------------------------
# Skill installer with quarantine
# ---------------------------------------------------------------------------

class SkillInstaller:
    """
    Installs skills with mandatory security scan.
    - Downloads bundle
    - Puts in quarantine directory
    - Scans content (basic pattern check)
    - Installs to VULCAN_SKILLS_DIR on pass
    """

    def __init__(self, forge: SkillForge):
        self.forge = forge
        self.client = MarketplaceClient()

    def install_from_marketplace(self, source: str, identifier: str) -> dict[str, Any]:
        """Install a skill from marketplace. Returns result dict."""
        bundle = self.client.fetch_bundle(source, identifier)
        if not bundle:
            return {"ok": False, "error": f"Could not fetch skill '{identifier}' from {source}"}
        return self._install_bundle(bundle)

    def install_from_path(self, local_path: str) -> dict[str, Any]:
        """Install a local skill directory."""
        p = Path(local_path)
        skill_md = p / "SKILL.md"
        if not skill_md.exists():
            return {"ok": False, "error": f"No SKILL.md found in {local_path}"}
        content = skill_md.read_text(encoding="utf-8")
        fm = self._parse_fm(content)
        meta = self._fm_to_meta(fm)
        meta.source = SkillSource.VULCAN
        meta.source_path = str(p)
        bundle = SkillBundle(meta=meta, content=content)
        return self._install_bundle(bundle)

    def _install_bundle(self, bundle: SkillBundle) -> dict[str, Any]:
        """Run quarantine scan then install."""
        scan = self._quarantine_scan(bundle)
        if not scan["passed"]:
            return {"ok": False, "error": f"Security scan failed: {scan['reason']}"}
        self.forge.install(bundle)
        return {"ok": True, "skill": bundle.meta.name, "version": bundle.meta.version}

    def _quarantine_scan(self, bundle: SkillBundle) -> dict[str, bool]:
        """
        Basic security scan: check for suspicious patterns in content.
        """
        dangerous = [
            r"eval\s*\(",        # eval injection
            r"exec\s*\(",        # exec injection
            r"__import__",       # dynamic import
            r"subprocess\.run.*shell\s*=\s*True",
            r"os\.system\s*\(",
            r"pickle\.load",
            r"yaml\.unsafe_load",
        ]
        content_lower = bundle.content.lower()
        for pat in dangerous:
            if re.search(pat, bundle.content, re.IGNORECASE):
                return {"passed": False, "reason": f"Dangerous pattern detected: {pat}"}
        return {"passed": True}

    def _parse_fm(self, content: str) -> dict:
        match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
        if not match:
            return {}
        try:
            return yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            return {}

    def _fm_to_meta(self, fm: dict) -> SkillMeta:
        from .skill_forge import parse_trigger
        trigger = parse_trigger(fm.get("trigger", ""))
        tools = fm.get("tools", [])
        if isinstance(tools, str):
            tools = [tools]
        return SkillMeta(
            name=fm.get("name", "unknown"),
            description=fm.get("description", ""),
            trigger=trigger,
            tools=tools,
            version=str(fm.get("version", "1.0.0")),
            author=fm.get("author"),
            tags=fm.get("tags", []) if isinstance(fm.get("tags"), list) else [],
            extra=fm,
        )


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

_marketplace: Optional[MarketplaceClient] = None


def get_marketplace() -> MarketplaceClient:
    global _marketplace
    if _marketplace is None:
        _marketplace = MarketplaceClient()
    return _marketplace
