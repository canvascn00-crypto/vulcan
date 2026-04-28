import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, Table, Badge,
  Statistic, Modal, Form, Input, Select, message, Spin,
  Timeline, Divider, Popconfirm, Empty, Avatar, Dropdown, Progress,
  Tooltip, Switch, Divider as AntDivider
} from 'antd'
import {
  TeamOutlined, SwapOutlined, ApiOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SendOutlined, ReloadOutlined, DeleteOutlined,
  ExclamationCircleOutlined, RocketOutlined, ThunderboltOutlined,
  StopOutlined, PlayCircleOutlined, SyncOutlined, SettingOutlined, FileTextOutlined,
  GlobalOutlined, MessageOutlined, RobotOutlined, PlusOutlined,
  DownOutlined, CaretRightOutlined,
  AppstoreOutlined, HistoryOutlined, EyeOutlined, EditOutlined,
  PoweroffOutlined, InfoCircleOutlined,
  BellOutlined, BugOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text, Paragraph } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentInfo {
  id: string
  name: string
  version: string
  status: 'idle' | 'busy' | 'streaming' | 'offline'
  role: string
  roleLabel: string
  capabilities: string[]
  tools: string[]
  description: string
  endpoint?: string
  tags: string[]
  maxConcurrentTasks: number
  last_seen: string
  avatar?: string
  model: string
  channel: string
  currentTask?: string
  uptimeSeconds?: number
  tokenUsage?: { input: number; output: number }
  trustLevel: 'builtin' | 'trusted' | 'community'
}

interface PoolStats {
  total_agents: number
  idle: number
  busy: number
  streaming: number
  total_delegated_tasks: number
  active_delegated: number
  agents: AgentInfo[]
}

interface DelegatedTask {
  task_id: string
  thread_id: string
  goal: string
  proposer: string
  assignee: string
  status: 'proposed' | 'accepted' | 'rejected' | 'completed' | 'failed' | 'cancelled' | 'in_progress'
  priority: number
  created_at: string
  accepted_at?: string
  completed_at?: string
  result?: any
  error?: string
  progress_steps: { description: string; status: string }[]
}

type ActivityEventType = 'task_start' | 'task_complete' | 'error' | 'tool_call' | 'config_change' | 'message' | 'streaming'

interface ActivityEvent {
  id: string
  type: ActivityEventType
  description: string
  timestamp: string
  detail?: string
}

interface AgentRuntimeInfo {
  uptimeSeconds: number
  tokenUsage: { input: number; output: number }
  currentTask?: string
  memoryPercent?: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1-5-pro' },
  { label: 'Deepseek V2', value: 'deepseek-v2' },
]

const AVAILABLE_CHANNELS = [
  { label: '💬 微信 (WeChat)', value: 'wechat' },
  { label: '✈️ Telegram', value: 'telegram' },
  { label: '🎮 Discord', value: 'discord' },
  { label: '🌐 Web', value: 'web' },
  { label: '📱 Slack', value: 'slack' },
  { label: '📧 Email', value: 'email' },
]

const MOCK_AGENTS: AgentInfo[] = [
  {
    id: 'agent-001',
    name: 'Vulcan-Planner',
    version: '2.4.1',
    status: 'idle',
    role: 'planner',
    roleLabel: '规划者',
    capabilities: ['任务分解', '资源规划', '优先级排序', '依赖分析'],
    tools: ['TaskDecomposer', 'ResourceAllocator', 'DependencyGraph'],
    description: '负责任务拆解、规划和协调多 Agent 工作流，擅长将复杂目标分解为可执行的子任务。',
    tags: ['planner', 'orchestrator', 'builtin'],
    maxConcurrentTasks: 3,
    last_seen: new Date(Date.now() - 30000).toISOString(),
    model: 'claude-3-5-sonnet',
    channel: 'wechat',
    currentTask: undefined,
    uptimeSeconds: 86400,
    tokenUsage: { input: 1245000, output: 890000 },
    trustLevel: 'builtin',
  },
  {
    id: 'agent-002',
    name: 'CodeMaster',
    version: '3.1.0',
    status: 'busy',
    role: 'coder',
    roleLabel: '编码者',
    capabilities: ['代码生成', '代码审查', 'Bug修复', '单元测试', '重构'],
    tools: ['CodeGenerator', 'BugDetector', 'TestRunner', 'RefactorHelper'],
    description: '专业代码开发助手，熟练掌握多种编程语言和框架，提供高质量代码生成和审查服务。',
    tags: ['coder', 'developer', 'builtin'],
    maxConcurrentTasks: 5,
    last_seen: new Date(Date.now() - 5000).toISOString(),
    model: 'claude-3-opus',
    channel: 'telegram',
    currentTask: '实现用户认证模块 - RESTful API 设计',
    uptimeSeconds: 43200,
    tokenUsage: { input: 3450000, output: 2100000 },
    trustLevel: 'builtin',
  },
  {
    id: 'agent-003',
    name: 'ResearchBot',
    version: '1.8.2',
    status: 'streaming',
    role: 'researcher',
    roleLabel: '研究者',
    capabilities: ['信息检索', '文献分析', '数据可视化', '报告生成'],
    tools: ['WebSearch', 'PDFReader', 'DataVisualizer', 'ReportGenerator'],
    description: '智能研究助手，帮助用户快速检索和分析海量信息，生成结构化的研究报告。',
    tags: ['researcher', 'analyst', 'builtin'],
    maxConcurrentTasks: 4,
    last_seen: new Date(Date.now() - 2000).toISOString(),
    model: 'gpt-4o',
    channel: 'discord',
    currentTask: '分析 2024年AI领域最新进展报告',
    uptimeSeconds: 72000,
    tokenUsage: { input: 890000, output: 560000 },
    trustLevel: 'builtin',
  },
  {
    id: 'agent-004',
    name: 'DataAnalyzer',
    version: '2.0.5',
    status: 'idle',
    role: 'analyst',
    roleLabel: '分析师',
    capabilities: ['数据分析', '图表制作', '趋势预测', '异常检测'],
    tools: ['DataProcessor', 'ChartMaker', 'TrendPredictor', 'AnomalyDetector'],
    description: '数据分析和可视化专家，能够处理结构化和非结构化数据，提供深入的洞察和预测。',
    tags: ['analyst', 'data', 'builtin'],
    maxConcurrentTasks: 3,
    last_seen: new Date(Date.now() - 120000).toISOString(),
    model: 'gemini-1-5-pro',
    channel: 'web',
    currentTask: undefined,
    uptimeSeconds: 55000,
    tokenUsage: { input: 670000, output: 430000 },
    trustLevel: 'builtin',
  },
  {
    id: 'agent-005',
    name: 'CommunityAgent-X',
    version: '0.9.1-beta',
    status: 'offline',
    role: 'helper',
    roleLabel: '助手',
    capabilities: ['翻译', '写作助手', '问答系统'],
    tools: ['Translator', 'WritingAssistant', 'QASystem'],
    description: '社区贡献的多功能助手，提供翻译和写作支持，由社区维护和更新。',
    tags: ['helper', 'community'],
    maxConcurrentTasks: 2,
    last_seen: new Date(Date.now() - 3600000).toISOString(),
    model: 'deepseek-v2',
    channel: 'slack',
    currentTask: undefined,
    uptimeSeconds: 0,
    tokenUsage: { input: 0, output: 0 },
    trustLevel: 'community',
  },
]

const MOCK_ACTIVITIES: Record<string, ActivityEvent[]> = {
  'agent-001': [
    { id: 'a1', type: 'task_complete', description: '完成子任务分解', timestamp: new Date(Date.now() - 60000).toISOString(), detail: '分解为 5 个子任务' },
    { id: 'a2', type: 'tool_call', description: '调用 ResourceAllocator', timestamp: new Date(Date.now() - 120000).toISOString(), detail: '分配 3 个计算资源' },
    { id: 'a3', type: 'config_change', description: '更新并发限制', timestamp: new Date(Date.now() - 300000).toISOString(), detail: 'maxConcurrentTasks: 3 → 5' },
    { id: 'a4', type: 'message', description: '接收任务委托', timestamp: new Date(Date.now() - 600000).toISOString(), detail: '来自 Vulcan-Planner' },
  ],
  'agent-002': [
    { id: 'b1', type: 'task_start', description: '开始实现用户认证', timestamp: new Date(Date.now() - 30000).toISOString(), detail: 'RESTful API 设计' },
    { id: 'b2', type: 'tool_call', description: '调用 CodeGenerator', timestamp: new Date(Date.now() - 60000).toISOString(), detail: '生成 AuthController.cs' },
    { id: 'b3', type: 'error', description: 'lint 检查发现问题', timestamp: new Date(Date.now() - 90000).toISOString(), detail: 'CS0168: 未使用的变量' },
    { id: 'b4', type: 'task_complete', description: '完成 API 路由配置', timestamp: new Date(Date.now() - 180000).toISOString(), detail: '5 条路由规则' },
  ],
  'agent-003': [
    { id: 'c1', type: 'streaming', description: '流式输出分析结果', timestamp: new Date(Date.now() - 5000).toISOString(), detail: '已输出 234/1024 tokens' },
    { id: 'c2', type: 'tool_call', description: '调用 WebSearch', timestamp: new Date(Date.now() - 30000).toISOString(), detail: '检索 15 篇相关论文' },
    { id: 'c3', type: 'task_start', description: '开始生成报告', timestamp: new Date(Date.now() - 60000).toISOString(), detail: '预计 5 个章节' },
    { id: 'c4', type: 'message', description: '接收研究任务', timestamp: new Date(Date.now() - 120000).toISOString(), detail: '来自 Vulcan-Planner' },
  ],
  'agent-004': [
    { id: 'd1', type: 'task_complete', description: '完成销售数据报表', timestamp: new Date(Date.now() - 180000).toISOString(), detail: 'Q4 2024 季度报告' },
    { id: 'd2', type: 'tool_call', description: '调用 ChartMaker', timestamp: new Date(Date.now() - 240000).toISOString(), detail: '生成 8 张图表' },
    { id: 'd3', type: 'message', description: '报告已发送至邮件列表', timestamp: new Date(Date.now() - 300000).toISOString(), detail: '收件人: 12人' },
  ],
  'agent-005': [
    { id: 'e1', type: 'message', description: 'Agent 已离线', timestamp: new Date(Date.now() - 3600000).toISOString(), detail: '最后活跃: 1小时前' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  idle: '#52c41a',
  busy: '#f59e0b',
  streaming: '#3b82f6',
  offline: '#6b7280',
  proposed: '#6b7280',
  accepted: '#3b82f6',
  rejected: '#ef4444',
  completed: '#52c41a',
  failed: '#ef4444',
  cancelled: '#f59e0b',
}

const STATUS_LABEL: Record<string, string> = {
  idle: '空闲',
  busy: '忙碌',
  streaming: '流式输出',
  offline: '离线',
}

const PRIORITY_LABEL: Record<number, string> = {
  0: '低',
  1: '普通',
  2: '高',
  3: '紧急',
}

const PRIORITY_COLOR: Record<number, string> = {
  0: 'default',
  1: 'blue',
  2: 'orange',
  3: 'red',
}

const TRUST_COLOR: Record<string, string> = {
  builtin: '#3b82f6',
  trusted: '#52c41a',
  community: '#f59e0b',
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  planner: <AppstoreOutlined />,
  coder: <BugOutlined />,
  researcher: <FileTextOutlined />,
  analyst: <ThunderboltOutlined />,
  helper: <RobotOutlined />,
}

function formatUptime(seconds: number): string {
  if (seconds === 0) return '离线'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时 ${m}分`
  if (m > 0) return `${m}分 ${s}秒`
  return `${s}秒`
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}秒前`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'task_start': return <CaretRightOutlined style={{ color: '#3b82f6' }} />
    case 'task_complete': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    case 'error': return <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
    case 'tool_call': return <ApiOutlined style={{ color: '#a78bfa' }} />
    case 'config_change': return <SettingOutlined style={{ color: '#f59e0b' }} />
    case 'message': return <MessageOutlined style={{ color: '#6b7280' }} />
    case 'streaming': return <ThunderboltOutlined style={{ color: '#3b82f6' }} />
    default: return <InfoCircleOutlined style={{ color: '#6b7280' }} />
  }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: STATUS_COLORS[status] || '#6b7280',
      boxShadow: status !== 'offline' ? `0 0 6px ${STATUS_COLORS[status]}60` : 'none',
      marginRight: 6,
    }} />
  )
}

function AgentCard({
  agent,
  selected,
  onSelect,
  onModelChange,
  onChannelChange,
}: {
  agent: AgentInfo
  selected: boolean
  onSelect: () => void
  onModelChange: (agentId: string, model: string) => void
  onChannelChange: (agentId: string, channel: string) => void
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? '#27272A' : '#18181B',
        border: `1px solid ${selected ? '#7065F3' : '#2C2C31'}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#1f1f23'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#18181B'
      }}
    >
      {/* Selection indicator */}
      {selected && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: '#7065F3',
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar
          size={36}
          style={{
            background: agent.status === 'offline' ? '#374151' : `${STATUS_COLORS[agent.status]}20`,
            border: `1px solid ${agent.status === 'offline' ? '#4b5563' : STATUS_COLORS[agent.status]}40`,
            color: agent.status === 'offline' ? '#9ca3af' : STATUS_COLORS[agent.status],
            fontSize: 16,
          }}
          icon={ROLE_ICON[agent.role] || <RobotOutlined />}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ color: '#FAFAFA', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {agent.name}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Tag
              style={{
                fontSize: 10,
                padding: '0 4px',
                margin: 0,
                background: `${TRUST_COLOR[agent.trustLevel]}15`,
                border: `1px solid ${TRUST_COLOR[agent.trustLevel]}30`,
                color: TRUST_COLOR[agent.trustLevel],
              }}
            >
              {agent.roleLabel}
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StatusDot status={agent.status} />
              <Text style={{ color: '#A1A1AA', fontSize: 11 }}>{STATUS_LABEL[agent.status]}</Text>
            </div>
          </div>
        </div>
        <Text style={{ color: '#4B5563', fontSize: 10 }}>v{agent.version}</Text>
      </div>

      {/* Current task */}
      {agent.currentTask ? (
        <div style={{
          background: '#0D0D0F',
          borderRadius: 6,
          padding: '6px 8px',
          marginBottom: 10,
        }}>
          <Text style={{ color: '#6B7280', fontSize: 10 }}>当前任务</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <CaretRightOutlined style={{ color: '#7065F3', fontSize: 10 }} />
            <Text style={{ color: '#D1D5DB', fontSize: 11 }} ellipsis>{agent.currentTask}</Text>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#0D0D0F',
          borderRadius: 6,
          padding: '6px 8px',
          marginBottom: 10,
          border: '1px dashed #2C2C31',
        }}>
          <Text style={{ color: '#4B5563', fontSize: 11 }}>暂无执行任务</Text>
        </div>
      )}

      {/* Model selector */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>
          🤖 模型
        </Text>
        <Select
          size="small"
          value={agent.model}
          options={AVAILABLE_MODELS}
          onChange={val => onModelChange(agent.id, val)}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%' }}
          popupMatchSelectWidth={false}
          dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
        />
      </div>

      {/* Channel selector */}
      <div>
        <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>
          💬 渠道
        </Text>
        <Select
          size="small"
          value={agent.channel}
          options={AVAILABLE_CHANNELS}
          onChange={val => onChannelChange(agent.id, val)}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%' }}
          popupMatchSelectWidth={false}
          dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
        />
      </div>
    </div>
  )
}

function AgentDetailPanel({
  agent,
  activities,
  onStart,
  onStop,
  onConfigure,
  onViewLogs,
  onModelChange,
  onChannelChange,
}: {
  agent: AgentInfo
  activities: ActivityEvent[]
  onStart: () => void
  onStop: () => void
  onConfigure: () => void
  onViewLogs: () => void
  onModelChange: (model: string) => void
  onChannelChange: (channel: string) => void
}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Agent Header Card */}
      <Card
        style={{
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Avatar
            size={56}
            style={{
              background: agent.status === 'offline' ? '#374151' : `${STATUS_COLORS[agent.status]}15`,
              border: `2px solid ${agent.status === 'offline' ? '#4b5563' : STATUS_COLORS[agent.status]}40`,
              color: agent.status === 'offline' ? '#9ca3af' : STATUS_COLORS[agent.status],
              fontSize: 24,
            }}
            icon={ROLE_ICON[agent.role] || <RobotOutlined />}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: '#FAFAFA' }}>{agent.name}</Title>
              <Tag
                style={{
                  fontSize: 11,
                  background: `${TRUST_COLOR[agent.trustLevel]}15`,
                  border: `1px solid ${TRUST_COLOR[agent.trustLevel]}30`,
                  color: TRUST_COLOR[agent.trustLevel],
                }}
              >
                {agent.trustLevel === 'builtin' ? '内置' : agent.trustLevel === 'trusted' ? '可信' : '社区'}
              </Tag>
              <Tag style={{ fontSize: 11, background: '#2C2C31', border: '1px solid #3C3C41', color: '#A1A1AA' }}>
                v{agent.version}
              </Tag>
            </div>
            <Paragraph style={{ color: '#A1A1AA', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {agent.description}
            </Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Text style={{ color: '#6B7280', fontSize: 11 }}>
                最后活跃: {formatTimeAgo(agent.last_seen)}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 11 }}>
                · 同时任务: {agent.maxConcurrentTasks}
              </Text>
            </div>
          </div>
        </div>

        {/* Status badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#0D0D0F',
            border: '1px solid #2C2C31',
            borderRadius: 6,
            padding: '4px 10px',
          }}>
            <StatusDot status={agent.status} />
            <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{STATUS_LABEL[agent.status]}</Text>
          </div>

          {agent.currentTask && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0D0D0F',
              border: '1px solid #2C2C31',
              borderRadius: 6,
              padding: '4px 10px',
              maxWidth: 280,
            }}>
              <CaretRightOutlined style={{ color: '#7065F3', fontSize: 10 }} />
              <Text style={{ color: '#D1D5DB', fontSize: 12 }} ellipsis>{agent.currentTask}</Text>
            </div>
          )}

          {agent.uptimeSeconds !== undefined && agent.uptimeSeconds > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0D0D0F',
              border: '1px solid #2C2C31',
              borderRadius: 6,
              padding: '4px 10px',
            }}>
              <ClockCircleOutlined style={{ color: '#6B7280', fontSize: 11 }} />
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>运行时长: {formatUptime(agent.uptimeSeconds)}</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Real-time Status + Selectors Row */}
      <Card
        style={{
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>⚡ 实时状态与配置</Text>
        </div>

        <Row gutter={[12, 12]}>
          {/* Status grid */}
          <Col span={24}>
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>状态</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={agent.status} />
                    <Text style={{ color: STATUS_COLORS[agent.status], fontSize: 13, fontWeight: 600 }}>{STATUS_LABEL[agent.status]}</Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>当前任务</Text>
                  <Text style={{ color: agent.currentTask ? '#D1D5DB' : '#4B5563', fontSize: 12 }} ellipsis>
                    {agent.currentTask || '无'}
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>运行时长</Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatUptime(agent.uptimeSeconds || 0)}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>Token 输入</Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatTokens(agent.tokenUsage?.input || 0)}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>Token 输出</Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatTokens(agent.tokenUsage?.output || 0)}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>并发上限</Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{agent.maxConcurrentTasks} 任务</Text>
                </div>
              </Col>
            </Row>
          </Col>

          {/* Model and Channel selectors */}
          <Col span={12}>
            <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>🤖 使用模型</Text>
            <Select
              value={agent.model}
              options={AVAILABLE_MODELS}
              onChange={onModelChange}
              style={{ width: '100%' }}
              dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
            />
          </Col>
          <Col span={12}>
            <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>💬 消息渠道</Text>
            <Select
              value={agent.channel}
              options={AVAILABLE_CHANNELS}
              onChange={onChannelChange}
              style={{ width: '100%' }}
              dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Capabilities & Tools */}
      <Card
        style={{
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Text strong style={{ color: '#FAFAFA', fontSize: 13, display: 'block', marginBottom: 12 }}>
          🛠 能力与工具
        </Text>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>能力 (Capabilities)</Text>
          <Space wrap size={[6, 6]}>
            {agent.capabilities.map(cap => (
              <Tag
                key={cap}
                style={{
                  background: '#7065F315',
                  border: '1px solid #7065F330',
                  color: '#A78BFA',
                  fontSize: 11,
                }}
              >
                {cap}
              </Tag>
            ))}
          </Space>
        </div>
        <div>
          <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>工具 (Tools)</Text>
          <Space wrap size={[6, 6]}>
            {agent.tools.map(tool => (
              <Tag
                key={tool}
                style={{
                  background: '#0D0D0F',
                  border: '1px solid #2C2C31',
                  color: '#9CA3AF',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
                {tool}
              </Tag>
            ))}
          </Space>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card
        style={{
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
          flex: 1,
          minHeight: 0,
        }}
        bodyStyle={{ padding: 16, overflowY: 'auto', maxHeight: 280 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>📋 活动记录</Text>
          <Button size="small" icon={<HistoryOutlined />} style={{ fontSize: 11 }}>
            全部记录
          </Button>
        </div>
        <Timeline
          items={activities.map(evt => ({
            dot: getActivityIcon(evt.type),
            children: (
              <div>
                <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{evt.description}</Text>
                {evt.detail && (
                  <Text style={{ color: '#6B7280', fontSize: 11, display: 'block' }}>{evt.detail}</Text>
                )}
                <Text style={{ color: '#4B5563', fontSize: 10, display: 'block', marginTop: 2 }}>
                  {formatTimeAgo(evt.timestamp)}
                </Text>
              </div>
            ),
          }))}
        />
      </Card>

      {/* Action Buttons */}
      <Card
        style={{
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 14 }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            type={agent.status === 'offline' || agent.status === 'idle' ? 'primary' : 'default'}
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            disabled={agent.status === 'busy' || agent.status === 'streaming'}
            style={{
              flex: 1,
              background: agent.status === 'offline' || agent.status === 'idle' ? '#7065F3' : undefined,
              border: agent.status === 'offline' || agent.status === 'idle' ? '#7065F3' : undefined,
            }}
          >
            启动
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={onStop}
            disabled={agent.status === 'offline' || agent.status === 'idle'}
            style={{ flex: 1 }}
          >
            停止
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={onConfigure}
            style={{ flex: 1 }}
          >
            配置
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={onViewLogs}
            style={{ flex: 1 }}
          >
            日志
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MultiAgentPage() {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null)
  const [delegatedTasks, setDelegatedTasks] = useState<DelegatedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [delegating, setDelegating] = useState(false)
  const [delegateModalOpen, setDelegateModalOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [agentList, setAgentList] = useState<AgentInfo[]>(MOCK_AGENTS)
  const [activities, setActivities] = useState<Record<string, ActivityEvent[]>>(MOCK_ACTIVITIES)

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, tasksRes] = await Promise.all([
        api.get<PoolStats>('/api/a2a/status'),
        api.get<{ tasks: DelegatedTask[] }>('/api/a2a/tasks/delegated'),
      ])
      setPoolStats(statusRes)
      setDelegatedTasks(tasksRes.tasks || [])
    } catch (e: any) {
      // Use mock data when API is not available
      setPoolStats({
        total_agents: MOCK_AGENTS.length,
        idle: MOCK_AGENTS.filter(a => a.status === 'idle').length,
        busy: MOCK_AGENTS.filter(a => a.status === 'busy').length,
        streaming: MOCK_AGENTS.filter(a => a.status === 'streaming').length,
        total_delegated_tasks: 12,
        active_delegated: 3,
        agents: MOCK_AGENTS,
      })
      setDelegatedTasks([
        {
          task_id: 'task-001',
          thread_id: 'thread-001',
          goal: '分析竞品市场策略并生成报告',
          proposer: 'vulcan-primary',
          assignee: 'ResearchBot',
          status: 'in_progress',
          priority: 2,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          progress_steps: [],
        },
        {
          task_id: 'task-002',
          thread_id: 'thread-002',
          goal: '优化数据库查询性能',
          proposer: 'vulcan-primary',
          assignee: 'CodeMaster',
          status: 'proposed',
          priority: 1,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          progress_steps: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Agent Actions ──────────────────────────────────────────────────────────

  const handleModelChange = (agentId: string, model: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, model } : a))
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      type: 'config_change',
      description: `模型切换为 ${AVAILABLE_MODELS.find(m => m.value === model)?.label || model}`,
      timestamp: new Date().toISOString(),
    }
    setActivities(prev => ({
      ...prev,
      [agentId]: [newActivity, ...(prev[agentId] || [])].slice(0, 20),
    }))
  }

  const handleChannelChange = (agentId: string, channel: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, channel } : a))
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      type: 'config_change',
      description: `渠道切换为 ${AVAILABLE_CHANNELS.find(c => c.value === channel)?.label || channel}`,
      timestamp: new Date().toISOString(),
    }
    setActivities(prev => ({
      ...prev,
      [agentId]: [newActivity, ...(prev[agentId] || [])].slice(0, 20),
    }))
  }

  const handleAgentStart = (agentId: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, status: 'idle' as const } : a))
    message.success('Agent 已启动')
  }

  const handleAgentStop = (agentId: string) => {
    setAgentList(prev => prev.map(a => a.id === agentId ? { ...a, status: 'offline' as const, currentTask: undefined } : a))
    message.info('Agent 已停止')
  }

  const handleAgentConfigure = (agentId: string) => {
    message.info('配置面板开发中...')
  }

  const handleAgentViewLogs = (agentId: string) => {
    message.info('日志查看器开发中...')
  }

  // ── Delegate task ───────────────────────────────────────────────────────────

  const handleDelegate = async (values: any) => {
    setDelegating(true)
    try {
      const res = await api.post<any>('/api/a2a/tasks/delegate', {
        goal: values.goal,
        assignee: values.assignee || undefined,
        role: values.role || undefined,
        priority: values.priority || 1,
        description: values.description,
        tools: values.tools || [],
        timeout_seconds: values.timeout_seconds,
        proposer: 'vulcan-primary',
        thread_id: `thread-${Date.now()}`,
      })
      message.success(`任务已委托: ${res.task_id}`)
      setDelegateModalOpen(false)
      form.resetFields()
      loadAll()
    } catch (e: any) {
      // Demo mode
      message.success('任务已委托 (Demo模式)')
      setDelegateModalOpen(false)
      form.resetFields()
    } finally {
      setDelegating(false)
    }
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.post(`/api/a2a/tasks/delegated/${taskId}/complete`, {
        error: 'Cancelled by orchestrator',
      })
    } catch (e: any) {
      // Demo mode
    }
    message.success('任务已取消')
    loadAll()
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedAgent = agentList.find(a => a.id === selectedAgentId) || null
  const idleCount = agentList.filter(a => a.status === 'idle').length
  const busyCount = agentList.filter(a => a.status === 'busy' || a.status === 'streaming').length
  const offlineCount = agentList.filter(a => a.status === 'offline').length

  // ── Table columns ──────────────────────────────────────────────────────────

  const taskColumns = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 180,
      render: (id: string) => (
        <Text copyable={{ text: id }} style={{ fontFamily: 'monospace', fontSize: 11, color: '#A1A1AA' }}>
          {id}
        </Text>
      ),
    },
    {
      title: '目标',
      dataIndex: 'goal',
      key: 'goal',
      ellipsis: true,
      render: (goal: string) => <Text style={{ maxWidth: 200, color: '#D1D5DB' }} ellipsis={{ tooltip: goal }}>{goal}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={s} />
          <Text style={{ color: STATUS_COLORS[s] || '#6B7280', fontSize: 12 }}>
            {s === 'in_progress' ? '进行中' : s}
          </Text>
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: number) => <Tag color={PRIORITY_COLOR[p] || 'default'} style={{ fontSize: 11 }}>{PRIORITY_LABEL[p] || '普通'}</Tag>,
    },
    {
      title: '委托人',
      dataIndex: 'proposer',
      key: 'proposer',
      width: 120,
      render: (n: string) => <Tag style={{ fontSize: 11, background: '#2C2C31', border: '1px solid #3C3C41', color: '#A1A1AA' }}>{n}</Tag>,
    },
    {
      title: '执行人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      render: (n: string) => n ? (
        <Tag color="purple" style={{ fontSize: 11 }}>{n}</Tag>
      ) : (
        <Text style={{ color: '#6B7280', fontSize: 12 }}>待认领</Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (ts: string) => <Text style={{ color: '#6B7280', fontSize: 11 }}>{new Date(ts).toLocaleString('zh-CN')}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: DelegatedTask) => (
        record.status === 'proposed' || record.status === 'accepted' || record.status === 'in_progress' ? (
          <Popconfirm
            title="确认取消此任务？"
            onConfirm={() => handleCancelTask(record.task_id)}
            okText="取消任务"
            cancelText="保留"
          >
            <Button size="small" danger icon={<StopOutlined />} style={{ fontSize: 11 }}>
              取消
            </Button>
          </Popconfirm>
        ) : (
          <Text style={{ color: '#4B5563', fontSize: 11 }}>
            {record.status === 'completed' ? '✅ 完成' : record.status === 'failed' ? '❌ 失败' : record.status}
          </Text>
        )
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D0D0F',
        padding: 20,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #7065F3 0%, #A78BFA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TeamOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Title level={3} style={{ margin: 0, color: '#FAFAFA' }}>Multi-Agent 工作台</Title>
          </div>
          <Text style={{ color: '#6B7280', fontSize: 12, marginLeft: 42 }}>
            Agent-to-Agent 协作 · 任务委托 · 实时状态监控
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAll}
            style={{ background: '#18181B', border: '1px solid #2C2C31', color: '#A1A1AA' }}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setDelegateModalOpen(true)}
            style={{ background: '#7065F3', border: '#7065F3' }}
          >
            委托任务
          </Button>
        </Space>
      </div>

      {/* Pool Stats Row */}
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        {[
          { label: '注册 Agents', value: agentList.length, color: '#7065F3' },
          { label: '空闲', value: idleCount, color: '#52c41a' },
          { label: '忙碌/流式', value: busyCount, color: '#f59e0b' },
          { label: '离线', value: offlineCount, color: '#6b7280' },
          { label: '委托任务', value: poolStats?.total_delegated_tasks || 12, color: '#a78bfa' },
          { label: '进行中', value: poolStats?.active_delegated || 2, color: '#3b82f6' },
        ].map(stat => (
          <Col span={4} key={stat.label}>
            <Card
              size="small"
              style={{
                background: '#18181B',
                border: '1px solid #2C2C31',
                borderRadius: 10,
              }}
              bodyStyle={{ padding: '12px 14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div>
                  <Text style={{ color: '#6B7280', fontSize: 10, display: 'block' }}>{stat.label}</Text>
                  <Text style={{ color: stat.color, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: '#6B7280' }}>加载 Agent 状态中...</Text>
          </div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* Left Panel: Agent Pool */}
          <Col span={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamOutlined style={{ color: '#7065F3' }} />
                  <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>Agent 池</Text>
                  <Tag style={{
                    marginLeft: 4,
                    fontSize: 10,
                    background: '#7065F315',
                    border: '1px solid #7065F330',
                    color: '#A78BFA',
                  }}>
                    {agentList.length} 个
                  </Tag>
                </div>
              }
              extra={
                <Tooltip title="添加新 Agent">
                  <Button size="small" icon={<PlusOutlined />} style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#6B7280' }} />
                </Tooltip>
              }
              style={{
                background: '#18181B',
                border: '1px solid #2C2C31',
                borderRadius: 12,
              }}
              bodyStyle={{ padding: 12, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
            >
              {agentList.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(agent.id)}
                  onModelChange={handleModelChange}
                  onChannelChange={handleChannelChange}
                />
              ))}

              {agentList.length === 0 && (
                <Empty
                  description={<Text style={{ color: '#6B7280' }}>暂无 Agent</Text>}
                  style={{ padding: 32 }}
                />
              )}
            </Card>
          </Col>

          {/* Right Panel: Agent Detail */}
          <Col span={16}>
            {selectedAgent ? (
              <AgentDetailPanel
                agent={selectedAgent}
                activities={activities[selectedAgent.id] || []}
                onStart={() => handleAgentStart(selectedAgent.id)}
                onStop={() => handleAgentStop(selectedAgent.id)}
                onConfigure={() => handleAgentConfigure(selectedAgent.id)}
                onViewLogs={() => handleAgentViewLogs(selectedAgent.id)}
                onModelChange={model => handleModelChange(selectedAgent.id, model)}
                onChannelChange={channel => handleChannelChange(selectedAgent.id, channel)}
              />
            ) : (
              <Card
                style={{
                  background: '#18181B',
                  border: '1px solid #2C2C31',
                  borderRadius: 12,
                  minHeight: 500,
                }}
                bodyStyle={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: '#18181B',
                  border: '1px solid #2C2C31',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <TeamOutlined style={{ color: '#4B5563', fontSize: 28 }} />
                </div>
                <Title level={5} style={{ color: '#6B7280', margin: 0, marginBottom: 8 }}>
                  选择一个 Agent 查看详情
                </Title>
                <Text style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
                  点击左侧 Agent 卡片可查看实时状态、配置模型和渠道、浏览活动记录
                </Text>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* Delegated Tasks Table */}
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RocketOutlined style={{ color: '#7065F3' }} />
            <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>委托任务列表</Text>
            <Tag style={{
              fontSize: 10,
              background: '#7065F315',
              border: '1px solid #7065F330',
              color: '#A78BFA',
            }}>
              {delegatedTasks.length}
            </Tag>
          </div>
        }
        style={{
          marginTop: 16,
          background: '#18181B',
          border: '1px solid #2C2C31',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={delegatedTasks}
          columns={taskColumns}
          rowKey="task_id"
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          style={{ background: 'transparent' }}
          locale={{
            emptyText: (
              <Empty
                description={<Text style={{ color: '#6B7280' }}>暂无委托任务</Text>}
                style={{ padding: 32 }}
              />
            )
          }}
        />
      </Card>

      {/* Delegate Task Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #7065F3 0%, #A78BFA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <SendOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <Text strong style={{ color: '#FAFAFA' }}>委托任务到 A2A 网络</Text>
          </div>
        }
        open={delegateModalOpen}
        onCancel={() => { setDelegateModalOpen(false); form.resetFields() }}
        footer={null}
        width={560}
        styles={{
          mask: { background: 'rgba(0,0,0,0.6)' },
          content: { background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 },
          header: { background: '#18181B', borderBottom: '1px solid #2C2C31' },
          body: { padding: 20 },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleDelegate}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="goal"
            label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>任务目标</Text>}
            rules={[{ required: true, message: '请输入任务目标' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="用自然语言描述你要委托的任务目标..."
              style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#FAFAFA' }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="assignee" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>指定 Agent（可选）</Text>}>
                <Select
                  allowClear
                  placeholder="自动选择最佳 Agent"
                  options={agentList.map(a => ({
                    label: `${a.name} (${a.roleLabel}, ${STATUS_LABEL[a.status]})`,
                    value: a.name,
                  }))}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>指定角色（可选）</Text>}>
                <Select
                  allowClear
                  placeholder="任意可用 Agent"
                  options={[
                    { label: '📋 规划者 (planner)', value: 'planner' },
                    { label: '💻 编码者 (coder)', value: 'coder' },
                    { label: '🔍 研究者 (researcher)', value: 'researcher' },
                    { label: '📊 分析师 (analyst)', value: 'analyst' },
                  ]}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="priority" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>优先级</Text>} initialValue={1}>
                <Select
                  options={[
                    { label: '🟢 低', value: 0 },
                    { label: '🔵 普通', value: 1 },
                    { label: '🟠 高', value: 2 },
                    { label: '🔴 紧急', value: 3 },
                  ]}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeout_seconds" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>超时时间</Text>} initialValue={300}>
                <Select
                  options={[
                    { label: '1 分钟', value: 60 },
                    { label: '5 分钟', value: 300 },
                    { label: '15 分钟', value: 900 },
                    { label: '1 小时', value: 3600 },
                  ]}
                  dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<Text style={{ color: '#A1A1AA', fontSize: 12 }}>任务描述（可选）</Text>}>
            <Input
              placeholder="补充说明或约束条件..."
              style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#FAFAFA' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 8 }}>
            <Space>
              <Button
                onClick={() => { setDelegateModalOpen(false); form.resetFields() }}
                style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#A1A1AA' }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={delegating}
                style={{ background: '#7065F3', border: '#7065F3' }}
              >
                发送委托
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
