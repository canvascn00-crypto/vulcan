import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Typography } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { api, HealthResponse } from '@/services/api'
import { colors, mainNavItems, moduleNavItems } from './layoutConfig'
import { Logo, NavItem, StatusIndicator, StatusDot } from './SidebarParts'
import { HeaderBar } from './HeaderBar'

const { Content } = AntLayout
const { Text } = Typography

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pollHealth = () => {
      api.health().then((r) => { setHealth(r); setLoading(false) }).catch(() => setLoading(false))
    }
    pollHealth()
    const interval = setInterval(pollHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getWsStatus = (): 'online' | 'offline' | 'degraded' => health?.ws_connected ? 'online' : 'offline'
  const getApiStatus = (): 'online' | 'offline' | 'degraded' => {
    if (!health?.status) return 'offline'
    if (health.status === 'ok') return 'online'
    if (health.status === 'degraded') return 'degraded'
    return 'offline'
  }
  const getGatewayStatus = (): 'online' | 'offline' | 'degraded' => health?.gateway_active ? 'online' : 'offline'

  const getPageTitle = () => {
    const item = [...mainNavItems, ...moduleNavItems].find((i) => i.key === location.pathname)
    return item?.label || 'Vulcan'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: collapsed ? 64 : 260, minWidth: collapsed ? 64 : 260, height: '100vh', background: colors.surface, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', overflow: 'hidden', position: 'relative' }}>
        <Logo collapsed={collapsed} />

        {/* Collapse toggle */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', top: 20, right: -12, width: 24, height: 24,
            borderRadius: '50%', background: colors.card, border: `1px solid ${colors.cardBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, transition: 'transform 0.2s ease',
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {collapsed
            ? <MenuUnfoldOutlined style={{ fontSize: 12, color: colors.textSecondary }} />
            : <MenuFoldOutlined style={{ fontSize: 12, color: colors.textSecondary }} />}
        </div>

        {/* Main Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
          <div style={{ marginBottom: 8 }}>
            {!collapsed && <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 24px', display: 'block' }}>导航</Text>}
            {mainNavItems.map((item) => (
              <NavItem key={item.key} item={item} collapsed={collapsed} selected={location.pathname === item.key} onClick={() => navigate(item.key)} />
            ))}
          </div>

          <div style={{ height: 1, background: colors.border, margin: '12px 16px' }} />

          <div>
            {!collapsed && <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 24px', display: 'block' }}>模块</Text>}
            {moduleNavItems.map((item) => (
              <NavItem key={item.key} item={item} collapsed={collapsed} selected={location.pathname === item.key} onClick={() => navigate(item.key)} />
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: collapsed ? '12px 8px' : '16px 20px', background: colors.surface }}>
          {!collapsed ? (
            <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>连接状态</Text>
              <StatusIndicator label="WebSocket" status={getWsStatus()} />
              <StatusIndicator label="API" status={getApiStatus()} />
              <StatusIndicator label="Gateway" status={getGatewayStatus()} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <StatusDot status={getWsStatus()} />
              <StatusDot status={getApiStatus()} />
              <StatusDot status={getGatewayStatus()} />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <HeaderBar breadcrumb={`Vulcan / ${getPageTitle()}`} />
        <Content style={{ flex: 1, overflow: 'auto', background: colors.background, padding: 24 }}>
          <Outlet />
        </Content>
      </div>
    </div>
  )
}
