import { useState } from 'react'
import {
  Modal, Form, Input, Select, message, Avatar, Tooltip, InputRef
} from 'antd'
import {
  PlusOutlined, MessageOutlined, SettingOutlined, DeleteOutlined,
  RobotOutlined, SearchOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ToolOutlined, FileTextOutlined, TeamOutlined, SendOutlined
} from '@ant-design/icons'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  role: 'planner' | 'executor' | 'coordinator' | 'specialist'
  description: string
  status: 'active' | 'idle' | 'error'
  tasksCompleted: number
  model?: string
  tools: string[]
}

interface AgentMessage {
  id: string
  from: string
  to: string
  content: string
  timestamp: string
}

// ─── Demo agents ─────────────────────────────────────────────────────────────

const DEMO_AGENTS: Agent[] = [
  {
    id: 'planner-1',
    name: 'Planner-α',
    role: 'planner',
    description: '任务规划者 — 分析用户目标，拆解执行步骤，协调其他 Agent',
    status: 'active',
    tasksCompleted: 127,
    model: 'claude-sonnet-4',
    tools: ['task_decompose', 'reasoning'],
  },
  {
    id: 'executor-1',
    name: 'Executor-β',
    role: 'executor',
    description: '执行者 — 调用工具，完成具体任务，处理错误和异常',
    status: 'active',
    tasksCompleted: 341,
    model: 'claude-sonnet-4',
    tools: ['*'],
  },
  {
    id: 'researcher-1',
    name: 'Researcher-γ',
    role: 'specialist',
    description: '研究专家 — 搜索、阅读、总结外部知识源',
    status: 'idle',
    tasksCompleted: 58,
    model: 'gpt-4o',
    tools: ['web_search', 'arxiv', 'blogwatcher'],
  },
  {
    id: 'coordinator-1',
    name: 'Coordinator-δ',
    role: 'coordinator',
    description: '协调者 — 多 Agent 之间的消息路由、投票、冲突仲裁',
    status: 'idle',
    tasksCompleted: 23,
    model: 'claude-sonnet-4',
    tools: ['a2a_bus', 'vote'],
  },
]

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  planner: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  executor: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  coordinator: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
  specialist: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' },
}

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  active: { dot: '#22C55E', text: '#22C55E' },
  idle: { dot: '#A1A1AA', text: '#A1A1AA' },
  error: { dot: '#EF4444', text: '#EF4444' },
}

const CHANNEL_OPTIONS = [
  { value: 'a2a', label: 'A2A Bus' },
  { value: 'http', label: 'HTTP' },
  { value: 'websocket', label: 'WebSocket' },
]

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4', label: 'Claude Opus 4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'llama3.2', label: 'LLaMA 3.2 (本地)' },
]

const CAPABILITY_OPTIONS = [
  { value: 'task_decompose', label: '任务分解' },
  { value: 'reasoning', label: '推理分析' },
  { value: 'web_search', label: '网络搜索' },
  { value: 'code_execute', label: '代码执行' },
  { value: 'file_read', label: '文件读取' },
  { value: 'a2a_bus', label: 'A2A 通信' },
  { value: 'vote', label: '投票仲裁' },
]

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0D0D0F',
    padding: '24px 32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#FAFAFA',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#A1A1AA',
    margin: 0,
  },
  searchInput: {
    background: '#18181B',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
    width: '280px',
  },
  createBtn: {
    background: '#7065F3',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 500,
    height: '36px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#18181B',
    border: '1px solid #2C2C31',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#FAFAFA',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#A1A1AA',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  agentCard: {
    background: '#18181B',
    border: '1px solid #2C2C31',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  agentCardHover: {
    background: '#27272A',
    border: '1px solid #3f3f46',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  agentInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    flex: 1,
    marginLeft: '14px',
  },
  agentName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#FAFAFA',
    margin: 0,
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '13px',
  },
  description: {
    fontSize: '13px',
    color: '#A1A1AA',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '16px',
  },
  modelTag: {
    background: 'rgba(112, 101, 243, 0.15)',
    color: '#7065F3',
    border: '1px solid rgba(112, 101, 243, 0.3)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },
  toolsBadge: {
    background: 'rgba(161, 161, 170, 0.15)',
    color: '#A1A1AA',
    border: '1px solid rgba(161, 161, 170, 0.3)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statsRow2: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #2C2C31',
    marginBottom: '16px',
  },
  tasksCount: {
    fontSize: '13px',
    color: '#A1A1AA',
  },
  tasksValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#FAFAFA',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    flex: 1,
    height: '32px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modal: {
    background: '#18181B',
    borderRadius: '12px',
  },
  modalHeader: {
    background: '#18181B',
    borderBottom: '1px solid #2C2C31',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: '16px',
    fontWeight: 600,
  },
  modalContent: {
    background: '#18181B',
    padding: '24px',
  },
  formLabel: {
    color: '#A1A1AA',
    fontSize: '13px',
    marginBottom: '8px',
  },
  formInput: {
    background: '#0D0D0F',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
    color: '#FAFAFA',
  },
  formSelect: {
    background: '#0D0D0F',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
  },
  modalFooter: {
    background: '#18181B',
    borderTop: '1px solid #2C2C31',
    padding: '16px 24px',
  },
  submitBtn: {
    background: '#7065F3',
    border: 'none',
    borderRadius: '8px',
    height: '36px',
    fontWeight: 500,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
    height: '36px',
    color: '#A1A1AA',
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents] = useState<Agent[]>(DEMO_AGENTS)
  const [searchText, setSearchText] = useState('')
  const [configModal, setConfigModal] = useState(false)
  const [messagesModal, setMessagesModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [form] = Form.useForm()

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchText.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchText.toLowerCase()) ||
    agent.description.includes(searchText)
  )

  const activeCount = agents.filter(a => a.status === 'active').length
  const idleCount = agents.filter(a => a.status === 'idle').length

  const handleOpenConfig = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAgent(agent)
    form.setFieldsValue({
      name: agent.name,
      role: agent.role,
      model: agent.model,
      channels: ['a2a'],
      capabilities: agent.tools,
    })
    setConfigModal(true)
  }

  const handleOpenMessages = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAgent(agent)
    setMessagesModal(true)
  }

  const handleDelete = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation()
    message.success(`Agent ${agent.name} 已删除`)
  }

  const handleSubmitConfig = (values: any) => {
    message.success(`Agent ${values.name} 配置已保存`)
    setConfigModal(false)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'planner': return '📋'
      case 'executor': return '⚡'
      case 'coordinator': return '🔄'
      case 'specialist': return '🔍'
      default: return '🤖'
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Agent 管理</h1>
          <p style={styles.subtitle}>管理和监控所有 AI Agent 状态</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Input
            placeholder="搜索 Agent..."
            prefix={<SearchOutlined style={{ color: '#A1A1AA' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={styles.searchInput}
            allowClear
          />
          <button style={{ ...styles.createBtn, ...styles.actionBtn, color: '#fff', border: 'none' }} onClick={() => setConfigModal(true)}>
            <PlusOutlined /> 新建 Agent
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(112, 101, 243, 0.15)' }}>
            <TeamOutlined style={{ color: '#7065F3' }} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{agents.length}</span>
            <span style={styles.statLabel}>总数</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(34, 197, 94, 0.15)' }}>
            <CheckCircleOutlined style={{ color: '#22C55E' }} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{activeCount}</span>
            <span style={styles.statLabel}>活跃</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(161, 161, 170, 0.15)' }}>
            <ClockCircleOutlined style={{ color: '#A1A1AA' }} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{idleCount}</span>
            <span style={styles.statLabel}>空闲</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div style={styles.grid}>
        {filteredAgents.map(agent => {
          const roleStyle = ROLE_COLORS[agent.role] || ROLE_COLORS.specialist
          const statusStyle = STATUS_COLORS[agent.status] || STATUS_COLORS.idle
          const isHovered = hoveredCard === agent.id

          return (
            <div
              key={agent.id}
              style={{
                ...styles.agentCard,
                ...(isHovered ? styles.agentCardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(agent.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <Avatar
                  style={{
                    ...styles.avatar,
                    background: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                  }}
                  icon={<RobotOutlined style={{ color: roleStyle.text, fontSize: '22px' }} />}
                />
                <div style={styles.agentInfo}>
                  <h3 style={styles.agentName}>{agent.name}</h3>
                  <span
                    style={{
                      ...styles.roleBadge,
                      background: roleStyle.bg,
                      color: roleStyle.text,
                      border: `1px solid ${roleStyle.border}`,
                    }}
                  >
                    {agent.role}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div style={styles.statusRow}>
                <span style={{ ...styles.statusDot, background: statusStyle.dot }} />
                <span style={{ ...styles.statusText, color: statusStyle.text }}>
                  {agent.status === 'active' ? '运行中' : agent.status === 'idle' ? '空闲' : '错误'}
                </span>
              </div>

              {/* Description */}
              <p style={styles.description}>{agent.description}</p>

              {/* Tags */}
              <div style={styles.tagRow}>
                <span style={styles.modelTag}>
                  {agent.model || 'default'}
                </span>
                <span style={styles.toolsBadge}>
                  <ToolOutlined style={{ fontSize: '11px' }} />
                  {agent.tools.length} 工具
                </span>
              </div>

              {/* Tasks Completed */}
              <div style={styles.statsRow2}>
                <div>
                  <span style={styles.tasksCount}>已完成任务</span>
                  <div style={styles.tasksValue}>{agent.tasksCompleted}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actions}>
                <button
                  style={{
                    ...styles.actionBtn,
                    background: 'rgba(112, 101, 243, 0.15)',
                    color: '#7065F3',
                    border: '1px solid rgba(112, 101, 243, 0.3)',
                  }}
                  onClick={(e) => handleOpenConfig(agent, e)}
                >
                  <SettingOutlined /> 配置
                </button>
                <button
                  style={{
                    ...styles.actionBtn,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22C55E',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                  onClick={(e) => handleOpenMessages(agent, e)}
                >
                  <MessageOutlined /> 消息
                </button>
                <button
                  style={{
                    ...styles.actionBtn,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                  onClick={(e) => handleDelete(agent, e)}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Config Modal */}
      <Modal
        open={configModal}
        onCancel={() => setConfigModal(false)}
        footer={null}
        width={520}
        styles={{
          header: styles.modalHeader,
          content: styles.modalContent,
          footer: styles.modalFooter,
        }}
        title={<span style={styles.modalTitle}>配置 Agent</span>}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitConfig}
        >
          <Form.Item
            name="name"
            label={<span style={styles.formLabel}>Agent 名称</span>}
            rules={[{ required: true, message: '请输入 Agent 名称' }]}
          >
            <Input
              placeholder="例如：Researcher-γ"
              style={styles.formInput}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span style={styles.formLabel}>角色</span>}
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select style={styles.formSelect}>
              <Select.Option value="planner">Planner（规划者）</Select.Option>
              <Select.Option value="executor">Executor（执行者）</Select.Option>
              <Select.Option value="coordinator">Coordinator（协调者）</Select.Option>
              <Select.Option value="specialist">Specialist（专家）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="model"
            label={<span style={styles.formLabel}>使用模型</span>}
          >
            <Select style={styles.formSelect}>
              {MODEL_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="channels"
            label={<span style={styles.formLabel}>通信渠道</span>}
          >
            <Select mode="multiple" style={styles.formSelect}>
              {CHANNEL_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="capabilities"
            label={<span style={styles.formLabel}>能力 / 工具</span>}
          >
            <Select mode="multiple" style={styles.formSelect}>
              {CAPABILITY_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              style={{ ...styles.submitBtn, flex: 1, color: '#fff' }}
              type="button"
              onClick={() => setConfigModal(false)}
            >
              取消
            </button>
            <button
              style={{ ...styles.submitBtn, flex: 2, color: '#fff' }}
              type="submit"
            >
              保存配置
            </button>
          </div>
        </Form>
      </Modal>

      {/* Messages Modal */}
      <Modal
        open={messagesModal}
        onCancel={() => setMessagesModal(false)}
        footer={null}
        width={600}
        styles={{
          header: styles.modalHeader,
          content: { ...styles.modalContent, maxHeight: '70vh', overflow: 'auto' },
          footer: styles.modalFooter,
        }}
        title={<span style={styles.modalTitle}>与 {selectedAgent?.name} 的消息</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DEMO_AGENTS.filter(a => a.id !== selectedAgent?.id).slice(0, 3).map(agent => (
            <div
              key={agent.id}
              style={{
                background: '#0D0D0F',
                border: '1px solid #2C2C31',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#FAFAFA', fontWeight: 500 }}>{agent.name}</span>
                <span style={{ color: '#A1A1AA', fontSize: '12px' }}>{agent.role}</span>
              </div>
              <Input.TextArea
                placeholder={`发送消息给 ${agent.name}...`}
                rows={2}
                style={styles.formInput}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={{ ...styles.submitBtn, color: '#fff' }}
            onClick={() => message.success('消息已发送')}
          >
            <SendOutlined style={{ marginRight: '6px' }} />
            发送消息
          </button>
        </div>
      </Modal>
    </div>
  )
}
