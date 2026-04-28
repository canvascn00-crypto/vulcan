import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Button, Switch, Timeline, Badge } from 'antd'
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ToolOutlined,
  BulbOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ExperimentOutlined,
  RocketOutlined,
  SettingOutlined,
  TagOutlined,
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
const mockEvolutionStats = {
  totalEvolutions: 47,
  currentVersion: 'v2.4.1',
  autoEvolve: true,
  successRate: 94.2,
}

const mockEvolutionHistory = [
  {
    id: 1,
    version: 'v2.4.1',
    date: '2026-04-28',
    changes: '优化了内存检索算法，添加了新的工具集成接口',
    status: 'success',
  },
  {
    id: 2,
    version: 'v2.4.0',
    date: '2026-04-25',
    changes: '新增多模态理解能力，改进了推理链稳定性',
    status: 'success',
  },
  {
    id: 3,
    version: 'v2.3.5',
    date: '2026-04-20',
    changes: '修复了agent池管理中的内存泄漏问题',
    status: 'success',
  },
  {
    id: 4,
    version: 'v2.3.0',
    date: '2026-04-15',
    changes: '添加了自进化监控面板，增强了错误处理',
    status: 'warning',
  },
  {
    id: 5,
    version: 'v2.2.0',
    date: '2026-04-10',
    changes: '重构了工作流引擎，提升了并发处理能力',
    status: 'success',
  },
  {
    id: 6,
    version: 'v2.1.0',
    date: '2026-04-05',
    changes: '引入了新的记忆层次结构，优化了检索精度',
    status: 'success',
  },
]

const mockCapabilities = [
  { name: '工具调用', icon: <ToolOutlined />, level: 5, color: colors.accent },
  { name: '记忆存储', icon: <DatabaseOutlined />, level: 4, color: colors.success },
  { name: '推理链', icon: <BulbOutlined />, level: 4, color: colors.warning },
  { name: 'API集成', icon: <ApiOutlined />, level: 5, color: '#06B6D4' },
  { name: '代码执行', icon: <ExperimentOutlined />, level: 3, color: '#F59E0B' },
  { name: '工作流编排', icon: <RocketOutlined />, level: 4, color: '#22C55E' },
  { name: '多Agent协作', icon: <SyncOutlined />, level: 3, color: '#EC4899' },
  { name: '自省能力', icon: <CheckCircleOutlined />, level: 4, color: colors.accent },
]

const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
}

export default function EvolverPage() {
  const [autoEvolve, setAutoEvolve] = useState(mockEvolutionStats.autoEvolve)
  const [checking, setChecking] = useState(false)

  const handleCheckUpdate = () => {
    setChecking(true)
    setTimeout(() => setChecking(false), 2000)
  }

  const getStatusColor = (status: string) => {
    return status === 'success' ? colors.success : colors.warning
  }

  const statCards = [
    {
      title: 'Evolutions总数',
      value: mockEvolutionStats.totalEvolutions,
      icon: <SyncOutlined />,
      gradient: 'linear-gradient(135deg, rgba(112, 101, 243, 0.15) 0%, rgba(112, 101, 243, 0.05) 100%)',
    },
    {
      title: '当前版本',
      value: mockEvolutionStats.currentVersion,
      icon: <TagOutlined />,
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
    },
    {
      title: '自动进化',
      value: autoEvolve ? '已启用' : '已禁用',
      icon: <ClockCircleOutlined />,
      gradient: autoEvolve
        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)'
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
    },
    {
      title: '成功率',
      value: `${mockEvolutionStats.successRate}%`,
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Space size={12}>
            <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 600 }}>
              自进化
            </Title>
            <Tag
              style={{
                background: `${colors.accent}20`,
                border: `1px solid ${colors.accent}40`,
                color: colors.accent,
                fontWeight: 600,
              }}
            >
              {mockEvolutionStats.currentVersion}
            </Tag>
          </Space>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Vulcan 自我优化与能力提升
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined spin={checking} />}
          onClick={handleCheckUpdate}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
        >
          检查更新
        </Button>
      </div>

      {/* Evolution Stats Row */}
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
                  <Title level={3} style={{ margin: 0, color: colors.textPrimary, fontWeight: 700 }}>
                    {stat.value}
                  </Title>
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

      {/* Evolution History + Capabilities Row */}
      <Row gutter={16}>
        {/* Evolution History Card */}
        <Col xs={24} lg={14}>
          <Card style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 20 }}>
              <ClockCircleOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                进化历史
              </Title>
            </Space>
            <Timeline
              items={mockEvolutionHistory.map((item) => ({
                color: getStatusColor(item.status),
                dot: item.status === 'success' ? (
                  <CheckCircleOutlined style={{ color: colors.success }} />
                ) : (
                  <ClockCircleOutlined style={{ color: colors.warning }} />
                ),
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space size={8}>
                        <Tag style={{ background: `${colors.accent}20`, border: 'none', color: colors.accent, fontWeight: 600 }}>
                          {item.version}
                        </Tag>
                        <Badge
                          status={item.status === 'success' ? 'success' : 'warning'}
                          text={
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              {item.status === 'success' ? '成功' : '部分成功'}
                            </Text>
                          }
                        />
                      </Space>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.date}</Text>
                    </div>
                    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{item.changes}</Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        {/* Capabilities Card */}
        <Col xs={24} lg={10}>
          <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 20 }}>
              <RocketOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                能力网格
              </Title>
            </Space>
            <Row gutter={[12, 12]}>
              {mockCapabilities.map((cap) => (
                <Col xs={12} key={cap.name}>
                  <div
                    style={{
                      padding: 16,
                      background: colors.hover,
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        color: cap.color,
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      {cap.icon}
                    </div>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, display: 'block', marginBottom: 8 }}>
                      {cap.name}
                    </Text>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: i < cap.level ? cap.color : colors.border,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Current Version + Auto-Evolve Toggle Row */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* Current Version Card */}
        <Col xs={24} lg={12}>
          <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 20 }}>
              <SettingOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                当前版本详情
              </Title>
            </Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>版本号</Text>
                <Tag style={{ background: `${colors.accent}20`, border: 'none', color: colors.accent, fontWeight: 600 }}>
                  {mockEvolutionStats.currentVersion}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>构建日期</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>2026-04-28 08:30:00</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Git Commit</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontFamily: 'monospace' }}>
                  a3f8c2d7e9b1
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>进化代数</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{mockEvolutionStats.totalEvolutions} 次</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>构建环境</Text>
                <Tag style={{ background: colors.hover, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                  production
                </Tag>
              </div>
            </div>
          </Card>
        </Col>

        {/* Auto-Evolve Toggle Card */}
        <Col xs={24} lg={12}>
          <Card style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 20 }}>
              <SyncOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                自动进化
              </Title>
            </Space>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 0',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  background: autoEvolve ? `${colors.success}20` : `${colors.error}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  transition: 'all 0.3s ease',
                }}
              >
                <SyncOutlined
                  style={{
                    fontSize: 36,
                    color: autoEvolve ? colors.success : colors.error,
                  }}
                />
              </div>
              <Title level={3} style={{ margin: 0, color: colors.textPrimary, marginBottom: 8 }}>
                {autoEvolve ? '自动进化已启用' : '自动进化已禁用'}
              </Title>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 24, maxWidth: 300 }}>
                {autoEvolve
                  ? '系统将在后台自动分析性能瓶颈并进行优化，无需人工干预'
                  : '系统不会自动进行自我优化，需要手动触发进化过程'}
              </Text>
              <Switch
                checked={autoEvolve}
                onChange={setAutoEvolve}
                checkedChildren="开"
                unCheckedChildren="关"
                style={{
                  background: autoEvolve ? colors.success : colors.error,
                }}
              />
              {autoEvolve && (
                <div style={{ marginTop: 16 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    下次进化预计: 2026-04-29 02:00:00
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
