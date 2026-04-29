import { useState, useEffect } from 'react'
import { Typography, Input, Tabs, Row, Col, Empty, Spin, message, Tag } from 'antd'
import { SearchOutlined, HistoryOutlined } from '@ant-design/icons'
import { api } from '@/services/api'
import { colors, categoryOrder, categoryLabels, categoryIcons } from './commands/constants'
import type { CommandInfo, HistoryEntry } from './commands/constants'
import { CommandCard } from './commands/CommandCard'
import { ExecutionModal } from './commands/ExecutionModal'
import { HistoryView } from './commands/HistoryView'

const { Title, Text } = Typography

export default function CommandsPage() {
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedCmd, setSelectedCmd] = useState<CommandInfo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { loadCommands() }, [])

  const loadCommands = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ commands: CommandInfo[] }>('/commands/')
      setCommands(res.commands as CommandInfo[])
    } catch {
      message.error('加载指令列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get<{ history: HistoryEntry[] }>('/commands/history?limit=50')
      setHistory(res.history as HistoryEntry[])
    } catch {
      message.error('加载历史失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    if (key === 'history') loadHistory()
  }

  const filtered = commands.filter(cmd => {
    const matchSearch = !search ||
      cmd.name.includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.triggers.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchTab = activeTab === 'all' || cmd.category === activeTab
    return matchSearch && matchTab
  })

  const byCategory: Record<string, CommandInfo[]> = {}
  for (const cmd of filtered) {
    if (!byCategory[cmd.category]) byCategory[cmd.category] = []
    byCategory[cmd.category].push(cmd)
  }

  const handleTry = (cmd: CommandInfo) => {
    setSelectedCmd(cmd)
    setModalOpen(true)
  }

  const tabs = [
    { key: 'all', label: `全部 (${commands.length})` },
    ...categoryOrder
      .filter(cat => commands.some(cmd => cmd.category === cat))
      .map(cat => ({
        key: cat,
        label: `${categoryLabels[cat] || cat} (${commands.filter(cmd => cmd.category === cat).length})`,
      })),
    { key: 'history', label: <span><HistoryOutlined /> 历史</span> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Title level={3} style={{ color: colors.textPrimary, margin: 0, fontSize: 20, fontWeight: 600 }}>
            全局指令
          </Title>
          <Tag style={{ background: colors.accent + '20', color: colors.accent, border: 'none', fontSize: 11 }}>
            内置 {commands.length} 个
          </Tag>
        </div>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          在任何渠道发送 <span style={{ fontFamily: 'monospace', color: colors.accent }}>/command</span> 触发，或点击卡片直接执行
        </Text>
      </div>

      {/* Search + Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Input
          prefix={<SearchOutlined style={{ color: colors.textSecondary }} />}
          placeholder="搜索指令、触发词..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
          allowClear
        />
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          tabBarStyle={{ borderBottom: `1px solid ${colors.border}` }}
          style={{ color: colors.textPrimary }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : activeTab === 'history' ? (
        <HistoryView history={history} loading={historyLoading} />
      ) : filtered.length === 0 ? (
        <Empty description={<Text style={{ color: colors.textSecondary }}>没有找到匹配的指令</Text>} style={{ marginTop: 80 }} />
      ) : (
        <div>
          {categoryOrder.map(cat => {
            const cmds = byCategory[cat]
            if (!cmds || cmds.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: colors.categories[cat] || colors.accent }}>
                    {categoryIcons[cat]}
                  </span>
                  <Text style={{ color: colors.categories[cat] || colors.accent, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {categoryLabels[cat] || cat}
                  </Text>
                  <div style={{ flex: 1, height: 1, background: colors.border, marginLeft: 8 }} />
                </div>
                <Row gutter={[12, 12]}>
                  {cmds.map(cmd => (
                    <Col key={cmd.name} xs={24} sm={12} md={8} lg={6}>
                      <CommandCard cmd={cmd} onTry={handleTry} />
                    </Col>
                  ))}
                </Row>
              </div>
            )
          })}
        </div>
      )}

      {/* Execution Modal */}
      {selectedCmd && (
        <ExecutionModal
          cmd={selectedCmd}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onExecute={() => {}}
        />
      )}
    </div>
  )
}
