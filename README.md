# Vulcan 🌋

> **盗火者 · 将 AI 能力传递给每一个人**

Universal AI Agent Platform — Multi-model, multi-agent, 20+ channels, 60+ tools, built-in skill marketplace.

---

## 📦 各子系统部署方式

Vulcan 由 3 个独立子系统组成，每个都可以单独部署：

### 1. Vulcan Core（Agent 核心引擎）

**职责**：Agent 推理、工具调用、技能管理、记忆、多 Agent 协调

| 部署方式 | 命令 | 适用场景 |
|---------|------|---------|
| **直接运行** | `cd vulcan-core && pip install -r requirements.txt && python -m vulcan.main` | 开发调试 |
| **uvicorn** | `uvicorn vulcan.main:app --host 0.0.0.0 --port 8000` | 生产部署 |
| **systemd** | `sudo cp scripts/vulcan.service /etc/systemd/system/ && sudo systemctl enable vulcan` | 服务器常驻 |
| **Docker** | `docker compose up vulcan-api` | 容器化部署 |

依赖：Python 3.11+，无外部数据库要求

### 2. Vulcan Gateway（消息网关）

**职责**：20+ 平台适配（微信/Telegram/Discord/Slack/Email...），消息路由

| 部署方式 | 命令 | 适用场景 |
|---------|------|---------|
| **内置模式** | 随 Core 一起启动，共享进程 | 简化部署 |
| **独立进程** | `python -m vulcan_gateway` | 需要独立扩缩容 |
| **Docker** | `docker compose up vulcan-api`（Gateway 内嵌） | 容器化 |

配置文件：`config/gateway.yaml`

### 3. Vulcan WebUI（管理面板）

**职责**：Agent 管理、技能市场、模型配置、多 Agent 监控、记忆浏览

| 部署方式 | 命令 | 适用场景 |
|---------|------|---------|
| **开发模式** | `cd vulcan-webui && npm ci && npm run dev` | 前端开发 |
| **生产构建** | `npm run build` + nginx 托管 | 生产部署 |
| **Docker** | `docker compose up vulcan-webui` | 容器化（内置 nginx） |

### 一键全栈部署（Docker Compose）

```bash
# 克隆项目
git clone https://github.com/your-org/vulcan.git && cd vulcan

# 配置环境变量
cp config/.env.example .env
# 编辑 .env 填入 LLM API Key

# 启动全部服务
docker compose up -d

# 访问
# API:  http://localhost:8000
# WebUI: http://localhost:3000
```

### 一键全栈部署（裸机）

```bash
# 后端
cd vulcan-core && pip install -r requirements.txt
uvicorn vulcan.main:app --host 0.0.0.0 --port 8000 &

# 前端
cd ../vulcan-webui && npm ci && npm run build
# 用 nginx 托管 dist/ 目录，或 npm run dev 开发模式
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Vulcan Agent Core                     │
│                                                        │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  A2A Bus   │ │  Memory    │ │  Tool Registry   │  │
│  │  多Agent   │ │  统一记忆  │ │  60+ 工具        │  │
│  │  协作总线  │ │  语义搜索  │ │  自动发现        │  │
│  └────────────┘ └────────────┘ └──────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ SkillForge │ │  Executor  │ │  Observability   │  │
│  │  技能锻造  │ │  执行引擎  │ │  结构化日志      │  │
│  │  市场+管理 │ │  链式编排  │ │  全链路追踪      │  │
│  └────────────┘ └────────────┘ └──────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  Experts   │ │   RBAC     │ │  MemPalace       │  │
│  │  专家系统  │ │  权限控制  │ │  知识宫殿        │  │
│  │  意图拆解  │ │  角色鉴权  │ │  知识图谱        │  │
│  └────────────┘ └────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────┘
           │                    │
┌──────────┴────────────────────┴──────────┐
│            Vulcan Gateway                 │
│   20+ 平台适配器，消息路由，热更新        │
│   微信 │ Telegram │ Discord │ Slack │ ... │
└──────────────────────────────────────────┘
           │
┌──────────┴──────────────────────────────┐
│            Vulcan WebUI                  │
│   Agent管理 │ 技能市场 │ 模型配置 │ 监控 │
└─────────────────────────────────────────┘
```

---

## 🚀 核心优势详解

### 1. 🧠 多 Agent 协作（A2A Protocol）

**传统方案痛点**：需要手动开 tmux 窗口，靠脚本拼凑多 Agent 通信。

**Vulcan 方案**：
- **A2A 消息总线**：Agent 之间原生实时通信，零配置
- **角色编排**：coordinator → worker 模式，自动分配任务
- **Agent Pool**：动态池化管理，按需扩缩容
- **意图引擎 + 任务分解器**：自动将复杂任务拆解为子任务，分发给不同 Agent

```
用户请求 → IntentEngine → Decomposer → Orchestrator
                                              ↓
                         ┌────────────────────┼────────────────────┐
                         Agent-A            Agent-B             Agent-C
                         (搜索)             (分析)              (写作)
                         └────────────────────┼────────────────────┘
                                              ↓
                                         结果聚合 → 返回用户
```

### 2. 🔧 统一工具系统

**传统方案痛点**：工具散落在各处，手动管理，无编排能力。

**Vulcan 方案**：
- **60+ 内置工具**，自动发现，零配置接入
- **工具链编排**：将多个工具组合成 pipeline，一次调用完成复杂流程
- **速率限制**：per-tool 限流，保护 API 配额
- **自愈机制**：工具调用失败自动重试，指数退避
- **统一注册表**：所有工具通过 `VulcanToolRegistry` 统一管理

### 3. 💎 SkillForge 技能引擎

**传统方案痛点**：技能管理混乱，版本失控，无信任等级。

**Vulcan 方案**：
- **100+ 预装技能**，开箱即用
- **四级信任体系**：Builtin > Trusted > Community > Quarantine
- **多源安装**：GitHub URL、Marketplace、本地目录
- **版本管理**：技能更新检测，自动提示升级
- **热加载**：安装/卸载无需重启 Agent

### 4. 📡 20+ 平台适配

**传统方案痛点**：每个平台独立开发适配器，代码重复。

**Vulcan 方案**：
- **统一适配层**：`VulcanAdapterMixin` + 平台适配器，一套代码覆盖所有平台
- **消息路由**：Agent 不感知平台差异，统一消息格式
- **热更新配置**：修改 `gateway.yaml` 后自动生效
- **Stub 模式**：即使没有平台运行时，也能以降级模式工作

### 5. 🧩 统一记忆系统

**传统方案痛点**：对话记忆和长期知识分离，无语义搜索。

**Vulcan 方案**：
- **UnifiedMemory**：对话记忆 + 长期知识统一存储
- **MemPalace 知识宫殿**：基于知识图谱的长期记忆
  - 实体检测与注册
  - 语义搜索（向量检索）
  - 知识去重
  - 对话挖掘：从历史对话中自动提取知识
- **跨会话持久化**：重启后记忆不丢失

### 6. 📊 全链路可观测性

**传统方案痛点**：print() 调试，无格式，无追踪。

**Vulcan 方案**：
- **结构化日志**：JSON 格式，带 trace_id
- **请求追踪**：从用户消息到工具调用到返回结果，全链路追踪
- **日志等级**：DEBUG / INFO / WARNING / ERROR，按需过滤
- **ObservabilityPage**：WebUI 可视化查看日志和追踪

### 7. 🔐 RBAC 权限控制

**传统方案痛点**：无权限体系，任何用户都能执行任何操作。

**Vulcan 方案**：
- **角色定义**：admin / operator / viewer
- **API 级别鉴权**：每个路由可配置权限要求
- **平台级别隔离**：不同平台用户权限独立

### 8. 🎯 专家系统

**传统方案痛点**：单一 Agent 处理所有任务，专业性不足。

**Vulcan 方案**：
- **Expert Registry**：注册多个领域专家
- **IntentEngine**：自动识别任务意图
- **Decomposer**：将复杂任务分解为子任务图
- **Orchestrator**：编排执行计划，分配给对应专家

---

## 📂 项目结构

```
vulcan/
├── vulcan-core/               # Agent 核心引擎
│   └── vulcan/
│       ├── agent/             # Agent、A2A总线、执行器、工具注册
│       │   ├── a2a/bus.py     # 多Agent消息总线
│       │   ├── executor.py    # 链式执行引擎
│       │   ├── planner.py     # 任务规划器
│       │   ├── tools/registry.py  # 60+工具统一注册表
│       │   └── vulcan_agent.py    # Agent核心类
│       ├── memory/            # 统一记忆 + MemPalace
│       │   ├── mempalace/     # 知识宫殿（知识图谱+向量检索）
│       │   └── mempalace_integration.py
│       ├── skills/            # SkillForge 技能引擎
│       │   ├── skill_forge.py # 技能锻造（安装/版本/信任）
│       │   ├── marketplace.py # 多源技能市场
│       │   └── routes.py      # 技能API路由
│       ├── experts/           # 专家系统
│       │   ├── intent_engine.py   # 意图识别
│       │   ├── decomposer.py      # 任务分解
│       │   └── orchestrator.py    # 执行编排
│       ├── auth/              # RBAC 权限控制
│       ├── observability/     # 结构化日志+追踪
│       ├── commands/          # 命令系统
│       └── main.py            # 入口（FastAPI）
├── vulcan_gateway/            # 消息网关
│   ├── adapters.py            # 20+平台适配器
│   ├── config.py              # 网关配置
│   └── manager.py             # 适配器管理
├── vulcan-webui/              # React 管理面板（48个页面/组件）
│   └── src/pages/             # Dashboard、Agents、Skills、Memory...
├── config/
│   ├── gateway.yaml           # 网关配置
│   └── .env.example           # 环境变量模板
├── docker/
│   ├── Dockerfile.backend     # 后端镜像
│   ├── Dockerfile.frontend    # 前端镜像（nginx）
│   └── nginx.frontend.conf    # nginx配置
├── scripts/
│   └── wizard.py              # 交互式安装向导
├── docker-compose.yml         # 一键全栈部署
└── README.md
```

---

## 📊 对比传统方案

| 特性 | 传统方案 | Vulcan |
|------|---------|--------|
| 多Agent协作 | tmux + 手动脚本 | A2A 消息总线，原生协调 |
| 工具管理 | 散落各处，手动导入 | 统一注册表，自动发现 |
| 技能管理 | 文件夹拷贝，无版本 | SkillForge，信任等级+版本管理 |
| 记忆系统 | 无/仅对话历史 | 统一记忆 + 知识图谱 + 语义搜索 |
| 日志 | print() | 结构化日志 + trace_id |
| 平台适配 | 每个平台独立开发 | 统一适配层，一套代码全覆盖 |
| 权限控制 | 无 | RBAC 三级权限 |
| 部署 | 手动配置 | Docker Compose 一键 / 向导引导 |
| 任务分解 | 用户手动拆分 | IntentEngine + Decomposer 自动拆分 |

---

## License

MIT
