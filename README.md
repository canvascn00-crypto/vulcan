# 🔥 Vulcan — 下一代 AI Agent 平台

> **盗火者**：将 AI 智能之火带给每个人。
> Vulcan 是通用 AI Agent 平台，继承并超越 Hermes Agent + OpenClaw 的全部能力。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://www.python.org/)

## ✨ 核心特性

| 模块 | 说明 |
|------|------|
| 🧠 **双核架构** | Planner（思考）+ Executor（执行），可并行可协作 |
| 📚 **三层记忆** | 瞬时 → 短期（向量/ChromaDB）→ 长期（SOUL.md）|
| 🔗 **60+ 工具** | 继承 Hermes 全部工具，新增工具链自动编排 |
| 🌐 **28 渠道** | 继承 Hermes 全部消息渠道（微信/TG/Discord/...）|
| 🤝 **A2A 总线** | 多 Agent 委托、查询、协作、投票 |
| 🔭 **可观测性** | 结构化日志 + 全链路 trace_id + 指标看板 |
| 🧬 **自我进化** | 自动分析失败案例，驱动 Agent 自我优化 |
| 🎤 **多模态** | 语音 I/O、视觉理解、实时摄像头交互 |
| 🛡️ **安全模块** | PII 检测与脱敏、敏感操作二次确认 |
| 🧪 **DevTools** | MCP Server 管理、API Playground |
| 📦 **模型优化** | GGUF 量化、vLLM Serving、批量推理 |

## 🏗️ 架构

```
Vulcan Platform
├── vulcan-core/       Python 后端（FastAPI + 双核 Agent）
├── vulcan-webui/      React/TS 前端（Vite + Ant Design）
├── vulcan-api/        API 路由层
├── vulcan-gateway/    消息网关（28 渠道）
├── vulcan-skills/     技能市场
└── docs/              文档
```

## 🚀 快速启动

### Docker Compose（一键启动）

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
docker-compose up -d
```

访问 **http://localhost:3000**

### 本地开发

```bash
# 后端
cd vulcan-core
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn vulcan.main:app --reload --port 8000

# 前端
cd vulcan-webui
npm install
npm run dev
```

## 📦 模块一览

### 2.1 双核 Agent 引擎
- `Planner`: 任务理解、步骤分解、模型选择、结果验证
- `Executor`: 工具调用、步骤执行、错误处理
- 两者通过消息队列通信，支持并行执行

### 2.2 统一记忆层
- **瞬时记忆**: 当前会话上下文（KV store in Redis）
- **短期记忆**: 向量检索（ChromaDB），可跨会话
- **长期记忆**: SOUL.md 人格配置 + 知识图谱（PostgreSQL）

### 2.3 工具系统
- 继承 Hermes 60+ 工具（browser/terminal/mcp/...）
- 新增：工具链自动编排、API 自动发现、速率限制

### 2.4 工作流引擎
- DAG 可视化编排（继承 Hermes 改进）
- 支持条件分支、循环、并行执行
- 持久化到 PostgreSQL

### 2.5 A2A 消息总线
- Agent 间委托、查询、通知、协作、投票
- 支持多 Agent 协作群聊

### 2.6 WebUI
- React 18 + TypeScript + Vite
- Ant Design 5 + Tailwind CSS
- 14 个功能页面（对话/工作流/技能/记忆/模型/多Agent/微信/监控/可观测性/自我进化/多模态/安全/DevTools/优化器）

### 2.7 Skill 系统
- SkillHub 集成（搜索/安装/管理）
- 支持 Webhook 触发、定时任务
- Python + MCP 协议支持

### 2.8 Skill 市场
- SkillForge UI + CLI
- 社区技能评分 + 排行

### 2.9 可观测性模块
- 结构化 JSON 日志 + trace_id 全链路追踪
- Prometheus 指标 + Grafana 看板集成
- 实时会话录制与回放

### 2.10 自我进化模块
- 失败案例自动归因分析
- 驱动 Skill 更新 / Prompt 优化
- 定期自我评估（类 RL）

### 2.11 多模态交互
- Whisper 语音识别（输入）
- TTS 语音合成（输出）
- 视觉理解（GPT-4V / LLaVA）
- 实时摄像头交互

### 2.12 安全与隐私模块
- PII 自动检测与脱敏
- 敏感操作二次确认
- 数据加密（AES-256-GCM）
- 审计日志完整记录

### 2.13 开发者工具链
- MCP Server 可视化管理
- API Playground（内测版）
- 本地热重载调试

### 2.14 模型压缩与优化
- GGUF 量化（4-bit / 8-bit）
- vLLM PagedAttention 高吞吐 Serving
- TensorRT-LLM 加速（可选）
- 批量推理优化

## 📄 许可证

MIT License — Vulcan Team 2025
