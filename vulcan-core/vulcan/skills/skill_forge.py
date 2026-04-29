"""
Vulcan SkillForge — Universal skill registry with Hermes inheritance.

Scans and manages skills from:
  - Vulcan's own registry (~/.vulcan/skills/)
  - Hermes legacy registry (~/.hermes/skills/) — backward compatible

Each skill is a directory containing a SKILL.md with YAML frontmatter:
  ---
  name: skill-name
  description: What the skill does
  trigger: When to invoke this skill
  tools: [terminal, execute_code, ...]
  ---

  # Skill Title
  ...
"""

from __future__ import annotations

import hashlib
import importlib.util
import logging
import os
import re
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

import yaml

logger = logging.getLogger("Vulcan.SkillForge")


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

import os as _os
_home = _os.path.expanduser("~")

VULCAN_HOME = Path(os.environ.get("VULCAN_HOME", str(Path(_home) / ".vulcan")))
VULCAN_SKILLS_DIR = VULCAN_HOME / "skills"
HERMES_SKILLS_DIR = Path(_home) / ".hermes" / "skills"
# Vulcan's built-in skill bundles (shipped with the package)
_VULCAN_BUNDLES = Path(__file__).parent / "bundles"
HUB_DIR = VULCAN_SKILLS_DIR / ".hub"
LOCK_FILE = HUB_DIR / "lock.json"
AUDIT_LOG = HUB_DIR / "audit.log"
QUARANTINE_DIR = HUB_DIR / "quarantine"
INDEX_CACHE_DIR = HUB_DIR / "index-cache"


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SkillSource(str, Enum):
    VULCAN = "vulcan"           # Vulcan's own skill registry
    HERMES_LEGACY = "hermes"    # Inherited from Hermes
    GITHUB = "github"           # From GitHub URL
    MARKETPLACE = "marketplace" # From Vulcan marketplace


class SkillStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    QUARANTINE = "quarantine"
    OUTDATED = "outdated"


class TrustLevel(str, Enum):
    BUILTIN = "builtin"    # Ships with Vulcan
    TRUSTED = "trusted"   # From Hermes or verified source
    COMMUNITY = "community"  # From marketplace


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SkillTrigger:
    patterns: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    tools_required: list[str] = field(default_factory=list)


@dataclass
class SkillMeta:
    """Minimal skill metadata parsed from SKILL.md frontmatter."""
    name: str
    description: str
    trigger: SkillTrigger = field(default_factory=SkillTrigger)
    tools: list[str] = field(default_factory=list)
    source: SkillSource = SkillSource.VULCAN
    source_path: Optional[str] = None
    trust_level: TrustLevel = TrustLevel.COMMUNITY
    version: str = "1.0.0"
    author: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    status: SkillStatus = SkillStatus.ACTIVE
    installed_at: Optional[str] = None
    last_used: Optional[str] = None
    use_count: int = 0
    rating: float = 0.0
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class SkillBundle:
    """A downloaded skill ready for installation."""
    meta: SkillMeta
    content: str  # Full SKILL.md content
    readme_content: str = ""
    references: dict[str, str] = field(default_factory=dict)  # name -> path


# ---------------------------------------------------------------------------
# Core scanner
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
_TAG_RE = re.compile(r"<([a-z]+)[^>]*>(.*?)</\1>", re.DOTALL)


def parse_frontmatter(content: str) -> dict[str, Any]:
    """Parse YAML frontmatter from SKILL.md content."""
    match = _FRONTMATTER_RE.match(content)
    if not match:
        return {}
    try:
        return yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}


def parse_trigger(trigger_text: str | list[str] | None) -> SkillTrigger:
    """Parse trigger field into structured SkillTrigger."""
    if not trigger_text:
        return SkillTrigger()
    texts = [trigger_text] if isinstance(trigger_text, str) else trigger_text
    keywords = []
    patterns = []
    for text in texts:
        keywords.extend([k.strip() for k in text.split(",") if k.strip()])
        patterns.extend(re.findall(r'[`"\']([^`"\']+)[`"\']', text))
    return SkillTrigger(keywords=keywords, patterns=patterns)


def scan_skill_file(skill_path: Path) -> Optional[SkillMeta]:
    """Scan a single SKILL.md and return SkillMeta."""
    try:
        content = skill_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    fm = parse_frontmatter(content)
    if not fm.get("name"):
        return None

    trigger_raw = fm.get("trigger", "")
    trigger = parse_trigger(trigger_raw)
    tools_raw = fm.get("tools", [])
    tools = tools_raw if isinstance(tools_raw, list) else [tools_raw]

    # Determine source
    skill_dir = skill_path.parent
    if str(skill_dir).startswith(str(VULCAN_SKILLS_DIR)):
        source = SkillSource.VULCAN
    elif str(skill_dir).startswith(str(HERMES_SKILLS_DIR)):
        source = SkillSource.HERMES_LEGACY
    else:
        source = SkillSource.VULCAN

    # Trust level
    if source == SkillSource.VULCAN and "optional-skills" not in str(skill_dir):
        trust = TrustLevel.BUILTIN
    elif source == SkillSource.HERMES_LEGACY:
        trust = TrustLevel.TRUSTED
    else:
        trust = TrustLevel.COMMUNITY

    return SkillMeta(
        name=fm.get("name", skill_path.stem),
        description=fm.get("description", ""),
        trigger=trigger,
        tools=tools,
        source=source,
        source_path=str(skill_path.parent),
        trust_level=trust,
        version=str(fm.get("version", "1.0.0")),
        author=fm.get("author"),
        tags=fm.get("tags", []) if isinstance(fm.get("tags"), list) else [],
        extra=fm,
    )


def scan_skill_dir(skill_dir: Path) -> list[SkillMeta]:
    """Scan all SKILL.md files in a skill directory (recursive)."""
    metas = []
    if not skill_dir.exists():
        return metas
    for md_path in skill_dir.rglob("SKILL.md"):
        meta = scan_skill_file(md_path)
        if meta:
            metas.append(meta)
    return metas


# ---------------------------------------------------------------------------
# SkillForge Registry
# ---------------------------------------------------------------------------

class SkillForge:
    """
    Central skill registry. Inherits skills from Hermes (~/.hermes/skills/)
    and maintains Vulcan's own registry (~/.vulcan/skills/).

    Usage:
        forge = SkillForge()
        forge.reload()
        skills = forge.all_skills()
        skill = forge.get("article-card-gen")
        forge.enable("my-skill")
        forge.disable("my-skill")
    """

    def __init__(self):
        self._skills: dict[str, SkillMeta] = {}
        self._lock_file = LOCK_FILE
        self._ensure_dirs()

    def _ensure_dirs(self):
        """Ensure all required directories exist."""
        for d in [VULCAN_SKILLS_DIR, HUB_DIR, QUARANTINE_DIR, INDEX_CACHE_DIR]:
            d.mkdir(parents=True, exist_ok=True)

    # ---- reload -------------------------------------------------------------

    def reload(self):
        """Full reload: scan Vulcan registry + Hermes legacy registry."""
        self._skills.clear()

        # Scan Vulcan built-in bundles first (highest priority)
        if _VULCAN_BUNDLES.exists():
            for meta in scan_skill_dir(_VULCAN_BUNDLES):
                self._skills[meta.name] = meta

        # Scan Vulcan user skills (override built-ins)
        for meta in scan_skill_dir(VULCAN_SKILLS_DIR):
            self._skills[meta.name] = meta

        # Merge Hermes legacy skills (don't override Vulcan overrides)
        for meta in scan_skill_dir(HERMES_SKILLS_DIR):
            if meta.name not in self._skills:
                self._skills[meta.name] = meta

        # Load disabled list
        self._load_lock()

    # ---- lock file ----------------------------------------------------------

    def _load_lock(self):
        if not self._lock_file.exists():
            return
        try:
            data = json.loads(self._lock_file.read_text())
        except Exception:
            return
        disabled = data.get("disabled_skills", {})
        for name, info in disabled.items():
            if name in self._skills:
                self._skills[name].status = SkillStatus.DISABLED
                self._skills[name].use_count = info.get("use_count", 0)

    def _save_lock(self):
        self._ensure_dirs()
        disabled = {
            name: {"use_count": m.use_count, "last_used": m.last_used}
            for name, m in self._skills.items()
            if m.status == SkillStatus.DISABLED
        }
        data = {"disabled_skills": disabled, "updated_at": datetime.now().isoformat()}
        self._lock_file.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    # ---- accessors ----------------------------------------------------------

    def all_skills(self) -> list[SkillMeta]:
        return list(self._skills.values())

    def get(self, name: str) -> Optional[SkillMeta]:
        return self._skills.get(name)

    def get_content(self, name: str) -> Optional[str]:
        """Return full SKILL.md content for a skill."""
        meta = self._get_with_source(name)
        if not meta or not meta.source_path:
            return None
        skill_md = Path(meta.source_path) / "SKILL.md"
        if skill_md.exists():
            return skill_md.read_text(encoding="utf-8")
        return None

    def _get_with_source(self, name: str) -> Optional[SkillMeta]:
        return self._skills.get(name)

    def search(self, query: str, source: Optional[SkillSource] = None,
               trust: Optional[TrustLevel] = None,
               tool: Optional[str] = None,
               status: Optional[SkillStatus] = None,
               limit: int = 50) -> list[SkillMeta]:
        """Full-text search across skills."""
        q = query.lower()
        results = []
        for meta in self._skills.values():
            if source and meta.source != source:
                continue
            if trust and meta.trust_level != trust:
                continue
            if tool and tool not in meta.tools:
                continue
            if status and meta.status != status:
                continue
            score = 0
            if q in meta.name.lower():
                score += 10
            if q in meta.description.lower():
                score += 5
            if any(q in t.lower() for t in meta.trigger.keywords):
                score += 3
            if any(q in tag.lower() for tag in meta.tags):
                score += 2
            if score > 0:
                results.append((score, meta))
        results.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in results[:limit]]

    # ---- actions ------------------------------------------------------------

    def enable(self, name: str) -> bool:
        if name not in self._skills:
            return False
        self._skills[name].status = SkillStatus.ACTIVE
        self._save_lock()
        self._audit(f"enable", name)
        return True

    def disable(self, name: str) -> bool:
        if name not in self._skills:
            return False
        self._skills[name].status = SkillStatus.DISABLED
        self._save_lock()
        self._audit(f"disable", name)
        return True

    def increment_use(self, name: str):
        if name in self._skills:
            self._skills[name].use_count += 1
            self._skills[name].last_used = datetime.now().isoformat()
            self._save_lock()

    def install(self, bundle: SkillBundle) -> bool:
        """Install a skill bundle into Vulcan registry."""
        dest = VULCAN_SKILLS_DIR / bundle.meta.name
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "SKILL.md").write_text(bundle.content, encoding="utf-8")
        for ref_name, ref_content in bundle.references.items():
            ref_path = dest / ref_name
            ref_path.parent.mkdir(parents=True, exist_ok=True)
            ref_path.write_text(ref_content, encoding="utf-8")
        bundle.meta.status = SkillStatus.ACTIVE
        bundle.meta.installed_at = datetime.now().isoformat()
        self._skills[bundle.meta.name] = bundle.meta
        self._audit(f"install", bundle.meta.name)
        return True

    def uninstall(self, name: str) -> bool:
        if name not in self._skills:
            return False
        skill_dir = VULCAN_SKILLS_DIR / name
        if skill_dir.exists():
            shutil.rmtree(skill_dir)
        del self._skills[name]
        self._audit(f"uninstall", name)
        return True

    def set_rating(self, name: str, rating: float):
        if name in self._skills:
            self._skills[name].rating = max(0.0, min(5.0, rating))
            self._save_lock()

    # ---- audit --------------------------------------------------------------

    def _audit(self, action: str, skill_name: str):
        line = json.dumps({
            "ts": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "skill": skill_name,
        }, ensure_ascii=False)
        self._ensure_dirs()
        with open(AUDIT_LOG, "a") as f:
            f.write(line + "\n")

    # ---- trigger matching ---------------------------------------------------

    def match_triggers(self, text: str, tools_available: Optional[list[str]] = None) -> list[SkillMeta]:
        """
        Find skills whose trigger patterns/keywords match the given text.
        Used by the agent to auto-invoke skills.
        """
        text_lower = text.lower()
        candidates = []
        for meta in self._skills.values():
            if meta.status != SkillStatus.ACTIVE:
                continue
            score = 0
            # Check keyword matches
            for kw in meta.trigger.keywords:
                if kw.lower() in text_lower:
                    score += 1
            # Check pattern matches
            for pat in meta.trigger.patterns:
                if re.search(pat, text, re.IGNORECASE):
                    score += 2
            # Tool availability check
            if tools_available and meta.tools:
                available = all(t in tools_available for t in meta.tools)
                if not available:
                    score = 0
            if score > 0:
                candidates.append((score, meta))
        candidates.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in candidates]

    # ---- stats --------------------------------------------------------------

    def stats(self) -> dict:
        total = len(self._skills)
        by_source = {}
        by_status = {}
        by_trust = {}
        for m in self._skills.values():
            by_source[m.source.value] = by_source.get(m.source.value, 0) + 1
            by_status[m.status.value] = by_status.get(m.status.value, 0) + 1
            by_trust[m.trust_level.value] = by_trust.get(m.trust_level.value, 0) + 1
        return {
            "total": total,
            "by_source": by_source,
            "by_status": by_status,
            "by_trust": by_trust,
        }


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

_forge: Optional[SkillForge] = None


def get_forge() -> SkillForge:
    global _forge
    if _forge is None:
        _forge = SkillForge()
        _forge.reload()
    return _forge


# ---------------------------------------------------------------------------
# Import helpers for json
# ---------------------------------------------------------------------------
import json
import shutil