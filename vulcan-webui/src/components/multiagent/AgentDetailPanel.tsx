import { Card, Avatar, Tag, Row, Col, Button, Space, Select, Timeline } from 'antd'
import { Typography } from 'antd'
import {
  ClockCircleOutlined, PlayCircleOutlined, StopOutlined,
  SettingOutlined, FileTextOutlined, HistoryOutlined, CaretRightOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import {
  AgentInfo, ActivityEvent,
  AVAILABLE_MODELS, AVAILABLE_CHANNELS,
  STATUS_COLORS, STATUS_LABEL, TRUST_COLOR,
} from './types'
import { ROLE_ICON } from './constants'
import { StatusDot } from './AgentCard'

const { Title, Text, Paragraph } = Typography

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  const h = Math.floor(seconds / 3600)
  if (h < 24) return `${h}小时`
  return `${Math.floor(h / 24)}天`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1000000).toFixed(1)}M`
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

function getActivityIcon(type: ActivityEvent['type']) {
  const icons: Record<string, React.ReactNode> = {
    start: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
    stop: <StopOutlined style={{ color: '#ef4444' }} />,
    delegate: <HistoryOutlined style={{ color: '#7065f3' }} />,
    complete: <SettingOutlined style={{ color: '#3b82f6' }} />,
    error: <StopOutlined style={{ color: '#ef4444' }} />,
    config_change: <SettingOutlined style={{ color: '#f59e0b' }} />,
  }
  return icons[type] || <HistoryOutlined style={{ color: '#6b7280' }} />
}

interface AgentDetailPanelProps {
  agent: AgentInfo
  activities: ActivityEvent[]
  onStart: () => void
  onStop: () => void
  onConfigure: () => void
  onViewLogs: () => void
  onModelChange: (model: string) => void
  onChannelChange: (channel: string) => void
}

export default function AgentDetailPanel({
  agent, activities, onStart, onStop, onConfigure, onViewLogs,
  onModelChange, onChannelChange,
}: AgentDetailPanelProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Agent Header Card */}
      <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Avatar size={56} style={{
            background: agent.status === 'offline' ? '#374151' : `${STATUS_COLORS[agent.status]}15`,
            border: `2px solid ${agent.status === 'offline' ? '#4b5563' : STATUS_COLORS[agent.status]}40`,
            color: agent.status === 'offline' ? '#9ca3af' : STATUS_COLORS[agent.status],
            fontSize: 24,
          }} icon={ROLE_ICON[agent.role] || <RobotOutlined />} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: '#FAFAFA' }}>{agent.name}</Title>
              <Tag style={{
                fontSize: 11,
                background: `${TRUST_COLOR[agent.trustLevel]}15`,
                border: `1px solid ${TRUST_COLOR[agent.trustLevel]}30`,
                color: TRUST_COLOR[agent.trustLevel],
              }}>
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
              <Text style={{ color: '#6B7280', fontSize: 11 }}>最后活跃: {formatTimeAgo(agent.last_seen)}</Text>
              <Text style={{ color: '#6B7280', fontSize: 11 }}>· 同时任务: {agent.maxConcurrentTasks}</Text>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0D0D0F', border: '1px solid #2C2C31', borderRadius: 6, padding: '4px 10px' }}>
            <StatusDot status={agent.status} />
            <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{STATUS_LABEL[agent.status]}</Text>
          </div>
          {agent.currentTask && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0D0D0F', border: '1px solid #2C2C31', borderRadius: 6, padding: '4px 10px', maxWidth: 280 }}>
              <CaretRightOutlined style={{ color: '#7065F3', fontSize: 10 }} />
              <Text style={{ color: '#D1D5DB', fontSize: 12 }} ellipsis>{agent.currentTask}</Text>
            </div>
          )}
          {agent.uptimeSeconds !== undefined && agent.uptimeSeconds > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0D0D0F', border: '1px solid #2C2C31', borderRadius: 6, padding: '4px 10px' }}>
              <ClockCircleOutlined style={{ color: '#6B7280', fontSize: 11 }} />
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>运行时长: {formatUptime(agent.uptimeSeconds)}</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Real-time Status + Selectors Row */}
      <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>⚡ 实时状态与配置</Text>
        </div>
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Row gutter={[8, 8]}>
              {[
                { label: '状态', value: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StatusDot status={agent.status} /><Text style={{ color: STATUS_COLORS[agent.status], fontSize: 13, fontWeight: 600 }}>{STATUS_LABEL[agent.status]}</Text></div> },
                { label: '当前任务', value: <Text style={{ color: agent.currentTask ? '#D1D5DB' : '#4B5563', fontSize: 12 }} ellipsis>{agent.currentTask || '无'}</Text> },
                { label: '运行时长', value: <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatUptime(agent.uptimeSeconds || 0)}</Text> },
                { label: 'Token 输入', value: <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatTokens(agent.tokenUsage?.input || 0)}</Text> },
                { label: 'Token 输出', value: <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{formatTokens(agent.tokenUsage?.output || 0)}</Text> },
                { label: '并发上限', value: <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{agent.maxConcurrentTasks} 任务</Text> },
              ].map(item => (
                <Col span={8} key={item.label}>
                  <div style={{ background: '#0D0D0F', borderRadius: 8, padding: '10px 12px', border: '1px solid #2C2C31' }}>
                    <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>{item.label}</Text>
                    {item.value}
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
          <Col span={12}>
            <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>🤖 使用模型</Text>
            <Select value={agent.model} options={AVAILABLE_MODELS} onChange={onModelChange}
              style={{ width: '100%' }} dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
          </Col>
          <Col span={12}>
            <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>💬 消息渠道</Text>
            <Select value={agent.channel} options={AVAILABLE_CHANNELS} onChange={onChannelChange}
              style={{ width: '100%' }} dropdownStyle={{ background: '#1F1F23', border: '1px solid #2C2C31' }} />
          </Col>
        </Row>
      </Card>

      {/* Capabilities & Tools */}
      <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
        <Text strong style={{ color: '#FAFAFA', fontSize: 13, display: 'block', marginBottom: 12 }}>🛠 能力与工具</Text>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>能力 (Capabilities)</Text>
          <Space wrap size={[6, 6]}>
            {agent.capabilities.map((cap: string) => (
              <Tag key={cap} style={{ background: '#7065F315', border: '1px solid #7065F330', color: '#A78BFA', fontSize: 11 }}>{cap}</Tag>
            ))}
          </Space>
        </div>
        <div>
          <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 6 }}>工具 (Tools)</Text>
          <Space wrap size={[6, 6]}>
            {agent.tools.map((tool: string) => (
              <Tag key={tool} style={{ background: '#0D0D0F', border: '1px solid #2C2C31', color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace' }}>{tool}</Tag>
            ))}
          </Space>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12, flex: 1, minHeight: 0 }}
        bodyStyle={{ padding: 16, overflowY: 'auto', maxHeight: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong style={{ color: '#FAFAFA', fontSize: 13 }}>📋 活动记录</Text>
          <Button size="small" icon={<HistoryOutlined />} style={{ fontSize: 11 }}>全部记录</Button>
        </div>
        <Timeline items={activities.map(evt => ({
          dot: getActivityIcon(evt.type),
          children: (
            <div>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{evt.description}</Text>
              {evt.detail && <Text style={{ color: '#6B7280', fontSize: 11, display: 'block' }}>{evt.detail}</Text>}
              <Text style={{ color: '#4B5563', fontSize: 10, display: 'block', marginTop: 2 }}>{formatTimeAgo(evt.timestamp)}</Text>
            </div>
          ),
        }))} />
      </Card>

      {/* Action Buttons */}
      <Card style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }} bodyStyle={{ padding: 14 }}>
        <Space size={10} style={{ width: '100%' }}>
          <Button
            type={agent.status === 'offline' || agent.status === 'idle' ? 'primary' : 'default'}
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            disabled={agent.status === 'busy' || agent.status === 'streaming'}
            style={{ flex: 1, background: agent.status === 'offline' || agent.status === 'idle' ? '#7065F3' : undefined, border: agent.status === 'offline' || agent.status === 'idle' ? '#7065F3' : undefined }}
          >启动</Button>
          <Button danger icon={<StopOutlined />} onClick={onStop}
            disabled={agent.status === 'offline' || agent.status === 'idle'} style={{ flex: 1 }}>停止</Button>
          <Button icon={<SettingOutlined />} onClick={onConfigure} style={{ flex: 1 }}>配置</Button>
          <Button icon={<FileTextOutlined />} onClick={onViewLogs} style={{ flex: 1 }}>日志</Button>
        </Space>
      </Card>
    </div>
  )
}
