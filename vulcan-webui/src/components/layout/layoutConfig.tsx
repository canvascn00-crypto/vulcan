// ─── Color Palette ──────────────────────────────────────────────────────────

export const colors = {
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

// ─── Navigation Config ──────────────────────────────────────────────────────

import {
  DashboardOutlined, RobotOutlined, ApiOutlined, ToolOutlined,
  DatabaseOutlined, TeamOutlined, ApartmentOutlined, MacCommandOutlined,
  SettingOutlined, ExperimentOutlined, EyeOutlined, AudioOutlined,
  SafetyOutlined, RocketOutlined,
} from '@ant-design/icons'

export interface NavItemConfig {
  key: string
  icon: React.ReactNode
  label: string
}

export const mainNavItems: NavItemConfig[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '监控台' },
  { key: '/chat', icon: <RobotOutlined />, label: '对话' },
  { key: '/agents', icon: <TeamOutlined />, label: '多Agent' },
  { key: '/workflow', icon: <RocketOutlined />, label: '工作流' },
  { key: '/skills', icon: <ToolOutlined />, label: '技能市场' },
  { key: '/memory', icon: <DatabaseOutlined />, label: '记忆中心' },
  { key: '/expert', icon: <ApartmentOutlined />, label: '专家工作台' },
  { key: '/commands', icon: <MacCommandOutlined />, label: '全局指令' },
  { key: '/models', icon: <ApiOutlined />, label: '模型' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export const moduleNavItems: NavItemConfig[] = [
  { key: '/observability', icon: <EyeOutlined />, label: '可观测性' },
  { key: '/evolver', icon: <ExperimentOutlined />, label: '自进化' },
  { key: '/multimodal', icon: <AudioOutlined />, label: '多模态' },
  { key: '/shield', icon: <SafetyOutlined />, label: '安全' },
  { key: '/devtools', icon: <ToolOutlined />, label: 'DevTools' },
  { key: '/optimizer', icon: <ApiOutlined />, label: '优化器' },
]
