"""
MemPalace 4-Layer Memory Integration for Vulcan
================================================
Wraps MemPalace's MemoryStack (L0/L1/L2/L3) as a Vulcan-native memory backend.

Usage:
    from vulcan.memory.mempalace_integration import VulcanMemPalace
    mp = VulcanMemPalace()
    mp.wake_up()           # L0 + L1 — inject into system prompt
    mp.search("query")      # L3 deep semantic search
    mp.recall(wing="tech")  # L2 on-demand retrieval
    mp.mine("/path/to/project")  # ingest project files
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger("Vulcan.MemPalace")

# ---------------------------------------------------------------------------
# MemPalace source path (vendored in vulcan/memory/mempalace/)
# ---------------------------------------------------------------------------
_MEMPALACE_SRC = Path(__file__).parent / "mempalace"
sys.path.insert(0, str(_MEMPALACE_SRC.parent))

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEFAULT_PALACE_PATH = os.environ.get(
    "MEMPALACE_PALACE_PATH",
    os.path.expanduser("~/.mempalace/palace")
)
DEFAULT_IDENTITY_PATH = os.path.expanduser("~/.mempalace/identity.txt")
DEFAULT_COLLECTION = "mempalace_drawers"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------
class MemPalaceError(Exception):
    """Base error for MemPalace integration."""


class MemPalaceNotInstalled(MemPalaceError):
    """MemPalace is not installed or source not found."""


# ---------------------------------------------------------------------------
# Wrapper around MemPalace MemoryStack
# ---------------------------------------------------------------------------

def _import_mempalace():
    """Lazy-import MemPalace components after source is on sys.path."""
    try:
        # We import from the vendored mempalace
        from mempalace.layers import MemoryStack, Layer0, Layer1, Layer2, Layer3
        from mempalace.config import MempalaceConfig
        return MemoryStack, Layer0, Layer1, Layer2, Layer3, MempalaceConfig
    except ImportError as e:
        raise MemPalaceNotInstalled(
            f"MemPalace source not found at {_MEMPALACE_SRC}. "
            "Run: git clone https://github.com/MemPalace/mempalace.git "
            f"  into {_MEMPALACE_SRC.parent}"
        ) from e


class VulcanMemPalace:
    """
    Vulcan wrapper for MemPalace 4-layer memory system.

    Wake-up cost: ~600-900 tokens (L0+L1). Leaves 95%+ of context window free.

    Architecture:
        L0: Identity (~100 tokens) — ~/.mempalace/identity.txt
        L1: Essential Story (~500-800 tokens) — auto-generated top moments
        L2: On-Demand (~200-500 tokens) — wing/room filtered retrieval
        L3: Deep Search (unlimited) — ChromaDB semantic search

    Integration points:
        - VulcanPlanner: calls wake_up() before generating plan
        - VulcanExecutor: calls search()/recall() during tool execution
        - VulcanMemory: MemPalace as the Long-Term layer (L3)
    """

    def __init__(
        self,
        palace_path: Optional[str] = None,
        identity_path: Optional[str] = None,
        collection_name: str = DEFAULT_COLLECTION,
    ):
        self.palace_path = palace_path or DEFAULT_PALACE_PATH
        self.identity_path = identity_path or DEFAULT_IDENTITY_PATH
        self.collection_name = collection_name
        self._stack = None
        self._config = None

    @property
    def stack(self):
        """Lazy-load the MemoryStack."""
        if self._stack is None:
            MemoryStack, _, _, _, _, MempalaceConfig = _import_mempalace()
            self._config = MempalaceConfig()
            self._stack = MemoryStack(
                palace_path=self.palace_path,
                identity_path=self.identity_path,
            )
        return self._stack

    # ── Layer 0: Identity ──────────────────────────────────────────────────

    def get_identity(self) -> str:
        """L0: Get identity text from ~/.mempalace/identity.txt"""
        try:
            MemoryStack, _, _, _, _, _ = _import_mempalace()
            l0 = MemoryStack(self.palace_path, self.identity_path).l0
            return l0.render()
        except Exception as e:
            logger.warning(f"Failed to load identity: {e}")
            return "## L0 — IDENTITY\nIdentity not configured."

    def set_identity(self, text: str) -> dict:
        """Write identity text to ~/.mempalace/identity.txt"""
        path = Path(self.identity_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text.strip(), encoding="utf-8")
        try:
            path.chmod(0o600)
        except (OSError, NotImplementedError):
            pass
        # Invalidate cache
        if self._stack:
            self._stack.l0._text = text.strip()
        return {"identity_path": str(path), "bytes": len(text)}

    # ── Layer 0+1: Wake-up ─────────────────────────────────────────────────

    def wake_up(self, wing: Optional[str] = None) -> str:
        """
        L0 + L1: Generate wake-up text (~600-900 tokens).
        Inject into system prompt before conversation starts.

        Args:
            wing: Optional wing filter (project-specific wake-up)

        Returns:
            str: Formatted wake-up text with identity and essential story
        """
        try:
            return self.stack.wake_up(wing=wing)
        except MemPalaceNotInstalled:
            return "## L0+L1 — MemPalace not installed\nInstall: git clone https://github.com/MemPalace/mempalace.git"
        except Exception as e:
            logger.error(f"wake_up failed: {e}")
            return f"## Wake-up failed: {e}"

    # ── Layer 2: On-Demand ─────────────────────────────────────────────────

    def recall(
        self,
        wing: Optional[str] = None,
        room: Optional[str] = None,
        n_results: int = 10,
    ) -> str:
        """
        L2: On-demand retrieval filtered by wing/room.
        Call when a specific topic or project comes up.

        Args:
            wing: Filter by wing (e.g., "technical", "emotions")
            room: Filter by room within wing
            n_results: Number of drawers to retrieve

        Returns:
            str: Formatted retrieval results
        """
        try:
            return self.stack.recall(wing=wing, room=room, n_results=n_results)
        except Exception as e:
            logger.error(f"recall failed: {e}")
            return f"## Recall failed: {e}"

    # ── Layer 3: Deep Search ───────────────────────────────────────────────

    def search(
        self,
        query: str,
        wing: Optional[str] = None,
        room: Optional[str] = None,
        n_results: int = 5,
    ) -> str:
        """
        L3: Deep semantic search against the full palace.
        Call when answering questions that need past context.

        Args:
            query: Natural language search query
            wing: Optional wing filter
            room: Optional room filter
            n_results: Number of results

        Returns:
            str: Formatted search results with similarity scores
        """
        try:
            return self.stack.search(
                query=query,
                wing=wing,
                room=room,
                n_results=n_results,
            )
        except Exception as e:
            logger.error(f"search failed: {e}")
            return f"## Search failed: {e}"

    def search_raw(
        self,
        query: str,
        wing: Optional[str] = None,
        room: Optional[str] = None,
        n_results: int = 5,
    ) -> list:
        """
        L3: Raw search results as list of dicts.
        Returns structured data instead of formatted text.
        """
        try:
            return self.stack.l3.search_raw(
                query=query,
                wing=wing,
                room=room,
                n_results=n_results,
            )
        except Exception as e:
            logger.error(f"search_raw failed: {e}")
            return []

    # ── Mining ────────────────────────────────────────────────────────────

    def mine(self, path: str, wing: Optional[str] = None) -> dict:
        """
        Ingest project files into the palace (runs mempalace miner).

        Args:
            path: Directory path to mine
            wing: Optional wing name override

        Returns:
            dict: Mining result with drawer count
        """
        try:
            MemoryStack, _, _, _, _, _ = _import_mempalace()
        except MemPalaceNotInstalled:
            return {"error": "MemPalace not installed", "drawers": 0}

        palace_flag = f"--palace={self.palace_path}" if self.palace_path != DEFAULT_PALACE_PATH else ""
        wing_flag = f"--wing={wing}" if wing else ""

        cmd = ["mempalace", "mine"]
        if palace_flag:
            cmd.append(palace_flag)
        if wing_flag:
            cmd.append(wing_flag)
        cmd.append(path)

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
            return {
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "returncode": result.returncode,
                "path": path,
                "wing": wing,
            }
        except FileNotFoundError:
            return {"error": "mempalace CLI not found in PATH", "drawers": 0}
        except subprocess.TimeoutExpired:
            return {"error": "Mining timed out (>5min)", "drawers": 0}
        except Exception as e:
            return {"error": str(e), "drawers": 0}

    def convo_import(self, path: str, format: str = "auto") -> dict:
        """
        Import conversation exports (Claude Code JSONL, ChatGPT JSON, etc.)
        into the palace.

        Args:
            path: Path to conversation file
            format: Format ("auto", "claude_code", "chatgpt", "slack", "text")

        Returns:
            dict: Import result
        """
        try:
            MemoryStack, _, _, _, _, _ = _import_mempalace()
        except MemPalaceNotInstalled:
            return {"error": "MemPalace not installed", "drawers": 0}

        cmd = ["mempalace", "convo-import", f"--format={format}", path]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            return {
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "returncode": result.returncode,
            }
        except FileNotFoundError:
            return {"error": "mempalace CLI not found", "drawers": 0}
        except subprocess.TimeoutExpired:
            return {"error": "Import timed out", "drawers": 0}
        except Exception as e:
            return {"error": str(e), "drawers": 0}

    # ── Status ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        """
        Return status of all 4 memory layers.

        Returns:
            dict: Layer status with drawer count
        """
        try:
            return self.stack.status()
        except MemPalaceNotInstalled:
            return {
                "error": "MemPalace not installed",
                "palace_path": self.palace_path,
                "total_drawers": 0,
            }
        except Exception as e:
            return {"error": str(e), "total_drawers": 0}

    def wings(self) -> list:
        """List all wings with drawer counts."""
        try:
            MemoryStack, _, _, _, _, _ = _import_mempalace()
            from mempalace.backends.chroma import ChromaBackend
            from mempalace.backends.base import PalaceRef

            backend = ChromaBackend()
            col = backend.get_collection(
                palace=PalaceRef(id="vulcan", local_path=self.palace_path),
                collection_name=self.collection_name,
                create=False,
            )

            # Get distinct wing values (ChromaDB doesn't have group-by,
            # so we fetch a sample to infer wings)
            result = col.get(limit=1000, include=["metadatas"])
            wing_counts: dict[str, int] = {}
            for meta in result.metadatas or []:
                wing = meta.get("wing", "unknown")
                wing_counts[wing] = wing_counts.get(wing, 0) + 1

            return [
                {"wing": w, "drawers": c}
                for w, c in sorted(wing_counts.items(), key=lambda x: -x[1])
            ]
        except Exception as e:
            logger.warning(f"wings() failed: {e}")
            return []

    # ── Palace graph ──────────────────────────────────────────────────────

    def graph_stats(self) -> dict:
        """Return palace graph statistics (rooms, tunnels)."""
        try:
            MemoryStack, _, _, _, _, _ = _import_mempalace()
            from mempalace.palace_graph import graph_stats

            return graph_stats(self.palace_path)
        except Exception as e:
            return {"error": str(e)}

    # ── Config ─────────────────────────────────────────────────────────────

    def configure(
        self,
        palace_path: Optional[str] = None,
        topic_wings: Optional[list] = None,
        hall_keywords: Optional[dict] = None,
    ) -> dict:
        """
        Update MemPalace configuration.

        Args:
            palace_path: Override palace path
            topic_wings: List of wing names
            hall_keywords: Dict mapping hall names to keyword lists

        Returns:
            dict: Updated config
        """
        _, _, _, _, _, MempalaceConfig = _import_mempalace()
        cfg = MempalaceConfig()

        if palace_path:
            self.palace_path = palace_path

        if topic_wings or hall_keywords:
            file_config = cfg._file_config
            if topic_wings:
                file_config["topic_wings"] = topic_wings
            if hall_keywords:
                file_config["hall_keywords"] = hall_keywords
            cfg._config_file.write_text(
                json.dumps(file_config, indent=2), encoding="utf-8"
            )
            # Reset stack to pick up new config
            self._stack = None

        return {
            "palace_path": self.palace_path,
            "identity_path": self.identity_path,
            "collection_name": self.collection_name,
        }


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_mempalace_instance: Optional[VulcanMemPalace] = None


def get_mempalace() -> VulcanMemPalace:
    """Get the global VulcanMemPalace instance."""
    global _mempalace_instance
    if _mempalace_instance is None:
        _mempalace_instance = VulcanMemPalace()
    return _mempalace_instance
