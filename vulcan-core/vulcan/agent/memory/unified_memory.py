"""
UnifiedMemory — 三层统一记忆层
Layer 1 瞬时: 当前会话 KV（Redis）
Layer 2 短期: 向量检索（ChromaDB）
Layer 3 长期: SOUL.md 人格 + PostgreSQL 知识图谱
"""

import asyncio
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional

# Layer 1: Ephemeral (in-memory for now, can swap to Redis)
_ephemeral_store: dict[str, list[dict]] = {}


@dataclass
class MemoryEntry:
    id: str
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    timestamp: float
    metadata: dict

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


class EphemeralMemory:
    """Layer 1: 瞬时记忆 — 当前会话上下文。"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        if session_id not in _ephemeral_store:
            _ephemeral_store[session_id] = []

    async def add(self, role: str, content: str, metadata: dict = None) -> str:
        entry = MemoryEntry(
            id=str(uuid.uuid4())[:12],
            role=role,
            content=content,
            timestamp=time.time(),
            metadata=metadata or {},
        )
        _ephemeral_store[self.session_id].append(entry.to_dict())
        return entry.id

    async def get_history(self, limit: int = 50) -> list[dict]:
        return _ephemeral_store[self.session_id][-limit:]

    async def clear(self):
        _ephemeral_store[self.session_id] = []

    async def search(self, query: str, limit: int = 10) -> list[dict]:
        """简单关键词搜索。"""
        q = query.lower()
        return [
            e for e in _ephemeral_store[self.session_id]
            if q in e["content"].lower()
        ][-limit:]


class ShortTermMemory:
    """Layer 2: 短期记忆 — ChromaDB 向量检索。"""

    def __init__(self, persist_dir: str = "/tmp/vulcan_chroma"):
        self.persist_dir = persist_dir
        self._client = None
        self._collection = None
        self._lock = asyncio.Lock()

    async def initialize(self):
        if self._collection is not None:
            return
        async with self._lock:
            if self._collection is not None:
                return
            try:
                import chromadb
                from chromadb.config import Settings
                self._client = chromadb.Client(Settings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ))
                self._collection = self._client.get_or_create_collection(
                    "vulcan_short_term",
                    metadata={"hnsw:space": "cosine"}
                )
            except Exception as e:
                # ChromaDB not available, fall back gracefully
                import logging
                logging.getLogger(__name__).warning(f"ChromaDB init failed: {e}")
                self._collection = None

    async def add(self, text: str, metadata: dict = None) -> str:
        await self.initialize()
        if self._collection is None:
            return ""
        entry_id = str(uuid.uuid4())
        metadata = metadata or {}
        metadata["timestamp"] = time.time()
        self._collection.add(
            documents=[text],
            ids=[entry_id],
            metadatas=[metadata],
        )
        return entry_id

    async def retrieve(self, query: str, limit: int = 5) -> list[dict]:
        await self.initialize()
        if self._collection is None:
            return []
        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=limit,
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            return [
                {"content": doc, "metadata": meta}
                for doc, meta in zip(docs, metas)
            ]
        except Exception:
            return []

    async def reset(self):
        if self._client:
            self._client.delete_collection("vulcan_short_term")
            self._collection = None


class LongTermMemory:
    """Layer 3: 长期记忆 — SOUL.md 人格配置 + PostgreSQL 知识图谱。"""

    def __init__(self, soul_path: str = "/root/.hermes/SOUL.md"):
        self.soul_path = soul_path
        self._soul_content: Optional[str] = None
        self._graph_store: dict = {}  # Simple in-memory KG for now

    async def load_soul(self) -> str:
        """加载 SOUL.md 人格配置。"""
        if self._soul_content:
            return self._soul_content
        try:
            from pathlib import Path
            p = Path(self.soul_path)
            if p.exists():
                self._soul_content = p.read_text(encoding="utf-8")
            else:
                self._soul_content = ""
        except Exception:
            self._soul_content = ""
        return self._soul_content

    async def get_soul_context(self) -> str:
        """获取用于注入 system prompt 的 SOUL 内容。"""
        return await self.load_soul()

    async def add_fact(self, subject: str, predicate: str, object_: str):
        """添加知识图谱三元组。"""
        if subject not in self._graph_store:
            self._graph_store[subject] = {}
        if predicate not in self._graph_store[subject]:
            self._graph_store[subject][predicate] = []
        if object_ not in self._graph_store[subject][predicate]:
            self._graph_store[subject][predicate].append(object_)

    async def query_facts(self, subject: str, predicate: str = None) -> list:
        """查询知识图谱。"""
        if subject not in self._graph_store:
            return []
        if predicate:
            return self._graph_store[subject].get(predicate, [])
        # Return all predicates for subject
        return self._graph_store[subject]


class UnifiedMemory:
    """
    三层统一记忆对外接口。
    自动管理三层之间的信息流转。
    """

    def __init__(self, session_id: str = "default"):
        self.session_id = session_id
        self.ephemeral = EphemeralMemory(session_id)
        self.short_term = ShortTermMemory()
        self.long_term = LongTermMemory()

    async def add(
        self,
        role: str,
        content: str,
        metadata: dict = None,
        promote_to_long_term: bool = False,
    ) -> str:
        """添加记忆，自动进入对应层级。"""
        # Layer 1: Always add to ephemeral
        entry_id = await self.ephemeral.add(role, content, metadata)

        # Also add to short-term (vector)
        await self.short_term.add(content, metadata={"role": role, **metadata or {}})

        # Optional: promote to long-term
        if promote_to_long_term and role == "system":
            await self.long_term.load_soul()

        return entry_id

    async def retrieve(self, query: str, limit: int = 10) -> list[dict]:
        """从三层记忆检索，合并结果。"""
        results = []

        # Ephemeral: keyword match
        ephemeral_hits = await self.ephemeral.search(query, limit=limit)
        for h in ephemeral_hits:
            h["layer"] = "ephemeral"
            results.append(h)

        # Short-term: vector search
        st_hits = await self.short_term.retrieve(query, limit=limit)
        for h in st_hits:
            h["layer"] = "short_term"
            results.append(h)

        # Long-term: KG + SOUL
        soul = await self.long_term.get_soul_context()
        if soul and query.lower() in soul.lower():
            results.append({"content": soul[:500], "layer": "long_term", "metadata": {}})

        # Dedupe by content
        seen = set()
        deduped = []
        for r in results:
            key = r["content"][:100]
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped[:limit]

    async def get_conversation_history(self, limit: int = 50) -> list[dict]:
        """获取会话历史（Layer 1）。"""
        return await self.ephemeral.get_history(limit=limit)

    async def get_system_prompt(self) -> str:
        """构建 system prompt（含 SOUL 人格）。"""
        soul = await self.long_term.get_soul_context()
        base = (
            "You are Vulcan, an AI Agent built on a dual-core architecture.\n"
            "Your goal is to help users accomplish tasks efficiently.\n"
        )
        if soul:
            base += f"\n[Soul/Persona]\n{soul}\n"
        return base
