# Vulcan — 下一代 AI Agent 平台

> **盗火者 · 将 AI 能力传递给每一个人**

Vulcan 是一个通用的 AI Agent 平台，继承并超越 Hermes Agent + OpenClaw 的所有能力。支持多模型、多 Agent 协作、20+ 消息通道、60+ 工具、内置技能市场。

## 核心特性

- 🔥 **双核架构** — Planner（规划）+ Executor（执行），异步协作
- 🌐 **全通道支持** — 20+ 消息通道：WeChat、Telegram、Discord、飞书、微信公众号等
- 🛠️ **60+ 工具** — 继承 Hermes 全部工具集，自动发现
- 💎 **技能市场** — 97+ 预装技能（4 Vulcan 内置 + 93 Hermes 继承），支持 GitHub/Marketplace 扩展
- 🤖 **多 Agent 协作** — A2A 协议，Agent 间任务委托、结果聚合、共享内存
- 🔑 **API Key + RBAC** — 外部应用接入鉴权，4 级角色权限
- 📊 **可观测性** — 日志、追踪、指标、告警
- 🚀 **一键部署** — Docker Compose，单机 5 分钟启动

## 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/your-org/vulcan.git
cd vulcan
cp .env.example .env
# 编辑 .env 填入必要的 API keys
docker-compose up -d
```

访问 `http://localhost:3000` 打开 WebUI。

### 本地开发

```bash
# 后端
cd vulcan-core
pip install -r requirements.txt
python vulcan.py --port 8000

# 前端（另一个终端）
cd vulcan-webui
npm install
npm run dev
```

### 环境变量

```bash
# .env
VULCAN_HOST=0.0.0.0
VULCAN_PORT=8000
VULCAN_WEBUI_PORT=3000
LLM_PROVIDER=openai  # 或 anthropic/oprouter/custom
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
LLM_API_KEY_AUTH=false  # true = 所有 API 调用需要 X-Vulcan-Key header

# Hermes 兼容（从 Hermes Agent 继承）
HERMES_GATEWAY_DIR=/root/.hermes/gateway
```

## 架构

```
┌─────────────────────────────────────────────┐
│              Vulcan WebUI (React)             │
│   14 pages: Chat/Dashboard/Models/Skills     │
│   Multi-Agent/Memory/WeChat/Gateway/Settings  │
└────────────────┬──────────────────────────────┘
                 │ REST / WebSocket
┌────────────────▼──────────────────────────────┐
│            Vulcan API Server (FastAPI)         │
│  /chat  /tasks  /skills  /a2a  /gateway  /auth  │
│  /api-keys  /models  /workflows  /agents        │
└───┬──────────┬──────────┬──────────┬─────────┘
    │          │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───────────┐
│Planner │ │Executor│ │Skill  │ │  A2A Agent   │
│+Exec   │ │       │ │Forge  │ │    Pool      │
└───┬───┘ └───┬───┘ └───┬───┘ └───────────────┘
    │          │          │
┌───▼──────────▼──────────▼───────────────┐
│      UnifiedMemory (3-layer)              │
│  Ephemeral · ShortTerm · LongTerm        │
└──────────────────────────────────────────┘
    │
┌───▼───────────────────────────────────────┐
│       Vulcan Gateway (Hermes-compatible)   │
│  WeChat · Telegram · Discord · 飞书        │
│  WhatsApp · Line · Slack · QQ · ...        │
└───────────────────────────────────────────┘
    │
┌───▼───────────────────────────────────────┐
│         Vulcan Tool Registry               │
│  60+ tools auto-discovered from Hermes     │
└───────────────────────────────────────────┘
```

## 目录结构

```
vulcan/
├── vulcan-core/              # Python 后端
│   └── vulcan/
│       ├── agent/            # 双核 Agent（Planner/Executor/TaskQueue）
│       ├── skills/           # SkillForge（4内置+93继承+市场）
│       ├── a2a/              # A2A 多Agent协议
│       ├── gateway/          # Hermes 兼容网关
│       ├── auth/             # API Key + RBAC
│       ├── observability/    # 日志/追踪/指标
│       ├── memory/           # 统一内存
│       ├── models/           # 模型管理
│       └── skills/bundles/   # Vulcan 内置技能
│           ├── vulcan-coder/
│           ├── vulcan-researcher/
│           ├── vulcan-architect/
│           └── vulcan-devops/
├── vulcan-webui/             # React 前端
│   └── src/pages/            # 14 个页面
├── docker/                   # Docker 配置
├── config/                   # 配置文件
├── SPEC.md                   # 完整规格文档
├── README.md
└── Makefile
```

## API 接口

| 端点 | 方法 | 描述 |
|------|------|------|
| `/chat` | POST | 发送对话请求 |
| `/tasks/{id}` | GET | 查询任务状态 |
| `/tasks/{id}/cancel` | POST | 取消任务 |
| `/skills` | GET | 列出所有技能 |
| `/skills/{id}/enable` | POST | 启用技能 |
| `/skills/{id}/disable` | POST | 禁用技能 |
| `/a2a/agents` | GET | 列出所有 Agent |
| `/a2a/delegation/delegate` | POST | 委托任务 |
| `/api-keys` | GET | 列出 API Keys |
| `/api-keys` | POST | 创建 API Key |
| `/gateway/status` | GET | Gateway 状态 |

## 技能系统

Vulcan 继承 97+ 技能，分类：

- **Vulcan 内置** (4): vulcan-coder, vulcan-researcher, vulcan-architect, vulcan-devops
- **Hermes 继承** (93): article-card-gen, wechat-mp-article-pipeline, email-client, 等
- **Marketplace**: 社区技能市场（可从 GitHub URL 安装）

## 配置

### 消息通道（Gateway）

Vulcan Gateway 完全兼容 Hermes Agent 的 `config.yaml` 平台配置：

```yaml
# config/gateway.yaml
platforms:
  weixin:
    enabled: true
    app_id: wx_xxx
    app_secret: xxx
  telegram:
    enabled: true
    bot_token: xxx
```

### RBAC 角色

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限 |
| `operator` | 聊天、任务、技能 |
| `readonly` | 只读 |
| `external` | 仅允许的端点 |

## License

MIT
