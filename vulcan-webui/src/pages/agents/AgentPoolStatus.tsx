import {
  TeamOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import type { Agent } from './types'

const styles = {
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  statCard: {
    background: '#18181B',
    border: '1px solid #2C2C31',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  } as React.CSSProperties,
  statInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#FAFAFA',
    lineHeight: 1,
  } as React.CSSProperties,
  statLabel: {
    fontSize: '13px',
    color: '#A1A1AA',
  } as React.CSSProperties,
}

interface AgentPoolStatusProps {
  agents: Agent[]
}

export function AgentPoolStatus({ agents }: AgentPoolStatusProps) {
  const activeCount = agents.filter(a => a.status === 'active').length
  const idleCount = agents.filter(a => a.status === 'idle').length

  return (
    <div style={styles.statsRow}>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(112, 101, 243, 0.15)' }}>
          <TeamOutlined style={{ color: '#7065F3' }} />
        </div>
        <div style={styles.statInfo}>
          <span style={styles.statValue}>{agents.length}</span>
          <span style={styles.statLabel}>总数</span>
        </div>
      </div>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(34, 197, 94, 0.15)' }}>
          <CheckCircleOutlined style={{ color: '#22C55E' }} />
        </div>
        <div style={styles.statInfo}>
          <span style={styles.statValue}>{activeCount}</span>
          <span style={styles.statLabel}>活跃</span>
        </div>
      </div>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(161, 161, 170, 0.15)' }}>
          <ClockCircleOutlined style={{ color: '#A1A1AA' }} />
        </div>
        <div style={styles.statInfo}>
          <span style={styles.statValue}>{idleCount}</span>
          <span style={styles.statLabel}>空闲</span>
        </div>
      </div>
    </div>
  )
}
