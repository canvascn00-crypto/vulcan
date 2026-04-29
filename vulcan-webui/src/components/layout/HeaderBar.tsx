import { Typography, Space } from 'antd'
import { SearchOutlined, BellOutlined, SettingOutlined as SettingsOutlined } from '@ant-design/icons'
import { colors } from './layoutConfig'

const { Text } = Typography

export function HeaderBar({ breadcrumb }: { breadcrumb: string }) {
  return (
    <div
      style={{
        height: 56, minHeight: 56,
        background: colors.surface, borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 400 }}>
          {breadcrumb}
        </Text>
      </div>

      <Space size={16}>
        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8,
            background: colors.card, border: `1px solid ${colors.cardBorder}`,
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.cardBorder }}
        >
          <SearchOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>搜索...</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, background: colors.hover, padding: '2px 6px', borderRadius: 4 }}>
            ⌘K
          </Text>
        </div>

        {/* Notifications */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: colors.card, border: `1px solid ${colors.cardBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.cardBorder }}
        >
          <BellOutlined style={{ color: colors.textSecondary, fontSize: 16 }} />
          <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: colors.danger, border: '2px solid colors.surface' }} />
        </div>

        {/* Settings */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: colors.card, border: `1px solid ${colors.cardBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.cardBorder }}
        >
          <SettingsOutlined style={{ color: colors.textSecondary, fontSize: 16 }} />
        </div>
      </Space>
    </div>
  )
}
