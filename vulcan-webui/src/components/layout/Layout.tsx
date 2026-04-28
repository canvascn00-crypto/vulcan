import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Menu, Typography, Badge, Space, Spin, Input, Dropdown } from 'antd'
import {
  RobotOutlined,
  DashboardOutlined,
  ApiOutlined,
  ToolOutlined,
  DatabaseOutlined,
  TeamOutlined,
  WechatOutlined,
  SettingOutlined,
  ExperimentOutlined,
  EyeOutlined,
  AudioOutlined,
  SafetyOutlined,
  RocketOutlined,
  ApartmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  BellOutlined,
  SettingOutlined as SettingsOutlined,
} from '@ant-design/icons'
import { api, HealthResponse } from '@/services/api'

const { Content } = AntLayout
const { Text, Title } = Typography

// Color palette
const colors = {
  background: '#0D0D0F',
  surface: '#18181B',
  card: '#1F1F23',
  border: '#27272A',
  cardBorder: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
}

const mainNavItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '监控台' },
  { key: '/chat', icon: <RobotOutlined />, label: '对话' },
  { key: '/agents', icon: <TeamOutlined />, label: '多Agent' },
  { key: '/workflow', icon: <RocketOutlined />, label: '工作流' },
  { key: '/skills', icon: <ToolOutlined />, label: '技能市场' },
  { key: '/memory', icon: <DatabaseOutlined />, label: '记忆中心' },
  { key: '/mempalace', icon: <ApartmentOutlined />, label: '记忆宫殿' },
  { key: '/models', icon: <ApiOutlined />, label: '模型' },
  { key: '/wechat', icon: <WechatOutlined />, label: '微信' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

const moduleNavItems = [
  { key: '/observability', icon: <EyeOutlined />, label: '可观测性' },
  { key: '/evolver', icon: <ExperimentOutlined />, label: '自进化' },
  { key: '/multimodal', icon: <AudioOutlined />, label: '多模态' },
  { key: '/shield', icon: <SafetyOutlined />, label: '安全' },
  { key: '/devtools', icon: <ToolOutlined />, label: 'DevTools' },
  { key: '/optimizer', icon: <ApiOutlined />, label: '优化器' },
]

// Status dot component
function StatusDot({ status }: { status: 'online' | 'offline' | 'degraded' }) {
  const colorMap = {
    online: colors.success,
    offline: colors.danger,
    degraded: colors.warning,
  }
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colorMap[status],
        display: 'inline-block',
        boxShadow: `0 0 6px ${colorMap[status]}40`,
      }}
    />
  )
}

// Logo component
function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        padding: collapsed ? '16px 8px' : '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.accent} 0%, #8B5CF6 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <RobotOutlined style={{ fontSize: 18, color: '#fff' }} />
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Title
            level={5}
            style={{
              color: colors.textPrimary,
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Vulcan
          </Title>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            v2.0.0
          </Text>
        </div>
      )}
    </div>
  )
}

// Navigation menu item
function NavItem({
  item,
  collapsed,
  onClick,
  selected,
}: {
  item: { key: string; icon: React.ReactNode; label: string }
  collapsed: boolean
  onClick: () => void
  selected: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: collapsed ? '10px 0' : '10px 16px',
        margin: '2px 8px',
        borderRadius: 8,
        cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: selected ? `${colors.accent}15` : 'transparent',
        border: selected ? `1px solid ${colors.accent}30` : '1px solid transparent',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = colors.hover
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span
        style={{
          fontSize: 16,
          color: selected ? colors.accent : colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span
          style={{
            fontSize: 13,
            color: selected ? colors.textPrimary : colors.textSecondary,
            fontWeight: selected ? 500 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </span>
      )}
    </div>
  )
}

// Status indicator component
function StatusIndicator({
  label,
  status,
}: {
  label: string
  status: 'online' | 'offline' | 'degraded'
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
      }}
    >
      <StatusDot status={status} />
      <span
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pollHealth = () => {
      api.health()
        .then((r) => {
          setHealth(r)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
    pollHealth()
    const interval = setInterval(pollHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getWsStatus = (): 'online' | 'offline' | 'degraded' => {
    return health?.ws_connected ? 'online' : 'offline'
  }

  const getApiStatus = (): 'online' | 'offline' | 'degraded' => {
    if (!health?.status) return 'offline'
    if (health.status === 'ok') return 'online'
    if (health.status === 'degraded') return 'degraded'
    return 'offline'
  }

  const getGatewayStatus = (): 'online' | 'offline' | 'degraded' => {
    return health?.gateway_active ? 'online' : 'offline'
  }

  const getPageTitle = () => {
    const item = [...mainNavItems, ...moduleNavItems].find(
      (i) => i.key === location.pathname
    )
    return item?.label || 'Vulcan'
  }

  const getBreadcrumb = () => {
    return ['Vulcan', getPageTitle()].join(' / ')
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: colors.background,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: collapsed ? 64 : 260,
          minWidth: collapsed ? 64 : 260,
          height: '100vh',
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <Logo collapsed={collapsed} />

        {/* Collapse toggle */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            top: 20,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: colors.card,
            border: `1px solid ${colors.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s ease',
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: 12, color: colors.textSecondary }} />
          ) : (
            <MenuFoldOutlined style={{ fontSize: 12, color: colors.textSecondary }} />
          )}
        </div>

        {/* Main Navigation */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 0',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            {!collapsed && (
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 24px',
                  display: 'block',
                }}
              >
                导航
              </Text>
            )}
            {mainNavItems.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                collapsed={collapsed}
                selected={location.pathname === item.key}
                onClick={() => navigate(item.key)}
              />
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: colors.border,
              margin: '12px 16px',
            }}
          />

          {/* Module Navigation */}
          <div>
            {!collapsed && (
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 24px',
                  display: 'block',
                }}
              >
                模块
              </Text>
            )}
            {moduleNavItems.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                collapsed={collapsed}
                selected={location.pathname === item.key}
                onClick={() => navigate(item.key)}
              />
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: collapsed ? '12px 8px' : '16px 20px',
            background: colors.surface,
          }}
        >
          {!collapsed ? (
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                连接状态
              </Text>
              <StatusIndicator label="WebSocket" status={getWsStatus()} />
              <StatusIndicator label="API" status={getApiStatus()} />
              <StatusIndicator label="Gateway" status={getGatewayStatus()} />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <StatusDot status={getWsStatus()} />
              <StatusDot status={getApiStatus()} />
              <StatusDot status={getGatewayStatus()} />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            minHeight: 56,
            background: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          {/* Left: Breadcrumb / Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                fontWeight: 400,
              }}
            >
              {getBreadcrumb()}
            </Text>
          </div>

          {/* Right: Actions */}
          <Space size={16}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.cardBorder
              }}
            >
              <SearchOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>搜索...</Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  background: colors.hover,
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                ⌘K
              </Text>
            </div>

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.cardBorder
              }}
            >
              <BellOutlined style={{ color: colors.textSecondary, fontSize: 16 }} />
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colors.danger,
                  border: '2px solid colors.surface',
                }}
              />
            </div>

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.cardBorder
              }}
            >
              <SettingsOutlined style={{ color: colors.textSecondary, fontSize: 16 }} />
            </div>
          </Space>
        </div>

        {/* Content Area */}
        <Content
          style={{
            flex: 1,
            overflow: 'auto',
            background: colors.background,
            padding: 24,
          }}
        >
          <Outlet />
        </Content>
      </div>
    </div>
  )
}
