import { useState, useEffect } from 'react'
import { Typography, Card, Row, Col, Statistic, Space, Tag, Spin } from 'antd'
import {
  RobotOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { api, HealthResponse, TaskInfo } from '@/services/api'

const { Title, Text } = Typography

interface Stats {
  activeAgents: number
  conversationsToday: number
  toolCalls: number
  avgLatency: number
  uptime: number
  version: string
  gatewayRunning: boolean
  platforms: string[]
  pendingTasks: number
  completedTasks: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const [health, tasks, tools, gwStatus] = await Promise.all([
        api.health().catch(() => null),
        api.listTasks().catch(() => []),
        api.listTools().catch(() => ({ tools: [], toolsets: [] })),
        api.gatewayStatus().catch(() => null),
      ])

      const h = health as HealthResponse | null
      const t = tasks as TaskInfo[]
      const running = t.filter((x) => x.status === 'running').length
      const completed = t.filter((x) => x.status === 'completed').length
      const pending = t.filter((x) => x.status === 'pending').length

      setStats({
        activeAgents: running + (h ? 1 : 0),
        conversationsToday: completed + running,
        toolCalls: (tools as { tools: unknown[] }).tools?.length ?? 0,
        avgLatency: 0,
        uptime: 0,
        version: h?.version || '0.1.0',
        gatewayRunning: (gwStatus as { running?: boolean })?.running ?? false,
        platforms: (gwStatus as { platforms?: string[] })?.platforms ?? [],
        pendingTasks: pending,
        completedTasks: completed,
      })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="danger">{error || '无法连接 Vulcan 服务'}</Text>
        <br />
        <button onClick={load} style={{ marginTop: 12 }}>重试</button>
      </div>
    )
  }

  const statCards = [
    {
      title: '活跃 Agent',
      value: stats.activeAgents,
      icon: <RobotOutlined />,
      color: '#5a6ef5',
      suffix: '个',
    },
    {
      title: '今日对话',
      value: stats.conversationsToday,
      icon: <MessageOutlined />,
      color: '#10b981',
      suffix: '轮',
    },
    {
      title: '工具注册',
      value: stats.toolCalls,
      icon: <ThunderboltOutlined />,
      color: '#f59e0b',
      suffix: '个',
    },
    {
      title: '待处理任务',
      value: stats.pendingTasks,
      icon: <ClockCircleOutlined />,
      color: '#ef4444',
      suffix: '个',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>📊 监控面板</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Vulcan v{stats.version}
          </Text>
        </div>
        <Space>
          <Tag color={stats.gatewayRunning ? 'green' : 'red'}>
            Gateway {stats.gatewayRunning ? '运行中' : '已停止'}
          </Tag>
          <Tag color="blue">{stats.platforms.length} 平台</Tag>
        </Space>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={12} sm={12} md={6} key={s.title}>
            <Card>
              <Statistic
                title={s.title}
                value={s.value}
                suffix={s.suffix}
                valueStyle={{ color: s.color, fontSize: 28 }}
                prefix={<span style={{ marginRight: 8, color: s.color }}>{s.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Two-column info */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="平台状态" size="small">
            {stats.platforms.length === 0 ? (
              <Text type="secondary">暂无平台连接</Text>
            ) : (
              <Space wrap>
                {stats.platforms.map((p) => (
                  <Tag key={p} icon={<DesktopOutlined />}>{p}</Tag>
                ))}
              </Space>
            )}
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Gateway: {stats.gatewayRunning ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <span style={{ color: '#ff4d4f' }}>✗</span>}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="任务概况" size="small">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="已完成"
                  value={stats.completedTasks}
                  valueStyle={{ fontSize: 20, color: '#10b981' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="运行中"
                  value={stats.activeAgents - 1}
                  valueStyle={{ fontSize: 20, color: '#5a6ef5' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
