import React from 'react'
import { Tag, Progress } from 'antd'
import {
  UserSwitchOutlined, ExperimentOutlined,
  CheckCircleOutlined, AimOutlined, BulbOutlined,
  SafetyOutlined, DashboardOutlined, BuildOutlined,
  BarChartOutlined, ClusterOutlined, NodeIndexOutlined,
  RiseOutlined, CrownOutlined, StarOutlined
} from '@ant-design/icons'
import type { DomainInfo } from './types'

// ─── Constants ───────────────────────────────────────────────────────────────

export const DOMAINS: Record<string, Omit<DomainInfo, 'domain'>> = {
  '科研': { name: '科研 Science', count: 10, avg_success_rate: 0.92, icon: <ExperimentOutlined />, color: '#8b5cf6' },
  '技术': { name: '技术 Engineering', count: 15, avg_success_rate: 0.93, icon: <BuildOutlined />, color: '#3b82f6' },
  '数据': { name: '数据 Data', count: 10, avg_success_rate: 0.91, icon: <BarChartOutlined />, color: '#10b981' },
  '商业': { name: '商业 Business', count: 10, avg_success_rate: 0.90, icon: <RiseOutlined />, color: '#f59e0b' },
  '内容': { name: '内容 Content', count: 10, avg_success_rate: 0.89, icon: <BulbOutlined />, color: '#ec4899' },
  '分析': { name: '分析 Analysis', count: 10, avg_success_rate: 0.92, icon: <AimOutlined />, color: '#06b6d4' },
  '安全': { name: '安全 Security', count: 8, avg_success_rate: 0.92, icon: <SafetyOutlined />, color: '#ef4444' },
  '运营': { name: '运营 DevOps', count: 10, avg_success_rate: 0.92, icon: <NodeIndexOutlined />, color: '#84cc16' },
  '产品': { name: '产品 Product', count: 9, avg_success_rate: 0.90, icon: <DashboardOutlined />, color: '#f97316' },
  '数学': { name: '数学 Math', count: 8, avg_success_rate: 0.94, icon: <ClusterOutlined />, color: '#a855f7' },
}

export const TIER_COLORS: Record<string, string> = {
  elite: '#fbbf24',
  expert: '#a855f7',
  proficient: '#3b82f6',
  associate: '#6b7280'
}

export const TIER_ICONS: Record<string, React.ReactNode> = {
  elite: <CrownOutlined />,
  expert: <StarOutlined />,
  proficient: <CheckCircleOutlined />,
  associate: <UserSwitchOutlined />
}

export const STRATEGY_COLORS: Record<string, string> = {
  single_expert: '#6b7280',
  parallel_experts: '#10b981',
  sequential_chain: '#3b82f6',
  hierarchical: '#f59e0b'
}

export const COMPLEXITY_COLORS: Record<string, string> = {
  simple: '#10b981',
  moderate: '#f59e0b',
  complex: '#f97316',
  very_complex: '#ef4444'
}

// ─── Helper Components ────────────────────────────────────────────────────────

export const TierTag = ({ tier }: { tier: string }) => (
  <Tag color={TIER_COLORS[tier] || '#6b7280'} icon={TIER_ICONS[tier]}>
    {tier.charAt(0).toUpperCase() + tier.slice(1)}
  </Tag>
)

export const ScoreBar = ({ score }: { score: number }) => (
  <Progress
    percent={Math.round(score * 100)}
    size="small"
    strokeColor={score > 0.8 ? '#10b981' : score > 0.6 ? '#f59e0b' : '#ef4444'}
    showInfo={false}
    style={{ width: 80 }}
  />
)
