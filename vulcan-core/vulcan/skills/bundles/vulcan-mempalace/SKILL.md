---
name: vulcan-mempalace
description: "MemPalace 4-Layer Memory for Vulcan — L0 Identity (~100 tokens) + L1 Story (~500-800) + L2 On-Demand + L3 Deep Search via ChromaDB. 50k⭐ top-tier AI memory, integrated as Vulcan UnifiedMemory layer."
version: 3.3.3
homepage: https://github.com/MemPalace/mempalace
user-invocable: true
metadata:
  vulcan:
    emoji: "🏛️"
    os: [darwin, linux, win32]
    requires:
      anyBins: [python3]
    install:
      - label: "MemPalace (bundled with Vulcan)"
        kind: local
        source: vulcan-memory-mempalace
---

# MemPalace — 4-Layer Memory for Vulcan

MemPalace is a **50k⭐** local AI memory system with near-perfect recall. It uses a **palace metaphor** (wings/rooms/drawers) and a 4-layer memory architecture that keeps context windows lean while storing unlimited memories.

Vulcan integrates MemPalace as a **first-class UnifiedMemory layer** — specifically as the L3 Deep Search and cross-session memory backbone.

## 4-Layer Architecture

| Layer | Name | Tokens | Purpose |
|-------|------|--------|---------|
| **L0** | Identity | ~100 | Always loaded. "Who am I?" from `~/.mempalace/identity.txt` |
| **L1** | Essential Story | ~500-800 | Always loaded. Auto-generated top moments from the palace |
| **L2** | On-Demand | ~200-500 each | Loaded when a topic/wing comes up |
| **L3** | Deep Search | unlimited | Full ChromaDB semantic search |

**Wake-up cost: ~600-900 tokens** (L0+L1). Leaves 95%+ of context window free.

## Palace Metaphor

- **Wings** = people or projects (e.g., `emotions`, `technical`, `family`)
- **Halls** = categories (facts, events, preferences, advice)
- **Rooms** = specific topics within a wing
- **Drawers** = individual memory chunks (verbatim text)
- **Knowledge Graph** = temporal entity-relationship facts

## Quick Start

```python
from vulcan.memory.mempalace_integration import get_mempalace

mp = get_mempalace()

# L0 + L1: Wake-up (~600-900 tokens) — inject into system prompt
wake_up_text = mp.wake_up()

# L2: On-demand retrieval by wing/room
recall = mp.recall(wing="technical", n_results=10)

# L3: Deep semantic search
results = mp.search("database performance optimization")
results_raw = mp.search_raw("Python async patterns")

# Set identity
mp.set_identity("I am Vulcan, an AI coding assistant...")

# Get palace status
status = mp.status()
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/mempalace/health` | Health check |
| `GET` | `/mempalace/status` | Layer status + drawer count |
| `GET` | `/mempalace/identity` | L0: Get identity text |
| `POST` | `/mempalace/identity` | L0: Set identity text |
| `GET` | `/mempalace/wake-up?wing=NAME` | L0+L1: Wake-up text |
| `GET` | `/mempalace/recall?wing=X&room=Y&n=10` | L2: On-demand |
| `GET` | `/mempalace/search?q=QUERY&n=5` | L3: Deep search |
| `GET` | `/mempalace/wings` | List wings with counts |
| `POST` | `/mempalace/mine` | Ingest project files |
| `POST` | `/mempalace/convo-import` | Import conversations |

## Usage in Vulcan

### For VulcanPlanner
```python
# Before generating a plan, inject L0+L1 into system prompt
mp = get_mempalace()
system_context = mp.wake_up(wing="vulcan")  # optional wing filter
```

### For VulcanExecutor
```python
# During tool execution, search past relevant memories
relevant = mp.search("how did we handle error X last time?")
```

### For VulcanMemory
MemPalace is the **L3 layer** in Vulcan's UnifiedMemory:
- L1: Session buffer (current conversation)
- L2: Redis (recent context)
- L3: MemPalace (cross-session, semantic)

## Palace Location

- Palace path: `~/.mempalace/palace` (configurable via `MEMPALACE_PALACE_PATH`)
- Identity file: `~/.mempalace/identity.txt`
- Collection: `mempalace_drawers` (ChromaDB)
- Config: `~/.mempalace/config.json`

## MCP Server

MemPalace also ships an MCP server for Claude Code, Cursor, and other MCP hosts:

```json
{
  "mcpServers": {
    "mempalace": {
      "command": "python3",
      "args": ["-m", "mempalace.mcp_server"]
    }
  }
}
```

Vulcan's MemPalace integration provides the same MCP-compatible API via FastAPI.

## Credits

MemPalace by [MemPalace Team](https://github.com/MemPalace/mempalace) — 50k⭐, MIT license.
Vulcan integration by Vulcan Team.
