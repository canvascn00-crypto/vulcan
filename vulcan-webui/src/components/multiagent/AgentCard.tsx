import { Avatar, Tag, Select } from 'antd'
import { Typography } from 'antd'
import { RobotOutlined, CaretRightOutlined } from '@ant-design/icons'
import {
  AgentInfo,
  AVAILABLE_MODELS,
  AVAILABLE_CHANNELS,
  STATUS_COLORS,
  STATUS_LABEL,
  TRUST_COLOR,
} from './types'
import { ROLE_ICON } from './constants'

const { Text } = Typography

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

interface AgentCardProps {
  agent: AgentInfo
  selected: boolean
  onSelect: () => void
  onModelChange: (agentId: string, model: string) => void
  onChannelChange: (agentId: string, channel: string) => void
}

export default function AgentCard({
  agent, selected, onSelect, onModelChange, onChannelChange,
}: AgentCardProps) {
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
      {selected && (
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 3,
          background: '#7065F3',
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar size={36} style={{
          background: agent.status === 'offline' ? '#374151' : `${STATUS_COLORS[agent.status]}20`,
          border: `1px solid ${agent.status === 'offline' ? '#4b5563' : STATUS_COLORS[agent.status]}40`,
          color: agent.status === 'offline' ? '#9ca3af' : STATUS_COLORS[agent.status],
          fontSize: 16,
        }} icon={ROLE_ICON[agent.role] || <RobotOutlined />} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ color: '#FAFAFA', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {agent.name}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Tag style={{
              fontSize: 10, padding: '0 4px', margin: 0,
              background: `${TRUST_COLOR[agent.trustLevel]}15`,
              border: `1px solid ${TRUST_COLOR[agent.trustLevel]}30`,
              color: TRUST_COLOR[agent.trustLevel],
            }}>
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

      {agent.currentTask ? (
        <div style={{ background: '#0D0D0F', borderRadius: 6, padding: '6px 8px', marginBottom: 10 }}>
          <Text style={{ color: '#6B7280', fontSize: 10 }}>当前任务</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <CaretRightOutlined style={{ color: '#7065F3', fontSize: 10 }} />
            <Text style={{ color: '#D1D5DB', fontSize: 11 }} ellipsis>{agent.currentTask}</Text>
          </div>
        </div>
      ) : (
        <div style={{ background: '#0D0D0F', borderRadius: 6, padding: '6px 8px', marginBottom: 10, border: '1px dashed #2C2C31' }}>
          <Text style={{ color: '#4B5563', fontSize: 11 }}>暂无执行任务</Text>
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>🤖 模型</Text>
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

      <div>
        <Text style={{ color: '#6B7280', fontSize: 10, display: 'block', marginBottom: 4 }}>💬 渠道</Text>
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

export { StatusDot }
