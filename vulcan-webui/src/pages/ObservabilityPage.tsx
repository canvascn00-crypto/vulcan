import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Button, Table, Progress, Statistic, Select } from 'antd'
import {
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  BugOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  GlobalOutlined,
  ApiOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// Color tokens - Claude style
const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
}

// Mock data
const mockMetrics = {
  requestsPerSec: 1247,
  avgLatency: 145,
  errorRate: 0.82,
  uptime: 99.97,
}

const mockRequests = [
  { id: 1, method: 'GET', endpoint: '/api/v1/agents', status: 200, latency: 23, time: '14:32:01' },
  { id: 2, method: 'POST', endpoint: '/api/v1/tasks', status: 201, latency: 45, time: '14:32:03' },
  { id: 3, method: 'GET', endpoint: '/api/v1/memory/search', status: 200, latency: 89, time: '14:32:05' },
  { id: 4, method: 'POST', endpoint: '/api/v1/evolve', status: 500, latency: 234, time: '14:32:08' },
  { id: 5, method: 'GET', endpoint: '/api/v1/workflows', status: 200, latency: 34, time: '14:32:12' },
  { id: 6, method: 'DELETE', endpoint: '/api/v1/sessions/123', status: 204, latency: 12, time: '14:32:15' },
  { id: 7, method: 'PUT', endpoint: '/api/v1/settings', status: 400, latency: 28, time: '14:32:18' },
  { id: 8, method: 'GET', endpoint: '/api/v1/health', status: 200, latency: 5, time: '14:32:20' },
]

const mockErrors = [
  { id: 1, message: 'Failed to connect to external API: timeout after 30s', timestamp: '14:32:08', level: 'error' },
  { id: 2, message: 'Memory query returned empty result set', timestamp: '14:30:45', level: 'warning' },
  { id: 3, message: 'Agent pool exhausted, queuing request', timestamp: '14:28:12', level: 'warning' },
  { id: 4, message: 'Invalid workflow definition at step 3', timestamp: '14:25:33', level: 'error' },
  { id: 5, message: 'Cache miss rate exceeded threshold (45%)', timestamp: '14:22:01', level: 'warning' },
]

const mockLatencyData = [
  { time: '14:28', p50: 45, p95: 120, p99: 234 },
  { time: '14:29', p50: 52, p95: 145, p99: 289 },
  { time: '14:30', p50: 48, p95: 132, p99: 256 },
  { time: '14:31', p50: 61, p95: 178, p99: 345 },
  { time: '14:32', p50: 55, p95: 156, p99: 298 },
]

const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
}

export default function ObservabilityPage() {
  const [timeRange, setTimeRange] = useState('5m')
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return colors.success
    if (status >= 400 && status < 500) return colors.warning
    if (status >= 500) return colors.error
    return colors.textSecondary
  }

  const getMethodColor = (method: string) => {
    const methodColors: Record<string, string> = {
      GET: '#22C55E',
      POST: '#7065F3',
      PUT: '#F59E0B',
      DELETE: '#EF4444',
      PATCH: '#06B6D4',
    }
    return methodColors[method] || colors.textSecondary
  }

  const requestColumns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag style={{ background: `${getMethodColor(method)}20`, border: 'none', color: getMethodColor(method), fontWeight: 600 }}>
          {method}
        </Tag>
      ),
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (endpoint: string) => (
        <Text style={{ color: colors.textPrimary, fontFamily: 'monospace', fontSize: 13 }}>{endpoint}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag style={{ background: `${getStatusColor(status)}20`, border: 'none', color: getStatusColor(status) }}>
          {status}
        </Tag>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency: number) => (
        <Text style={{ color: latency > 200 ? colors.error : colors.textPrimary }}>{latency}ms</Text>
      ),
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => <Text style={{ color: colors.textSecondary }}>{time}</Text>,
    },
  ]

  const statCards = [
    {
      title: 'Requests/sec',
      value: mockMetrics.requestsPerSec.toLocaleString(),
      icon: <ApiOutlined />,
      gradient: 'linear-gradient(135deg, rgba(112, 101, 243, 0.15) 0%, rgba(112, 101, 243, 0.05) 100%)',
      suffix: <RiseOutlined style={{ color: colors.success, fontSize: 12 }} />,
    },
    {
      title: 'Avg Latency',
      value: mockMetrics.avgLatency,
      icon: <ClockCircleOutlined />,
      suffix: <Text style={{ color: colors.warning, fontSize: 12 }}>ms</Text>,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
    },
    {
      title: 'Error Rate',
      value: mockMetrics.errorRate,
      icon: <BugOutlined />,
      suffix: <Text style={{ color: colors.textSecondary, fontSize: 12 }}>%</Text>,
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
    },
    {
      title: 'Uptime',
      value: mockMetrics.uptime,
      icon: <DashboardOutlined />,
      suffix: <Text style={{ color: colors.textSecondary, fontSize: 12 }}>%</Text>,
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 600 }}>
            可观测性
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            系统性能与健康监控
          </Text>
        </div>
        <Space size={16}>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 120, background: colors.surface }}
            options={[
              { value: '1m', label: '最近 1 分钟' },
              { value: '5m', label: '最近 5 分钟' },
              { value: '15m', label: '最近 15 分钟' },
              { value: '1h', label: '最近 1 小时' },
            ]}
          />
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={handleRefresh}
            style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map((stat) => (
          <Col xs={12} sm={12} md={6} key={stat.title}>
            <Card
              style={{ ...cardStyle, background: stat.gradient }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, display: 'block', marginBottom: 8 }}>
                    {stat.title}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <Statistic value={stat.value} valueStyle={{ margin: 0, color: colors.textPrimary, fontWeight: 700, fontSize: 28 }} />
                    {stat.suffix}
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${colors.accent}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: colors.accent,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Latency Chart Card */}
      <Card style={{ ...cardStyle, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Space size={12}>
            <ThunderboltOutlined style={{ color: colors.accent, fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
              延迟分布
            </Title>
          </Space>
          <Space size={16}>
            <Space size={8}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: colors.accent }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>P50</Text>
            </Space>
            <Space size={8}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: colors.warning }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>P95</Text>
            </Space>
            <Space size={8}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: colors.error }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>P99</Text>
            </Space>
          </Space>
        </div>
        <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 8px' }}>
          {mockLatencyData.map((item, index) => (
            <div key={item.time} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 160 }}>
                <div
                  style={{
                    width: 20,
                    height: (item.p50 / 350) * 160,
                    background: colors.accent,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    width: 20,
                    height: (item.p95 / 350) * 160,
                    background: colors.warning,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    width: 20,
                    height: (item.p99 / 350) * 160,
                    background: colors.error,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.9,
                  }}
                />
              </div>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.time}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Request Log + System Metrics Row */}
      <Row gutter={16}>
        {/* Request Log Card */}
        <Col xs={24} lg={14}>
          <Card style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space size={12}>
                <ApiOutlined style={{ color: colors.accent, fontSize: 18 }} />
                <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                  请求日志
                </Title>
              </Space>
              <Button type="text" size="small" style={{ color: colors.accent }}>
                查看全部
              </Button>
            </div>
            <Table
              dataSource={mockRequests}
              columns={requestColumns}
              rowKey="id"
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>

        {/* System Metrics Card */}
        <Col xs={24} lg={10}>
          <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 20 }}>
              <GlobalOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                系统资源
              </Title>
            </Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>CPU 使用率</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>42%</Text>
                </div>
                <Progress percent={42} showInfo={false} strokeColor={colors.accent} trailColor={colors.border} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>内存使用率</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>67%</Text>
                </div>
                <Progress percent={67} showInfo={false} strokeColor={colors.warning} trailColor={colors.border} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>磁盘使用率</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>23%</Text>
                </div>
                <Progress percent={23} showInfo={false} strokeColor={colors.success} trailColor={colors.border} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>网络 I/O</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>156 MB/s</Text>
                </div>
                <Progress percent={62} showInfo={false} strokeColor={colors.accent} trailColor={colors.border} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Error Feed Card */}
      <Card style={{ ...cardStyle, marginTop: 16 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size={12}>
            <BugOutlined style={{ color: colors.error, fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
              错误 feed
            </Title>
          </Space>
          <Tag style={{ background: `${colors.error}20`, border: 'none', color: colors.error }}>
            {mockErrors.length} 条错误
          </Tag>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mockErrors.map((error) => (
            <div
              key={error.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: 12,
                background: colors.hover,
                borderRadius: 8,
                borderLeft: `3px solid ${error.level === 'error' ? colors.error : colors.warning}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, display: 'block', marginBottom: 4 }}>
                  {error.message}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {error.timestamp}
                </Text>
              </div>
              <Tag
                style={{
                  background: `${error.level === 'error' ? colors.error : colors.warning}20`,
                  border: 'none',
                  color: error.level === 'error' ? colors.error : colors.warning,
                }}
              >
                {error.level}
              </Tag>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
