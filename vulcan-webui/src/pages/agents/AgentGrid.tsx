import { Avatar } from 'antd'
import {
  RobotOutlined, SettingOutlined, MessageOutlined, DeleteOutlined, ToolOutlined,
} from '@ant-design/icons'
import type { Agent } from './types'
import { ROLE_COLORS, STATUS_COLORS } from './constants'

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
  agentCard: {
    background: '#18181B',
    border: '1px solid #2C2C31',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  agentCardHover: {
    background: '#27272A',
    border: '1px solid #3f3f46',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  } as React.CSSProperties,
  agentInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    flex: 1,
    marginLeft: '14px',
  } as React.CSSProperties,
  agentName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#FAFAFA',
    margin: 0,
  } as React.CSSProperties,
  roleBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  } as React.CSSProperties,
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  } as React.CSSProperties,
  statusText: {
    fontSize: '13px',
  } as React.CSSProperties,
  description: {
    fontSize: '13px',
    color: '#A1A1AA',
    lineHeight: 1.5,
    marginBottom: '16px',
  } as React.CSSProperties,
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '16px',
  } as React.CSSProperties,
  modelTag: {
    background: 'rgba(112, 101, 243, 0.15)',
    color: '#7065F3',
    border: '1px solid rgba(112, 101, 243, 0.3)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  toolsBadge: {
    background: 'rgba(161, 161, 170, 0.15)',
    color: '#A1A1AA',
    border: '1px solid rgba(161, 161, 170, 0.3)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  statsRow2: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #2C2C31',
    marginBottom: '16px',
  } as React.CSSProperties,
  tasksCount: {
    fontSize: '13px',
    color: '#A1A1AA',
  } as React.CSSProperties,
  tasksValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#FAFAFA',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  actionBtn: {
    flex: 1,
    height: '32px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
}

interface AgentGridProps {
  agents: Agent[]
  onOpenConfig: (agent: Agent, e: React.MouseEvent) => void
  onOpenMessages: (agent: Agent, e: React.MouseEvent) => void
  onDelete: (agent: Agent, e: React.MouseEvent) => void
}

export function AgentGrid({ agents, onOpenConfig, onOpenMessages, onDelete }: AgentGridProps) {
  return (
    <div style={styles.grid}>
      {agents.map(agent => {
        const roleStyle = ROLE_COLORS[agent.role] || ROLE_COLORS.specialist
        const statusStyle = STATUS_COLORS[agent.status] || STATUS_COLORS.idle

        return (
          <div key={agent.id} style={styles.agentCard}>
            {/* Card Header */}
            <div style={styles.cardHeader}>
              <Avatar
                style={{
                  ...styles.avatar,
                  background: roleStyle.bg,
                  border: `1px solid ${roleStyle.border}`,
                }}
                icon={<RobotOutlined style={{ color: roleStyle.text, fontSize: '22px' }} />}
              />
              <div style={styles.agentInfo}>
                <h3 style={styles.agentName}>{agent.name}</h3>
                <span
                  style={{
                    ...styles.roleBadge,
                    background: roleStyle.bg,
                    color: roleStyle.text,
                    border: `1px solid ${roleStyle.border}`,
                  }}
                >
                  {agent.role}
                </span>
              </div>
            </div>

            {/* Status */}
            <div style={styles.statusRow}>
              <span style={{ ...styles.statusDot, background: statusStyle.dot }} />
              <span style={{ ...styles.statusText, color: statusStyle.text }}>
                {agent.status === 'active' ? '运行中' : agent.status === 'idle' ? '空闲' : '错误'}
              </span>
            </div>

            {/* Description */}
            <p style={styles.description}>{agent.description}</p>

            {/* Tags */}
            <div style={styles.tagRow}>
              <span style={styles.modelTag}>
                {agent.model || 'default'}
              </span>
              <span style={styles.toolsBadge}>
                <ToolOutlined style={{ fontSize: '11px' }} />
                {agent.tools.length} 工具
              </span>
            </div>

            {/* Tasks Completed */}
            <div style={styles.statsRow2}>
              <div>
                <span style={styles.tasksCount}>已完成任务</span>
                <div style={styles.tasksValue}>{agent.tasksCompleted}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button
                style={{
                  ...styles.actionBtn,
                  background: 'rgba(112, 101, 243, 0.15)',
                  color: '#7065F3',
                  border: '1px solid rgba(112, 101, 243, 0.3)',
                }}
                onClick={(e) => onOpenConfig(agent, e)}
              >
                <SettingOutlined /> 配置
              </button>
              <button
                style={{
                  ...styles.actionBtn,
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22C55E',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
                onClick={(e) => onOpenMessages(agent, e)}
              >
                <MessageOutlined /> 消息
              </button>
              <button
                style={{
                  ...styles.actionBtn,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
                onClick={(e) => onDelete(agent, e)}
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
