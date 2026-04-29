import { Typography, Tag } from 'antd'
import { colors, categoryLabels } from './constants'
import type { CommandInfo } from './constants'

const { Paragraph } = Typography

export function CommandCard({ cmd, onTry }: { cmd: CommandInfo; onTry: (cmd: CommandInfo) => void }) {
  const catColor = colors.categories[cmd.category] || colors.accent

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onClick={() => onTry(cmd)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = catColor + '60'
        e.currentTarget.style.background = colors.hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.background = colors.surface
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: catColor, fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>
          /{cmd.name}
        </span>
        <Tag
          style={{
            background: catColor + '20',
            color: catColor,
            border: 'none',
            fontSize: 10,
            marginLeft: 'auto',
          }}
        >
          {categoryLabels[cmd.category] || cmd.category}
        </Tag>
      </div>
      <Paragraph
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          margin: 0,
          marginBottom: 8,
          lineHeight: 1.5,
        }}
        ellipsis={{ rows: 2 }}
      >
        {cmd.description}
      </Paragraph>
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: colors.textSecondary,
          background: colors.bg,
          padding: '4px 8px',
          borderRadius: 4,
          display: 'inline-block',
        }}
      >
        {cmd.syntax}
      </div>
    </div>
  )
}
