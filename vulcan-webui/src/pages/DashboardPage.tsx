import { useState, useEffect } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Button, Spin } from 'antd'
import {
  RobotOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  GatewayOutlined,
  ApiOutlined,
  GlobalOutlined,
  SyncOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { api } from '@/services/api'

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

interface SystemStatus {
  ws: 'online' | 'offline' | 'connecting'
  http: 'online' | 'offline'
  gateway: 'online' | 'offline'
  api: 'online' | 'offline'
}

interface Activity {
  id: string
  type: 'task' | 'agent' | 'system' | 'chat'
  title: string
  description: string
  timestamp: Date
  status?: 'success' | 'warning' | 'error'
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    ws: 'connecting',
    http: 'online',
    gateway: 'online',
    api: 'online',
  })
  const [stats, setStats] = useState({
    activeAgents: 12,
    totalTasks: 1589,
    activeSessions: 8,
    systemLoad: 42,
    version: 'v2.4.1',
    uptime: 172800,
    memoryUsage: 67,
  })
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      type: 'task',
      title: '任务完成',
      description: '数据同步任务 #1589 已完成',
      timestamp: new Date(Date.now() - 5 * 60000),
      status: 'success',
    },
    {
      id: '2',
      type: 'agent',
      title: 'Agent 上线',
      description: '数据分析 Agent 已连接',
      timestamp: new Date(Date.now() - 12 * 60000),
      status: 'success',
    },
    {
      id: '3',
      type: 'chat',
      title: '新对话',
      description: '用户 张三 开始了新对话',
      timestamp: new Date(Date.now() - 23 * 60000),
    },
    {
      id: '4',
      type: 'system',
      title: '系统告警',
      description: '内存使用率超过 80%',
      timestamp: new Date(Date.now() - 45 * 60000),
      status: 'warning',
    },
    {
      id: '5',
      type: 'task',
      title: '任务失败',
      description: 'API 集成任务 #1587 失败',
      timestamp: new Date(Date.now() - 67 * 60000),
      status: 'error',
    },
  ])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    setLoading(false)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}天 ${hours}小时`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  const getStatusDot = (status: string) => {
    const statusColors: Record<string, string> = {
      online: colors.success,
      offline: colors.error,
      connecting: colors.warning,
    }
    return (
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: statusColors[status] || colors.error,
          marginRight: 8,
          boxShadow: `0 0 6px ${statusColors[status] || colors.error}`,
        }}
      />
    )
  }

  const getActivityIcon = (type: string) => {
    const iconStyle = { fontSize: 14 }
    switch (type) {
      case 'task':
        return <CheckCircleOutlined style={{ ...iconStyle, color: colors.accent }} />
      case 'agent':
        return <RobotOutlined style={{ ...iconStyle, color: colors.success }} />
      case 'chat':
        return <MessageOutlined style={{ ...iconStyle, color: colors.warning }} />
      case 'system':
        return <ExclamationCircleOutlined style={{ ...iconStyle, color: colors.warning }} />
      default:
        return <DashboardOutlined style={iconStyle} />
    }
  }

  const statCards = [
    {
      title: 'Agents在线数',
      value: stats.activeAgents,
      icon: <RobotOutlined />,
      gradient: 'linear-gradient(135deg, rgba(112, 101, 243, 0.15) 0%, rgba(112, 101, 243, 0.05) 100%)',
    },
    {
      title: '总任务数',
      value: stats.totalTasks.toLocaleString(),
      icon: <ThunderboltOutlined />,
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
    },
    {
      title: '活跃会话',
      value: stats.activeSessions,
      icon: <MessageOutlined />,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
    },
    {
      title: '系统负载',
      value: `${stats.systemLoad}%`,
      icon: <DashboardOutlined />,
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
    },
  ]

  const quickActions = [
    { label: '新建任务', icon: <PlusOutlined />, color: colors.accent },
    { label: '刷新状态', icon: <ReloadOutlined />, color: colors.success },
    { label: '系统设置', icon: <SettingOutlined />, color: colors.textSecondary },
    { label: '查看日志', icon: <ClockCircleOutlined />, color: colors.warning },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: colors.bg }}>
        <Spin size="large" />
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 600 }}>
            监控台
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Vulcan 系统运行状态
          </Text>
        </div>
        <Space size={16}>
          <div style={{ textAlign: 'right' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>当前时间</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 500, fontFamily: 'monospace' }}>
              {formatTime(currentTime)}
            </Text>
          </div>
          <Tag
            icon={<SyncOutlined spin />}
            style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.success }}
          >
            实时
          </Tag>
        </Space>
      </div>

      {/* 4 Stat Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map((stat) => (
          <Col xs={12} sm={12} md={6} key={stat.title}>
            <Card
              style={{
                ...cardStyle,
                background: stat.gradient,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, display: 'block', marginBottom: 8 }}>
                    {stat.title}
                  </Text>
                  <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 700 }}>
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

      {/* System Status Card */}
      <Card style={{ ...cardStyle, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size={12}>
            <GatewayOutlined style={{ color: colors.accent, fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
              系统状态
            </Title>
          </Space>
          <Tag style={{ background: `${colors.success}20`, border: 'none', color: colors.success }}>
            运行正常
          </Tag>
        </div>
        <Row gutter={[32, 16]}>
          {[
            { label: 'WebSocket', status: systemStatus.ws, icon: <GlobalOutlined /> },
            { label: 'HTTP', status: systemStatus.http, icon: <ApiOutlined /> },
            { label: 'Gateway', status: systemStatus.gateway, icon: <GatewayOutlined /> },
            { label: 'API', status: systemStatus.api, icon: <ApiOutlined /> },
          ].map((item) => (
            <Col key={item.label} xs={12} sm={6}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: colors.hover,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 16, marginRight: 10 }}>{item.icon}</span>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginRight: 8 }}>{item.label}</Text>
                {getStatusDot(item.status)}
                <Text style={{ color: colors.textPrimary, fontSize: 13, textTransform: 'capitalize' }}>
                  {item.status === 'online' ? '在线' : item.status === 'offline' ? '离线' : '连接中'}
                </Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Recent Activity + Quick Actions Row */}
      <Row gutter={16}>
        {/* Recent Activity */}
        <Col xs={24} lg={14}>
          <Card style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space size={12}>
                <ClockCircleOutlined style={{ color: colors.accent, fontSize: 18 }} />
                <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                  最近活动
                </Title>
              </Space>
              <Button type="text" size="small" style={{ color: colors.accent }}>
                查看全部
              </Button>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: index < activities.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: colors.hover,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      flexShrink: 0,
                    }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>
                        {activity.title}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {formatRelativeTime(activity.timestamp)}
                      </Text>
                    </div>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {activity.description}
                    </Text>
                  </div>
                  {activity.status && (
                    <Tag
                      style={{
                        marginLeft: 8,
                        background:
                          activity.status === 'success'
                            ? `${colors.success}20`
                            : activity.status === 'warning'
                            ? `${colors.warning}20`
                            : `${colors.error}20`,
                        border: 'none',
                        color:
                          activity.status === 'success'
                            ? colors.success
                            : activity.status === 'warning'
                            ? colors.warning
                            : colors.error,
                      }}
                    >
                      {activity.status === 'success' ? '成功' : activity.status === 'warning' ? '警告' : '失败'}
                    </Tag>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Quick Actions + System Info */}
        <Col xs={24} lg={10}>
          {/* Quick Actions */}
          <Card style={{ ...cardStyle, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 16 }}>
              <PlayCircleOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                快速操作
              </Title>
            </Space>
            <Row gutter={[12, 12]}>
              {quickActions.map((action) => (
                <Col xs={12} key={action.label}>
                  <Button
                    block
                    size="large"
                    icon={action.icon}
                    style={{
                      height: 64,
                      background: colors.hover,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      color: colors.textPrimary,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{action.label}</span>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>

          {/* System Info */}
          <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
            <Space size={12} style={{ marginBottom: 16 }}>
              <SettingOutlined style={{ color: colors.accent, fontSize: 18 }} />
              <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
                系统信息
              </Title>
            </Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>版本</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{stats.version}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>运行时间</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{formatUptime(stats.uptime)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>内存使用</Text>
                <Space size={8}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{stats.memoryUsage}%</Text>
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      background: colors.border,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.memoryUsage}%`,
                        height: '100%',
                        background:
                          stats.memoryUsage > 80 ? colors.error : stats.memoryUsage > 60 ? colors.warning : colors.success,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </Space>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>CPU 负载</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{stats.systemLoad}%</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
