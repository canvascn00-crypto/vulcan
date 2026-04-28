import { Typography } from 'antd'
const { Title } = Typography

export default function WorkflowPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>⚡ 工作流编排</Title>
      <p style={{ color: '#9ca3af' }}>可视化编排 Agent 任务流程，拖拽连接工具节点。</p>
    </div>
  )
}
export default function SkillsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🛠️ 技能中心</Title>
      <p style={{ color: '#9ca3af' }}>管理、发现、安装 Vulcan 技能（SkillHub 集成）。</p>
    </div>
  )
}
export default function MemoryPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🧠 记忆库</Title>
      <p style={{ color: '#9ca3af' }}>三层记忆系统：瞬时 → 短期（向量）→ 长期（SOUL）。</p>
    </div>
  )
}
export default function ModelsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🤖 模型管理</Title>
      <p style={{ color: '#9ca3af' }}>支持 vLLM / GGUF / OpenAI / Anthropic / 本地模型。</p>
    </div>
  )
}
export default function AgentsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>👥 多 Agent 协作</Title>
      <p style={{ color: '#9ca3af' }}>A2A 消息总线，支持委托、查询、协作、投票。</p>
    </div>
  )
}
export default function WechatPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>💬 微信渠道</Title>
      <p style={{ color: '#9ca3af' }}>继承 Hermes WeChat Channel，支持草稿箱发布。</p>
    </div>
  )
}
export default function ObservabilityPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🔭 可观测性</Title>
      <p style={{ color: '#9ca3af' }}>结构化日志 + 全链路 trace_id + 实时指标看板。</p>
    </div>
  )
}
export default function EvolverPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🧬 自我进化</Title>
      <p style={{ color: '#9ca3af' }}>自动分析失败案例，驱动 Agent 自我优化与技能升级。</p>
    </div>
  )
}
export default function MultimodalPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🎤 多模态交互</Title>
      <p style={{ color: '#9ca3af' }}>语音输入 / 输出、视觉理解、实时摄像头交互。</p>
    </div>
  )
}
export default function ShieldPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🛡️ 安全与隐私</Title>
      <p style={{ color: '#9ca3af' }}>PII 检测与脱敏、敏感操作二次确认、数据加密传输。</p>
    </div>
  )
}
export default function DevtoolsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>🧪 开发者工具链</Title>
      <p style={{ color: '#9ca3af' }}>MCP Server 管理、API Playground、本地调试。</p>
    </div>
  )
}
export default function OptimizerPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>📦 模型优化器</Title>
      <p style={{ color: '#9ca3af' }}>GGUF 量化压缩、TensorRT 加速、批量推理优化。</p>
    </div>
  )
}
