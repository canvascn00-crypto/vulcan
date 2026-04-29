import { Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { colors } from './layoutConfig'

const { Title, Text } = Typography

export function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        padding: collapsed ? '16px 8px' : '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.accent} 0%, #8B5CF6 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <RobotOutlined style={{ fontSize: 18, color: '#fff' }} />
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Title level={5} style={{ color: colors.textPrimary, margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Vulcan
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            v2.0.0
          </Text>
        </div>
      )}
    </div>
  )
}

// ─── Navigation Item ────────────────────────────────────────────────────────

export function NavItem({
  item, collapsed, onClick, selected,
}: {
  item: { key: string; icon: React.ReactNode; label: string }
  collapsed: boolean
  onClick: () => void
  selected: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: collapsed ? '10px 0' : '10px 16px', margin: '2px 8px',
        borderRadius: 8, cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: selected ? `${colors.accent}15` : 'transparent',
        border: selected ? `1px solid ${colors.accent}30` : '1px solid transparent',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = colors.hover }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: 16, color: selected ? colors.accent : colors.textSecondary, display: 'flex', alignItems: 'center' }}>
        {item.icon}
      </span>
      {!collapsed && (
        <span style={{ fontSize: 13, color: selected ? colors.textPrimary : colors.textSecondary, fontWeight: selected ? 500 : 400, whiteSpace: 'nowrap' }}>
          {item.label}
        </span>
      )}
    </div>
  )
}

// ─── Status Indicators ──────────────────────────────────────────────────────

export function StatusDot({ status }: { status: 'online' | 'offline' | 'degraded' }) {
  const colorMap = { online: colors.success, offline: colors.danger, degraded: colors.warning }
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: colorMap[status], display: 'inline-block',
      boxShadow: `0 0 6px ${colorMap[status]}40`,
    }} />
  )
}

export function StatusIndicator({ label, status }: { label: string; status: 'online' | 'offline' | 'degraded' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <StatusDot status={status} />
      <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 500 }}>{label}</span>
    </div>
  )
}
