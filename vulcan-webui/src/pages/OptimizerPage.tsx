import { useState } from 'react'
import { Row, Col, Card, Typography, Statistic, Table, Switch, Button, Space, Checkbox } from 'antd'
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DollarOutlined,
  RocketOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// Claude-style color tokens
const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
}

interface OptimizationLog {
  key: string
  time: string
  type: string
  before: string
  after: string
  savings: string
}

export default function OptimizerPage() {
  const [optimizationTargets, setOptimizationTargets] = useState({
    contextCompression: true,
    cache: true,
    routing: false,
    batchInference: true,
  })
  const [running, setRunning] = useState(false)

  const statsData = [
    {
      title: 'Token 节省',
      value: 2847593,
      suffix: 'tokens',
      icon: <ThunderboltOutlined />,
      gradient: 'linear-gradient(135deg, rgba(112, 101, 243, 0.15) 0%, rgba(112, 101, 243, 0.05) 100%)',
      color: colors.accent,
    },
    {
      title: '延迟降低',
      value: 47,
      suffix: '%',
      icon: <ClockCircleOutlined />,
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
      color: colors.success,
    },
    {
      title: '缓存命中率',
      value: 89.2,
      suffix: '%',
      precision: 1,
      icon: <DatabaseOutlined />,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
      color: colors.warning,
    },
    {
      title: '今日成本',
      value: 12.47,
      prefix: '$',
      precision: 2,
      icon: <DollarOutlined />,
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
      color: colors.error,
    },
  ]

  const optimizationLogData: OptimizationLog[] = [
    {
      key: '1',
      time: '14:32:05',
      type: '上下文压缩',
      before: '4096 tokens',
      after: '2048 tokens',
      savings: '-50%',
    },
    {
      key: '2',
      time: '14:28:41',
      type: '批量推理',
      before: '320ms',
      after: '180ms',
      savings: '-43%',
    },
    {
      key: '3',
      time: '14:15:22',
      type: '缓存优化',
      before: '12ms (miss)',
      after: '1ms (hit)',
      savings: '-91%',
    },
    {
      key: '4',
      time: '14:02:18',
      type: '路由优化',
      before: '450ms',
      after: '310ms',
      savings: '-31%',
    },
    {
      key: '5',
      time: '13:55:03',
      type: '上下文压缩',
      before: '8192 tokens',
      after: '3584 tokens',
      savings: '-56%',
    },
    {
      key: '6',
      time: '13:41:37',
      type: '批量推理',
      before: '280ms',
      after: '155ms',
      savings: '-44%',
    },
  ]

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (text: string) => (
        <Text style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: 13 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => (
        <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{text}</Text>
      ),
    },
    {
      title: '优化前',
      dataIndex: 'before',
      key: 'before',
      render: (text: string) => (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{text}</Text>
      ),
    },
    {
      title: '优化后',
      dataIndex: 'after',
      key: 'after',
      render: (text: string) => (
        <Text style={{ color: colors.success, fontSize: 13 }}>{text}</Text>
      ),
    },
    {
      title: '节省',
      dataIndex: 'savings',
      key: 'savings',
      render: (text: string) => (
        <Text style={{ color: colors.success, fontWeight: 600, fontSize: 13 }}>{text}</Text>
      ),
    },
  ]

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
  }

  const handleOptimize = () => {
    setRunning(true)
    setTimeout(() => setRunning(false), 2000)
  }

  const handleReset = () => {
    setOptimizationTargets({
      contextCompression: true,
      cache: true,
      routing: false,
      batchInference: true,
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 600 }}>
            优化器
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            自动优化模型性能与成本
          </Text>
        </div>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          loading={running}
          onClick={handleOptimize}
          style={{
            background: colors.accent,
            border: 'none',
            borderRadius: 8,
            height: 42,
            paddingLeft: 20,
            paddingRight: 20,
            fontWeight: 500,
          }}
        >
          运行优化
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statsData.map((stat) => (
          <Col xs={12} sm={12} md={6} key={stat.title}>
            <Card
              style={{ ...cardStyle, background: stat.gradient }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, display: 'block', marginBottom: 8 }}>
                    {stat.title}
                  </Text>
                  <Statistic
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                    precision={stat.precision}
                    valueStyle={{
                      color: colors.textPrimary,
                      fontSize: 26,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${stat.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        {/* Optimization Targets */}
        <Col xs={24} lg={8}>
          <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
            <Title level={4} style={{ margin: '0 0 20px 0', color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>
              优化目标
            </Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: optimizationTargets.contextCompression ? `${colors.accent}15` : colors.hover,
                  borderRadius: 10,
                  border: `1px solid ${optimizationTargets.contextCompression ? colors.accent : colors.border}`,
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>上下文压缩</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                    减少 token 使用量
                  </Text>
                </div>
                <Switch
                  checked={optimizationTargets.contextCompression}
                  onChange={(checked) =>
                    setOptimizationTargets((prev) => ({ ...prev, contextCompression: checked }))
                  }
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: optimizationTargets.cache ? `${colors.accent}15` : colors.hover,
                  borderRadius: 10,
                  border: `1px solid ${optimizationTargets.cache ? colors.accent : colors.border}`,
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>智能缓存</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                    提升响应速度
                  </Text>
                </div>
                <Switch
                  checked={optimizationTargets.cache}
                  onChange={(checked) =>
                    setOptimizationTargets((prev) => ({ ...prev, cache: checked }))
                  }
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: optimizationTargets.routing ? `${colors.accent}15` : colors.hover,
                  borderRadius: 10,
                  border: `1px solid ${optimizationTargets.routing ? colors.accent : colors.border}`,
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>智能路由</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                    最优模型自动选择
                  </Text>
                </div>
                <Switch
                  checked={optimizationTargets.routing}
                  onChange={(checked) =>
                    setOptimizationTargets((prev) => ({ ...prev, routing: checked }))
                  }
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: optimizationTargets.batchInference ? `${colors.accent}15` : colors.hover,
                  borderRadius: 10,
                  border: `1px solid ${optimizationTargets.batchInference ? colors.accent : colors.border}`,
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>批量推理</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                    合并请求降低延迟
                  </Text>
                </div>
                <Switch
                  checked={optimizationTargets.batchInference}
                  onChange={(checked) =>
                    setOptimizationTargets((prev) => ({ ...prev, batchInference: checked }))
                  }
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Performance Chart */}
        <Col xs={24} lg={16}>
          <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
            <Title level={4} style={{ margin: '0 0 20px 0', color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>
              性能趋势
            </Title>

            {/* Chart Placeholder */}
            <div
              style={{
                height: 220,
                background: colors.hover,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Grid lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    linear-gradient(${colors.border} 1px, transparent 1px),
                    linear-gradient(90deg, ${colors.border} 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  opacity: 0.5,
                }}
              />

              {/* Chart area */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 30,
                  left: 20,
                  right: 20,
                  height: 140,
                }}
              >
                {/* Y-axis labels */}
                <div style={{ position: 'absolute', left: -30, top: 0, color: colors.textSecondary, fontSize: 11 }}>
                  100%
                </div>
                <div style={{ position: 'absolute', left: -30, top: 70, color: colors.textSecondary, fontSize: 11 }}>
                  50%
                </div>
                <div style={{ position: 'absolute', left: -30, top: 140, color: colors.textSecondary, fontSize: 11 }}>
                  0%
                </div>

                {/* Area chart fill */}
                <svg width="100%" height="140" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.accent} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={colors.accent} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,120 C40,110 80,90 120,70 C160,50 200,60 240,40 C280,20 320,30 360,25 C400,20 440,35 480,20 L520,15 L520,140 L0,140 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0,120 C40,110 80,90 120,70 C160,50 200,60 240,40 C280,20 320,30 360,25 C400,20 440,35 480,20 L520,15"
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                {/* X-axis labels */}
                <div style={{ position: 'absolute', bottom: -25, left: 0, color: colors.textSecondary, fontSize: 11 }}>
                  00:00
                </div>
                <div style={{ position: 'absolute', bottom: -25, left: 130, color: colors.textSecondary, fontSize: 11 }}>
                  04:00
                </div>
                <div style={{ position: 'absolute', bottom: -25, left: 260, color: colors.textSecondary, fontSize: 11 }}>
                  08:00
                </div>
                <div style={{ position: 'absolute', bottom: -25, left: 390, color: colors.textSecondary, fontSize: 11 }}>
                  12:00
                </div>
                <div style={{ position: 'absolute', bottom: -25, right: 0, color: colors.textSecondary, fontSize: 11 }}>
                  16:00
                </div>
              </div>

              {/* Chart title overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 16,
                  color: colors.textSecondary,
                  fontSize: 12,
                }}
              >
                响应时间改善率
              </div>
            </div>
          </Card>
        </Col>

        {/* Optimization Log */}
        <Col xs={24}>
          <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Title level={4} style={{ margin: 0, color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>
                优化日志
              </Title>
              <Space size={12}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  style={{
                    background: colors.hover,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    color: colors.textSecondary,
                  }}
                >
                  重置默认
                </Button>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={running}
                  onClick={handleOptimize}
                  style={{
                    background: colors.accent,
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                  }}
                >
                  运行优化
                </Button>
              </Space>
            </div>

            <Table
              dataSource={optimizationLogData}
              columns={logColumns}
              pagination={false}
              size="middle"
              style={{
                background: 'transparent',
              }}
              rowKey="key"
              onRow={(record) => ({
                style: {
                  background: 'transparent',
                  borderBottom: `1px solid ${colors.border}`,
                },
              })}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
