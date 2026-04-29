"""
Vulcan SkillForge — Universal skill registry with legacy skill inheritance.
"""

from .marketplace import (
    MarketplaceClient,
    MarketplaceEntry,
    SkillInstaller,
    get_marketplace,
)
from .routes import router as skills_router
from .skill_forge import (
    LEGACY_SKILLS_DIR,
    QUARANTINE_DIR,
    VULCAN_HOME,
    VULCAN_SKILLS_DIR,
    HUB_DIR,
    LOCK_FILE,
    AUDIT_LOG,
    INDEX_CACHE_DIR,
    SkillBundle,
    SkillForge,
    SkillMeta,
    SkillSource,
    SkillStatus,
    SkillTrigger,
    TrustLevel,
    get_forge,
    scan_skill_dir,
    scan_skill_file,
)

__all__ = [
    # Core
    "SkillForge",
    "SkillMeta",
    "SkillBundle",
    "SkillTrigger",
    "SkillSource",
    "SkillStatus",
    "TrustLevel",
    # Paths
    "VULCAN_HOME",
    "VULCAN_SKILLS_DIR",
    "LEGACY_SKILLS_DIR",
    "HUB_DIR",
    "QUARANTINE_DIR",
    "LOCK_FILE",
    "AUDIT_LOG",
    "INDEX_CACHE_DIR",
    # Functions
    "get_forge",
    "scan_skill_dir",
    "scan_skill_file",
    # Marketplace
    "MarketplaceClient",
    "MarketplaceEntry",
    "SkillInstaller",
    "get_marketplace",
    # Router
    "skills_router",
]
