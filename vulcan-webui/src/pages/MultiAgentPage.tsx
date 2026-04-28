import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, Table, Badge,
  Statistic, Progress, Modal, Form, Input, Select, message, Spin,
  Timeline, Alert, Divider, Popconfirm, Empty, List, Avatar
} from 'antd'
import {
  TeamOutlined, SwapOutlined, ApiOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SendOutlined, ReloadOutlined, DeleteOutlined,
  ExclamationCircleOutlined, RocketOutlined, ThunderboltOutlined,
  StopOutlined, PlayCircleOutlined
} from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text, Paragraph } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentInfo {
  name: string
  version: string
  status: 'idle' | 'busy' | 'streaming' | 'offline'
  role: string
  capabilities: string[]
  tools: string[]
  description?: string
  endpoint?: string
  tags: string[]
  maxConcurrentTasks: number
  last_seen: string
}

interface PoolStats {
  total_agents: number
  idle: number
  busy: number
  streaming: number
  total_delegated_tasks: number
  active_delegated: number
  agents: AgentInfo[]
}

interface DelegatedTask {
  task_id: string
  thread_id: string
  goal: string
  proposer: string
  assignee: string
  status: 'proposed' | 'accepted' | 'rejected' | 'completed' | 'failed' | 'cancelled'
  priority: number
  created_at: string
  accepted_at?: string
  completed_at?: string
  result?: any
  error?: string
  progress_steps: { description: string; status: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  idle: 'success',
  busy: 'processing',
  streaming: 'warning',
  offline: 'error',
  proposed: 'default',
  accepted: 'processing',
  rejected: 'error',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
}

const PRIORITY_LABEL: Record<number, string> = {
  0: '低',
  1: '普通',
  2: '高',
  3: '紧急',
}

const PRIORITY_COLOR: Record<number, string> = {
  0: 'default',
  1: 'blue',
  2: 'orange',
  3: 'red',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MultiAgentPage() {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null)
  const [delegatedTasks, setDelegatedTasks] = useState<DelegatedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [delegating, setDelegating] = useState(false)
  const [delegateModalOpen, setDelegateModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [form] = Form.useForm()

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, tasksRes] = await Promise.all([
        api.get<PoolStats>('/api/a2a/status'),
        api.get<{ tasks: DelegatedTask[] }>('/api/a2a/tasks/delegated'),
      ])
      setPoolStats(statusRes)
      setDelegatedTasks(tasksRes.tasks || [])
    } catch (e: any) {
      message.error('A2A 数据加载失败: ' + (e?.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelegate = async (values: any) => {
    setDelegating(true)
    try {
      const res = await api.post<any>('/api/a2a/tasks/delegate', {
        goal: values.goal,
        assignee: values.assignee || undefined,
        role: values.role || undefined,
        priority: values.priority || 1,
        description: values.description,
        tools: values.tools || [],
        timeout_seconds: values.timeout_seconds,
        proposer: 'vulcan-primary',
        thread_id: `thread-${Date.now()}`,
      })
      message.success(`任务已委托: ${res.task_id}`)
      setDelegateModalOpen(false)
      form.resetFields()
      loadAll()
    } catch (e: any) {
      message.error(e?.data?.detail || e?.message || '委托失败')
    } finally {
      setDelegating(false)
    }
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.post(`/api/a2a/tasks/delegated/${taskId}/complete`, {
        error: 'Cancelled by orchestrator',
      })
      message.success('任务已取消')
      loadAll()
    } catch (e: any) {
      message.error(e?.message || '取消失败')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const idleAgents = poolStats?.agents.filter(a => a.status === 'idle') || []
  const busyAgents = poolStats?.agents.filter(a => a.status === 'busy') || []

  const taskColumns = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 180,
      render: (id: string) => (
        <Text copyable={{ text: id }} style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {id}
        </Text>
      ),
    },
    {
      title: '目标',
      dataIndex: 'goal',
      key: 'goal',
      ellipsis: true,
      render: (goal: string) => <Text style={{ maxWidth: 200 }} ellipsis={{ tooltip: goal }}>{goal}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Badge status={STATUS_COLORS[s] as any} text={s} />,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: number) => <Tag color={PRIORITY_COLOR[p] || 'default'}>{PRIORITY_LABEL[p] || '普通'}</Tag>,
    },
    {
      title: '委托人',
      dataIndex: 'proposer',
      key: 'proposer',
      width: 120,
      render: (n: string) => <Tag>{n}</Tag>,
    },
    {
      title: '执行人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      render: (n: string) => n ? <Tag color="blue">{n}</Tag> : <Text type="secondary">待认领</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (ts: string) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: DelegatedTask) => (
        record.status === 'proposed' || record.status === 'accepted' ? (
          <Popconfirm
            title="确认取消此任务？"
            onConfirm={() => handleCancelTask(record.task_id)}
            okText="取消任务"
            cancelText="保留"
          >
            <Button size="small" danger icon={<StopOutlined />}>取消</Button>
          </Popconfirm>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.status === 'completed' ? '✅ 完成' : record.status === 'failed' ? '❌ 失败' : record.status}
          </Text>
        )
      ),
    },
  ]

  const agentColumns = [
    {
      title: 'Agent',
      key: 'agent',
      render: (_: any, record: AgentInfo) => (
        <Space>
          <Avatar
            style={{ background: record.status === 'idle' ? '#52c41a' : record.status === 'busy' ? '#1890ff' : '#888' }}
            icon={<TeamOutlined />}
          />
          <div>
            <Text strong style={{ color: '#e5e7eb' }}>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{record.role} · v{record.version}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => <Badge status={STATUS_COLORS[s] as any} text={s} />,
    },
    {
      title: '能力',
      dataIndex: 'capabilities',
      key: 'capabilities',
      render: (caps: string[]) => (
        <Space wrap>
          {caps.slice(0, 4).map(c => <Tag key={c} style={{ fontSize: 10 }}>{c}</Tag>)}
        </Space>
      ),
    },
    {
      title: '同时任务',
      dataIndex: 'maxConcurrentTasks',
      key: 'maxConcurrentTasks',
      width: 80,
      render: (max: number, record: AgentInfo) => {
        const active = delegatedTasks.filter(t => t.assignee === record.name && t.status === 'accepted').length
        return <Progress percent={Math.round((active / max) * 100)} size="small" steps={max} />
      },
    },
    {
      title: '最后活跃',
      dataIndex: 'last_seen',
      key: 'last_seen',
      width: 140,
      render: (ts: string) => new Date(ts).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>🔗 A2A Multi-Agent 协作</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Agent-to-Agent 协议 — 任务委托 · 跨 Agent 协作 · 分布式执行
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setDelegateModalOpen(true)}
          >
            委托任务
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Pool Stats */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>注册 Agents</Text>}
                  value={poolStats?.total_agents || 0}
                  valueStyle={{ color: '#60a5fa', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>空闲</Text>}
                  value={idleAgents.length}
                  valueStyle={{ color: '#52c41a', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>忙碌</Text>}
                  value={busyAgents.length}
                  valueStyle={{ color: '#1890ff', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>离线</Text>}
                  value={(poolStats?.agents.filter(a => a.status === 'offline').length) || 0}
                  valueStyle={{ color: '#ff4d4f', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>委托任务</Text>}
                  value={poolStats?.total_delegated_tasks || 0}
                  valueStyle={{ color: '#a78bfa', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                <Statistic
                  title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>进行中</Text>}
                  value={poolStats?.active_delegated || 0}
                  valueStyle={{ color: '#f59e0b', fontSize: 22 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Agents + Tasks */}
          <Row gutter={[16, 16]}>
            {/* Agents list */}
            <Col span={14}>
              <Card
                size="small"
                title={<Space><TeamOutlined /> A2A 网络中的 Agents</Space>}
                style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}
                bodyStyle={{ padding: 0 }}
              >
                {poolStats?.agents.length === 0 ? (
                  <Empty description="暂无注册的 Agent（启动 Vulcan Agent 后自动注册）" style={{ padding: 32 }} />
                ) : (
                  <Table
                    dataSource={poolStats?.agents || []}
                    columns={agentColumns}
                    rowKey="name"
                    size="small"
                    pagination={false}
                    style={{ background: 'transparent' }}
                  />
                )}
              </Card>
            </Col>

            {/* A2A Protocol Info */}
            <Col span={10}>
              <Card
                size="small"
                title={<Space><SwapOutlined /> A2A 协议说明</Space>}
                style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}
                bodyStyle={{ padding: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Alert
                    type="info"
                    showIcon
                    message="当前为单进程模式"
                    description="所有 Agent 运行在同一进程中，通过 InMemoryChannel 通信。分布式模式通过 HTTP/WebSocket Channel 实现。"
                    style={{ background: '#1c1c28', border: '1px solid #303030' }}
                  />
                  <div>
                    <Text strong style={{ color: '#e5e7eb' }}>A2A 消息类型</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    {[
                      { type: 'task.propose', desc: '向 Agent 委托任务' },
                      { type: 'task.accept', desc: 'Agent 接受任务' },
                      { type: 'task.result', desc: '返回执行结果' },
                      { type: 'task.progress', desc: '进度更新' },
                      { type: 'context.share', desc: '共享上下文/记忆' },
                      { type: 'context.ask', desc: '向同伴请求信息' },
                    ].map(item => (
                      <div key={item.type} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <Tag style={{ fontFamily: 'monospace', fontSize: 10 }}>{item.type}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Text strong style={{ color: '#e5e7eb' }}>信任级别</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    {[
                      { level: 'builtin', color: 'blue', desc: 'Vulcan 内置 Agent' },
                      { level: 'trusted', color: 'green', desc: '可信外部 Agent' },
                      { level: 'community', color: 'orange', desc: '社区 Agent' },
                    ].map(item => (
                      <div key={item.level} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <Tag color={item.color} style={{ fontSize: 10 }}>{item.level}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Delegated Tasks */}
          <Card
            size="small"
            title={<Space><RocketOutlined /> 委托任务列表</Space>}
            style={{ marginTop: 16, background: '#1c1c28', border: '1px solid #2a2a3e' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={delegatedTasks}
              columns={taskColumns}
              rowKey="task_id"
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              style={{ background: 'transparent' }}
              locale={{ emptyText: <Empty description="暂无委托任务" style={{ padding: 32 }} /> }}
            />
          </Card>
        </>
      )}

      {/* Delegate Task Modal */}
      <Modal
        title="📤 委托任务到 A2A 网络"
        open={delegateModalOpen}
        onCancel={() => { setDelegateModalOpen(false); form.resetFields() }}
        footer={null}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleDelegate}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="goal"
            label="任务目标"
            rules={[{ required: true, message: '请输入任务目标' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="用自然语言描述你要委托的任务目标..."
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="assignee" label="指定 Agent（可选）">
                <Select
                  allowClear
                  placeholder="自动选择最佳 Agent"
                  options={poolStats?.agents.map(a => ({
                    label: `${a.name} (${a.role}, ${a.status})`,
                    value: a.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label="指定角色（可选）">
                <Select
                  allowClear
                  placeholder="任意可用 Agent"
                  options={[
                    { label: '规划者 (planner)', value: 'planner' },
                    { label: '执行者 (executor)', value: 'executor' },
                    { label: '研究者 (researcher)', value: 'researcher' },
                    { label: '编码者 (coder)', value: 'coder' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="priority" label="优先级" initialValue={1}>
                <Select
                  options={[
                    { label: '🟢 低', value: 0 },
                    { label: '🔵 普通', value: 1 },
                    { label: '🟠 高', value: 2 },
                    { label: '🔴 紧急', value: 3 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeout_seconds" label="超时（秒）" initialValue={300}>
                <Select
                  options={[
                    { label: '1 分钟', value: 60 },
                    { label: '5 分钟', value: 300 },
                    { label: '15 分钟', value: 900 },
                    { label: '1 小时', value: 3600 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="任务描述（可选）">
            <Input placeholder="补充说明或约束条件..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setDelegateModalOpen(false); form.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={delegating}>
                发送委托
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
