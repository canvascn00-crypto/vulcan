import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout as AntLayout, Menu, Typography, Badge } from 'antd'
import {
  RobotOutlined,
  DashboardOutlined,
  ApiOutlined,
  ToolOutlined,
  DatabaseOutlined,
  ModelOutlined,
  TeamOutlined,
  WechatOutlined,
  SettingOutlined,
  ExperimentOutlined,
  EyeOutlined,
  AudioOutlined,
  ShieldOutlined,
  ToolOutlined as DevtoolsOutlined,
  RocketOutlined,
  FireOutlined,
} from '@ant-design/icons'

const { Sider, Content } = AntLayout
const { Title } = Typography

const menuItems = [
  { key: 'chat', icon: <RobotOutlined />, label: '对话' },
  { key: 'dashboard', icon: <DashboardOutlined />, label: '监控' },
  { key: 'workflow', icon: <ApiOutlined />, label: '工作流' },
  { key: 'agents', icon: <TeamOutlined />, label: '多 Agent' },
  { key: 'skills', icon: <ToolOutlined />, label: '技能中心' },
  { key: 'memory', icon: <DatabaseOutlined />, label: '记忆库' },
  { key: 'models', icon: <ModelOutlined />, label: '模型管理' },
  { key: 'wechat', icon: <WechatOutlined />, label: '微信' },
  { key: 'observability', icon: <EyeOutlined />, label: '🔭 可观测性' },
  { key: 'evolver', icon: <ExperimentOutlined />, label: '🧬 自我进化' },
  { key: 'multimodal', icon: <AudioOutlined />, label: '🎤 多模态' },
  { key: 'shield', icon: <ShieldOutlined />, label: '🛡️ 安全' },
  { key: 'devtools', icon: <DevtoolsOutlined />, label: '🧪 DevTools' },
  { key: 'optimizer', icon: <RocketOutlined />, label: '📦 优化器' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        style={{ background: '#111827' }}
      >
        {/* Logo */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            gap: 10,
            borderBottom: '1px solid #1f2937',
          }}
        >
          <FireOutlined style={{ fontSize: 24, color: '#5a6ef5' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              Vulcan
            </Title>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['chat']}
          items={menuItems}
          style={{ background: 'transparent', marginTop: 8 }}
        />
      </Sider>

      <AntLayout>
        <Content style={{ margin: 0, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
