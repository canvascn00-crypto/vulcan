import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, Table, message,
  Spin, Empty, Tooltip, Modal, Form, Input, Select,
} from 'antd'
import {
  TeamOutlined, SwapOutlined, SendOutlined, ReloadOutlined,
  RocketOutlined, PlayCircleOutlined, StopOutlined,
  PlusOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { api } from '@/services/api'
import AgentCard from '@/components/multiagent/AgentCard'
import AgentDetailPanel from '@/components/multiagent/AgentDetailPanel'
import {
  AgentInfo, PoolStats, DelegatedTask, ActivityEvent,
  AVAILABLE_MODELS, AVAILABLE_CHANNELS,
  STATUS_COLORS, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_COLOR,
} from '@/components/multiagent/types'
import { MOCK_AGENTS, MOCK_ACTIVITIES } from '@/components/multiagent/constants'

const { Title, Text } = Typography

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  const h = Math.floor(seconds / 3600)
  if (h < 24) return `${h}小时`
  return `${Math.floor(h / 24)}天`
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

export default function MultiAgentPage() {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null)
  const [delegatedTasks, setDelegatedTasks] = useState<DelegatedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [delegating, setDelegating] = useState(false)
  const [delegateModalOpen, setDelegateModalOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [agentList, setAgentList] = useState<AgentInfo[]>(MOCK_AGENTS)
  const [activities, setActivities] = useState<Record<string, ActivityEvent[]>>(MOCK_ACTIVITIES)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, tasksRes] = await Promise.all([
        api.get<PoolStats>('/api/a2a/status'),
        api.get<{ tasks: DelegatedTask[] }>('/api/a2a/tasks/delegated'),
      ])
      setPoolStats(statusRes)
      setDelegatedTasks(tasksRes.tasks || [])
    } catch {
      setPoolStats({
        total_agents: MOCK_AGENTS.length,
        idle: MOCK_AGENTS.filter(a => a.status === 'idle').length,
        busy: MOCK_AGENTS.filter(a => a.status === 'busy').length,
        streaming: MOCK_AGENTS.filter(a => a.status === 'streaming').length,
        total_delegated_tasks: 12,
        active_delegated: 3,
        agents: MOCK_AGENTS,
      })
      setDelegatedTasks([
        {
          task_id: 'task-001', thread_id: 'thread-001',
          goal: '分析竞品市场策略并生成报告',
          proposer: 'vulcan-primary', assignee: 'ResearchBot',
          status: 'in_progress', priority: 2,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          progress_steps: [],
        },
        {
          task_id: 'task-002', thread_id: 'thread-002',
          goal: '优化数据库查询性能',
          proposer: 'vulcan-primary', assignee: 'CodeMaster',
          status: 'proposed', priority: 1,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          progress_steps: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleModelChange = (agentId: string, model: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, model } : a))
    setActivities(prev => ({
      ...prev,
      [agentId]: [{
        id: `act-${Date.now()}`, type: 'config_change' as const,
        description: `模型切换为 ${AVAILABLE_MODELS.find(m => m.value === model)?.label || model}`,
        timestamp: new Date().toISOString(),
      }, ...(prev[agentId] || [])].slice(0, 20),
    }))
  }

  const handleChannelChange = (agentId: string, channel: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, channel } : a))
    setActivities(prev => ({
      ...prev,
      [agentId]: [{
        id: `act-${Date.now()}`, type: 'config_change' as const,
        description: `渠道切换为 ${AVAILABLE_CHANNELS.find(c => c.value === channel)?.label || channel}`,
        timestamp: new Date().toISOString(),
      }, ...(prev[agentId] || [])].slice(0, 20),
    }))
  }

  const handleAgentStart = (agentId: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, status: 'idle' as const } : a))
    message.success('Agent 已启动')
  }

  const handleAgentStop = (agentId: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, status: 'offline' as const, currentTask: undefined } : a))
    message.info('Agent 已停止')
  }

  const handleAgentConfigure = (_agentId: string) => { message.info('配置面板开发中...') }
  const handleAgentViewLogs = (_agentId: string) => { message.info('日志查看器开发中...') }

  const handleDelegate = async (values: Record<string, any>) => {
    setDelegating(true)
    try {
      const res = await api.post<{ task_id: string }>('/api/a2a/tasks/delegate', {
        goal: values.goal, assignee: values.assignee || undefined,
        role: values.role || undefined, priority: values.priority || 1,
        description: values.description, tools: values.tools || [],
        timeout_seconds: values.timeout_seconds,
        proposer: 'vulcan-primary', thread_id: `thread-${Date.now()}`,
      })
      message.success(`任务已委托: ${res.task_id}`)
      setDelegateModalOpen(false)
      form.resetFields()
      loadAll()
    } catch {
      message.success('任务已委托 (Demo模式)')
      setDelegateModalOpen(false)
      form.resetFields()
    } finally {
      setDelegating(false)
    }
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.post(`/api/a2a/tasks/delegated/${taskId}/complete`, { error: 'Cancelled by orchestrator' })
    } catch { /* demo mode */ }
    message.success('任务已取消')
    loadAll()
  }

  const selectedAgent = agentList.find(a => a.id === selectedAgentId) || null
  const idleCount = agentList.filter(a => a.status === 'idle').length
  const busyCount = agentList.filter(a => a.status === 'busy' || a.status === 'streaming').length
  const offlineCount = agentList.filter(a => a.status === 'offline').length

  const taskColumns = [
    {
      title: 'Task ID', dataIndex: 'task_id', key: 'task_id', width: 180,
      render: (id: string) => (
        <Text copyable={{ text: id }} style={{ fontFamily: 'monospace', fontSize: 11, color: '#A1A1AA' }}>{id}</Text>
      ),
    },
    {
      title: '目标', dataIndex: 'goal', key: 'goal',
      render: (goal: string) => <Text style={{ color: '#D1D5DB', fontSize: 12 }} ellipsis>{goal}</Text>,
    },
    {
      title: '执行者', dataIndex: 'assignee', key: 'assignee', width: 130,
      render: (n: string) => <Tag color="purple" style={{ fontSize: 11 }}>{n}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const colors: Record<string, string> = { proposed: '#6b7280', in_progress: '#f59e0b', completed: '#52c41a', failed: '#ef4444' }
        const labels: Record<string, string> = { proposed: '待认领', in_progress: '进行中', completed: '已完成', failed: '失败' }
        return <Tag color={colors[s]} style={{ fontSize: 11 }}>{labels[s] || s}</Tag>
      },
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (n: number) => (
        <Tag color={PRIORITY_COLOR[n]} style={{ fontSize: 11 }}>
          {PRIORITY_LABEL[n]}
        </Tag>
      ),
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 120,
      render: (ts: string) => <Text style={{ color: '#6B7280', fontSize: 11 }}>{formatTimeAgo(ts)}</Text>,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: DelegatedTask) => (
        <Button size="small" danger onClick={() => handleCancelTask(record.task_id)} style={{ fontSize: 11 }}>
          取消
        </Button>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0F', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #7065F3 0%, #A78BFA 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TeamOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Title level={3} style={{ margin: 0, color: '#FAFAFA' }}>Multi-Agent 工作台</Title>
          </div>
          <Text style={{ color: '#6B7280', fontSize: 12, marginLeft: 42 }}>
            Agent-to-Agent 协作 · 任务委托 · 实时状态监控
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAll}
            style={{ background: '#18181B', border: '1px solid #2C2C31', color: '#A1A1AA' }}>刷新</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setDelegateModalOpen(true)}
            style={{ background: '#7065F3', border: '#7065F3' }}>委托任务</Button>
        </Space>
      </div>

      {/* Pool Stats Row */}
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        {[
          { label: '注册 Agents', value: agentList.length, color: '#7065F3' },
          { label: '空闲', value: idleCount, color: '#52c41a' },
          { label: '忙碌/流式', value: busyCount, color: '#f59e0b' },
          { label: '离线', value: offlineCount, color: '#6b7280' },
          { label: '委托任务', value: poolStats?.total_delegated_tasks || 12, color: '#a78bfa' },
          { label: '进行中', value: poolStats?.active_delegated || 2, color: '#3b82f6' },
        ].map(stat => (
          <Col span={4} key={stat.label}>
            <Card size="small" style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 10 }}
              bodyStyle={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block' }}>{stat.label}</Text>
                  <Text style={{ color: stat.color, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}><Text style={{ color: '#6B7280' }}>加载 Agent 状态中...</Text></div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* Left Panel: Agent Pool */}
          <Col span={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamOutlined style={{ color: '#7065F3' }} />
                  <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>Agent 池</Text>
                  <Tag style={{ marginLeft: 4, fontSize: 10, background: '#7065F315', border: '1px solid #7065F330', color: '#A78BFA' }}>
                    {agentList.length} 个
                  </Tag>
                </div>
              }
              extra={
                <Tooltip title="添加新 Agent">
                  <Button size="small" icon={<PlusOutlined />}
                    style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#6B7280' }} />
                </Tooltip>
              }
              style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
              bodyStyle={{ padding: 12, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
            >
              {agentList.map(agent => (
                <AgentCard key={agent.id} agent={agent}
                  selected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(agent.id)}
                  onModelChange={handleModelChange}
                  onChannelChange={handleChannelChange}
                />
              ))}
              {agentList.length === 0 && (
                <Empty description={<Text style={{ color: '#6B7280' }}>暂无 Agent</Text>} style={{ padding: 32 }} />
              )}
            </Card>
          </Col>

          {/* Right Panel: Agent Detail */}
          <Col span={16}>
            {selectedAgent ? (
              <AgentDetailPanel
                agent={selectedAgent}
                activities={activities[selectedAgent.id] || []}
                onStart={() => handleAgentStart(selectedAgent.id)}
                onStop={() => handleAgentStop(selectedAgent.id)}
                onConfigure={() => handleAgentConfigure(selectedAgent.id)}
                onViewLogs={() => handleAgentViewLogs(selectedAgent.id)}
                onModelChange={model => handleModelChange(selectedAgent.id, model)}
                onChannelChange={channel => handleChannelChange(selectedAgent.id, channel)}
              />
            ) : (
              <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12, minHeight: 500 }}
                bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: '#18181B', border: '1px solid #2C2C31',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <TeamOutlined style={{ color: '#4B5563', fontSize: 28 }} />
                </div>
                <Title level={5} style={{ color: '#6B7280', margin: 0, marginBottom: 8 }}>选择一个 Agent 查看详情</Title>
                <Text style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
                  点击左侧 Agent 卡片可查看实时状态、配置模型和渠道、浏览活动记录
                </Text>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* Delegated Tasks Table */}
      <Card size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RocketOutlined style={{ color: '#7065F3' }} />
            <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>委托任务列表</Text>
            <Tag style={{ fontSize: 10, background: '#7065F315', border: '1px solid #7065F330', color: '#A78BFA' }}>
              {delegatedTasks.length}
            </Tag>
          </div>
        }
        style={{ marginTop: 16, background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={delegatedTasks}
          columns={taskColumns}
          rowKey="task_id"
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          style={{ background: 'transparent' }}
          locale={{ emptyText: <Empty description={<Text style={{ color: '#6B7280' }}>暂无委托任务</Text>} style={{ padding: 32 }} /> }}
        />
      </Card>

      {/* Delegate Task Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #7065F3 0%, #A78BFA 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SendOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <Text strong style={{ color: '#FAFAFA' }}>委托任务到 A2A 网络</Text>
          </div>
        }
        open={delegateModalOpen}
        onCancel={() => { setDelegateModalOpen(false); form.resetFields() }}
        footer={null}
        width={560}
        styles={{
          mask: { background: 'rgba(0,0,0,0.6)' },
          content: { background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 },
          header: { background: '#18181B', borderBottom: '1px solid #2C2C31' },
          body: { padding: 20 },
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleDelegate} style={{ marginTop: 16 }}>
          <Form.Item name="goal" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>任务目标</Text>}
            rules={[{ required: true, message: '请输入任务目标' }]}>
            <Input.TextArea rows={3} placeholder="用自然语言描述你要委托的任务目标..."
              style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#FAFAFA' }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="assignee" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>指定 Agent（可选）</Text>}>
                <Select allowClear placeholder="自动选择最佳 Agent"
                  options={agentList.map(a => ({
                    label: `${a.name} (${a.roleLabel}, ${STATUS_LABEL[a.status]})`,
                    value: a.name,
                  }))}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>指定角色（可选）</Text>}>
                <Select allowClear placeholder="任意可用 Agent"
                  options={[
                    { label: '📋 规划者 (planner)', value: 'planner' },
                    { label: '💻 编码者 (coder)', value: 'coder' },
                    { label: '🔍 研究者 (researcher)', value: 'researcher' },
                    { label: '📊 分析师 (analyst)', value: 'analyst' },
                  ]}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="priority" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>优先级</Text>} initialValue={1}>
                <Select options={[
                  { label: '🟢 低', value: 0 },
                  { label: '🔵 普通', value: 1 },
                  { label: '🟠 高', value: 2 },
                  { label: '🔴 紧急', value: 3 },
                ]} dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeout_seconds" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>超时时间</Text>} initialValue={300}>
                <Select options={[
                  { label: '1 分钟', value: 60 },
                  { label: '5 分钟', value: 300 },
                  { label: '15 分钟', value: 900 },
                  { label: '1 小时', value: 3600 },
                ]} dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>任务描述（可选）</Text>}>
            <Input placeholder="补充说明或约束条件..."
              style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#FAFAFA' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 8 }}>
            <Space>
              <Button onClick={() => { setDelegateModalOpen(false); form.resetFields() }}
                style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#A1A1AA' }}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={delegating}
                style={{ background: '#7065F3', border: '#7065F3' }}>发送委托</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
