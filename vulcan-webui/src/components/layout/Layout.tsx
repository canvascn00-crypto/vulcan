import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Typography, Badge, Space, Tag, Spin, Tabs } from 'antd'
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
  FireOutlined,
  ToolOutlined as DevtoolsOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { api, HealthResponse } from '@/services/api'

const { Content } = AntLayout
const { Title } = Typography

const menuItems = [
  { key: '/', icon: <FireOutlined />, label: 'Vulcan' },
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

const moduleItems = [
  { key: '/observability', icon: <EyeOutlined />, label: '可观测性' },
  { key: '/evolver', icon: <ExperimentOutlined />, label: '自进化' },
  { key: '/multimodal', icon: <AudioOutlined />, label: '多模态' },
  { key: '/shield', icon: <SafetyOutlined />, label: '安全' },
  { key: '/devtools', icon: <DevtoolsOutlined />, label: 'DevTools' },
  { key: '/optimizer', icon: <ApiOutlined />, label: '优化器' },
]

export default function Layout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.health().then(r => { setHealth(r); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const status = health?.status
  const statusColor = status === 'ok' ? '#52c41a' : status === 'degraded' ? '#faad14' : '#ff4d4f'
  const wsConnected = health?.ws_connected

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <AntLayout style={{ minWidth: 0, flex: 1 }}>
        <AntLayout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}
          style={{ background: '#141414', borderRight: '1px solid #303030', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: collapsed ? '12px 8px' : '16px', textAlign: 'center', borderBottom: '1px solid #303030' }}>
            <RobotOutlined style={{ fontSize: 24, color: '#ff6b35' }} />
            {!collapsed && <Title level={4} style={{ color: '#fff', margin: '8px 0 0', fontSize: 16 }}>Vulcan</Title>}
          </div>
          <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems}
            style={{ flex: 1, borderRight: 0, background: 'transparent' }} />
          {!collapsed && (
            <div style={{ borderTop: '1px solid #303030', padding: '12px 16px' }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge status={wsConnected ? 'success' : 'error'} />
                  <span style={{ color: '#888', fontSize: 11 }}>WS {wsConnected ? '在线' : '离线'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                  <span style={{ color: '#888', fontSize: 11 }}>API {status || '未知'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={health?.gateway_active ? 'green' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                    {health?.gateway_active ? 'Gateway' : 'No Gateway'}
                  </Tag>
                </div>
              </Space>
              <div style={{ marginTop: 12, borderTop: '1px solid #303030', paddingTop: 12 }}>
                <div style={{ color: '#666', fontSize: 10, marginBottom: 8 }}>模块</div>
                <Tabs size="small" tabPosition="bottom" items={moduleItems.map(i => ({
                  key: i.key, label: <span style={{ fontSize: 11 }}>{i.icon} {!collapsed && i.label}</span>
                }))} />
              </div>
            </div>
          )}
        </AntLayout.Sider>
        <AntLayout>
          <AntLayout.Header style={{ background: '#1f1f1f', borderBottom: '1px solid #303030', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>Vulcan Agent Platform</Title>
            <Space>
              <Badge status={wsConnected ? 'success' : 'error'} text={<span style={{ color: '#aaa', fontSize: 12 }}>WebSocket {wsConnected ? '在线' : '离线'}</span>} />
              {loading ? <Spin size="small" /> : (
                <Tag color={status === 'ok' ? 'green' : status === 'degraded' ? 'orange' : 'red'}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>
              )}
            </Space>
          </AntLayout.Header>
          <Content style={{ overflow: 'auto', background: '#000' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </AntLayout>
    </div>
  )
}
