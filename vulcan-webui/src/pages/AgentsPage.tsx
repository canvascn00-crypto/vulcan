import { useState } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, List,
  Modal, Form, Input, Select, message, Badge, Avatar, Divider
} from 'antd'
import {
  PlusOutlined, MessageOutlined,   SwapOutlined, DeleteOutlined, RobotOutlined, SendOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

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

const ROLE_COLORS: Record<string, string> = {
  planner: 'orange',
  executor: 'blue',
  coordinator: 'purple',
  specialist: 'green',
}

const DEMO_MESSAGES: AgentMessage[] = [
  { id: '1', from: 'planner-1', to: 'executor-1', content: '请搜索最近的 Polymarket 热门市场', timestamp: '18:30:01' },
  { id: '2', from: 'executor-1', to: 'planner-1', content: '已找到 5 个热门市场，开始执行', timestamp: '18:30:02' },
  { id: '3', from: 'planner-1', to: 'coordinator-1', content: '需要多 Agent 投票决定推送哪个', timestamp: '18:30:05' },
  { id: '4', from: 'coordinator-1', to: 'researcher-γ', content: '请提供市场分析报告', timestamp: '18:30:06' },
  { id: '5', from: 'researcher-1', to: 'coordinator-1', content: '报告已生成：Trump vs Biden 概率 62%', timestamp: '18:30:10' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents] = useState<Agent[]>(DEMO_AGENTS)
  const [messages] = useState<AgentMessage[]>(DEMO_MESSAGES)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [delegateModal, setDelegateModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const handleCreate = (values: Partial<Agent>) => {
    message.success(`Agent ${values.name} 创建成功（开发中）`)
    setModalOpen(false)
  }

  const handleDelegate = (agent: Agent) => {
    setSelectedAgent(agent)
    setDelegateModal(true)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>👥 多 Agent 协作</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            A2A 消息总线 · 支持委托、查询、协作、投票（Phase 3 A2A 部分）</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建 Agent
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Agent cards */}
        <Col xs={24} lg={14}>
          <Row gutter={[12, 12]}>
            {agents.map((agent) => (
              <Col xs={24} sm={12} key={agent.id}>
                <Card
                  size="small"
                  style={{
                    background: '#1c1c28',
                    border: agent.status === 'active' ? '1px solid #5a6ef5' : '1px solid #2a2a3e',
                  }}
                  title={
                    <Space>
                      <Avatar
                        size="small"
                        icon={<RobotOutlined />}
                        style={{ background: ROLE_COLORS[agent.role] === 'orange' ? '#ff7a45' : '#5a6ef5' }}
                      />
                      <Text strong style={{ color: '#e5e7eb' }}>{agent.name}</Text>
                      <Badge status={agent.status === 'active' ? 'success' : agent.status === 'idle' ? 'default' : 'error'} />
                    </Space>
                  }
                  extra={
                    <Tag color={ROLE_COLORS[agent.role]} style={{ fontSize: 10 }}>
                      {agent.role}
                    </Tag>
                  }
                  actions={[
                    <Button key="del" type="text" size="small" icon={<DeleteOutlined />} onClick={() => message.info('删除开发中')} />,
                    <Button key="delegate" type="text" size="small" icon={<SwapOutlined />} onClick={() => handleDelegate(agent)} />,
                  ]}
                >
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    {agent.description}
                  </Text>
                  <Space wrap size={4}>
                    {agent.tools.slice(0, 3).map((t) => (
                      <Tag key={t} style={{ fontSize: 10 }}>{t}</Tag>
                    ))}
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>模型：{agent.model}</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>完成：{agent.tasksCompleted} 任务</Text>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* A2A Message bus */}
        <Col xs={24} lg={10}>
          <Card
            title="🚌 A2A 消息总线"
            size="small"
            extra={<Tag icon={<MessageOutlined />}>实时</Tag>}
          >
            <List
              size="small"
              dataSource={messages}
              style={{ maxHeight: 400, overflow: 'auto' }}
              renderItem={(msg) => {
                const fromAgent = agents.find((a) => a.id === msg.from)
                const toAgent = agents.find((a) => a.id === msg.to)
                return (
                  <List.Item style={{ padding: '8px 0' }}>
                    <div style={{ width: '100%' }}>
                      <Space size={4} style={{ marginBottom: 4 }}>
                        <Tag color={fromAgent ? ROLE_COLORS[fromAgent.role] : 'default'} style={{ fontSize: 10 }}>
                          {fromAgent?.name || msg.from}
                        </Tag>
                        <SwapOutlined style={{ color: '#5a6ef5', fontSize: 10 }} />
                        <Tag color={toAgent ? ROLE_COLORS[toAgent.role] : 'default'} style={{ fontSize: 10 }}>
                          {toAgent?.name || msg.to}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>
                          {msg.timestamp}
                        </Text>
                      </Space>
                      <Text style={{ color: '#d1d5db', fontSize: 13 }}>{msg.content}</Text>
                    </div>
                  </List.Item>
                )
              }}
            />
          </Card>

          {/* A2A patterns */}
          <Card size="small" title="🔄 协作模式" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: '委托', desc: 'Planner → Executor', color: 'orange' },
                { label: '查询', desc: 'Coordinator → Specialist', color: 'green' },
                { label: '协作', desc: '多 Agent 协同完成复杂任务', color: 'blue' },
                { label: '投票', desc: 'Coordinator 仲裁冲突决策', color: 'purple' },
              ].map((p) => (
                <div key={p.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag color={p.color}>{p.label}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{p.desc}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Create agent modal */}
      <Modal
        title="创建 Agent"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item name="name" label="Agent 名称" rules={[{ required: true }]}>
            <Input placeholder="例如：Researcher-γ" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="planner">Planner（规划者）</Select.Option>
              <Select.Option value="executor">Executor（执行者）</Select.Option>
              <Select.Option value="coordinator">Coordinator（协调者）</Select.Option>
              <Select.Option value="specialist">Specialist（专家）</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="Agent 的职责..." />
          </Form.Item>
          <Form.Item name="model" label="使用模型">
            <Select>
              <Select.Option value="claude-sonnet-4">Claude Sonnet 4</Select.Option>
              <Select.Option value="gpt-4o">GPT-4o</Select.Option>
              <Select.Option value="llama3.2">LLaMA 3.2 (本地)</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>

      {/* Delegate modal */}
      <Modal
        title={`委托任务给 ${selectedAgent?.name}`}
        open={delegateModal}
        onCancel={() => setDelegateModal(false)}
        footer={null}
      >
        <Form layout="vertical">
          <Form.Item label="任务描述">
            <Input.TextArea rows={3} placeholder="描述要委托的任务..." />
          </Form.Item>
          <Form.Item label="期望输出">
            <Input placeholder="例如：JSON 格式的市场分析" />
          </Form.Item>
          <Button type="primary" icon={<SendOutlined />} block onClick={() => { message.info('委托发送（开发中）'); setDelegateModal(false) }}>
            发送委托
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
