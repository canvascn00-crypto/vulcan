import { Typography, Empty, Spin } from 'antd'
import { colors } from './constants'
import type { HistoryEntry } from './constants'

const { Text } = Typography

export function HistoryView({ history, loading }: { history: HistoryEntry[]; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
  }

  if (history.length === 0) {
    return (
      <Empty
        description={<Text style={{ color: colors.textSecondary }}>暂无执行历史</Text>}
        style={{ marginTop: 80 }}
      />
    )
  }

  return (
    <div>
      {history.map((entry, i) => (
        <div
          key={i}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'monospace',
                color: colors.accent,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              /{entry.command}
            </span>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 'auto' }}>
              {new Date(entry.timestamp).toLocaleString('zh-CN')}
            </Text>
          </div>
          <pre
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {typeof entry.result === 'object'
              ? JSON.stringify(entry.result, null, 2)
              : String(entry.result)}
          </pre>
        </div>
      ))}
    </div>
  )
}
