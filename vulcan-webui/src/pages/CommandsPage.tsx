import { useState, useEffect } from 'react'
import {
  Typography, Input, Button, Tag, Tabs, Card, Row, Col,
  Empty, Spin, message, List, Space, Badge, Tooltip, Modal, Select
} from 'antd'
import {
  SearchOutlined, PlayCircleOutlined, HistoryOutlined,
  ThunderboltOutlined, RobotOutlined, CodeOutlined, ExperimentOutlined,
  DatabaseOutlined, ToolOutlined, SearchOutlined as SearchIcon,
  AudioOutlined, TeamOutlined, InfoCircleOutlined, CopyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, MessageOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text, Paragraph } = Typography

// ─── Design Tokens ────────────────────────────────────────────────────────────

const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  hover: '#27272A',
  accent: '#7065F3',
  accentHover: '#7C74F5',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  categories: {
    system: '#6366F1',
    ai: '#8B5CF6',
    search: '#06B6D4',
    media: '#EC4899',
    code: '#10B981',
    agent: '#F59E0B',
    skill: '#3B82F6',
    memory: '#8B5CF6',
    utility: '#6B7280',
  } as Record<string, string>,
}

const categoryIcons: Record<string, React.ReactNode> = {
  system: <InfoCircleOutlined />,
  ai: <RobotOutlined />,
  search: <SearchIcon />,
  media: <AudioOutlined />,
  code: <CodeOutlined />,
  agent: <TeamOutlined />,
  skill: <ToolOutlined />,
  memory: <DatabaseOutlined />,
  utility: <ExperimentOutlined />,
}

const categoryLabels: Record<string, string> = {
  system: '系统',
  ai: 'AI 对话',
  search: '搜索',
  media: '媒体',
  code: '代码',
  agent: 'Agent',
  skill: '技能',
  memory: '记忆',
  utility: '工具',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandInfo {
  name: string
  description: string
  syntax: string
  category: string
  triggers: string[]
  requires_auth: boolean
  channel_scope: string[]
}

interface CommandExecResult {
  command: string
  args: Record<string, unknown>
  result: unknown
  success: boolean
  error: string | null
  timestamp: string
}

interface HistoryEntry {
  command: string
  args: Record<string, unknown>
  result: string
  timestamp: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function CommandCard({ cmd, onTry }: { cmd: CommandInfo; onTry: (cmd: CommandInfo) => void }) {
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

function ExecutionModal({
  cmd,
  open,
  onClose,
  onExecute,
}: {
  cmd: CommandInfo
  open: boolean
  onClose: () => void
  onExecute: (args: Record<string, string>) => void
}) {
  const [argsText, setArgsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandExecResult | null>(null)

  const syntaxParts = cmd.syntax.replace('/' + cmd.name, '').trim()

  const handleExecute = async () => {
    setLoading(true)
    setResult(null)
    try {
      // Parse args based on command type
      const parsedArgs: Record<string, string> = {}
      if (argsText.trim()) {
        if (cmd.name === 'image' || cmd.name === 'ask' || cmd.name === 'search' || cmd.name === 'translate' ||
            cmd.name === 'remember' || cmd.name === 'shorten' || cmd.name === 'expand' || cmd.name === 'lookup' ||
            cmd.name === 'expert' || cmd.name === 'echo' || cmd.name === 'tts') {
          parsedArgs['prompt'] = argsText
        } else if (cmd.name === 'model' || cmd.name === 'temperature' || cmd.name === 'eval' || cmd.name === 'script') {
          parsedArgs['value'] = argsText
        } else if (cmd.name === 'code') {
          const parts = argsText.split('\n', 1)
          parsedArgs['language'] = parts[0]
          parsedArgs['code'] = parts[1] || ''
        } else if (cmd.name === 'forget') {
          parsedArgs['keyword'] = argsText
        } else if (cmd.name === 'config') {
          const parts = argsText.split(' ', 2)
          parsedArgs['action'] = parts[0] || ''
          parsedArgs['key'] = parts[1] || ''
        } else if (cmd.name === 'cron') {
          const parts = argsText.split(' ', 1)
          parsedArgs['action'] = parts[0] || ''
        } else if (cmd.name === 'notify') {
          const parts = argsText.split(' ', 1)
          parsedArgs['channel'] = parts[0] || ''
        } else if (cmd.name === 'skill' || cmd.name === 'memory') {
          const parts = argsText.split(' ', 1)
          parsedArgs['action'] = parts[0] || ''
        } else if (cmd.name === 'export') {
          parsedArgs['format'] = argsText || 'json'
        } else if (cmd.name === 'agent') {
          const parts = argsText.split(' ', 1)
          parsedArgs['agent_name'] = parts[0] || ''
        }
      }

      const res = await api.post<CommandExecResult>('/commands/execute', {
        command: cmd.name,
        args: parsedArgs,
      })
      setResult(res as CommandExecResult)
    } catch (err: unknown) {
      setResult({
        command: cmd.name,
        args: {},
        result: null,
        success: false,
        error: String(err),
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span style={{ color: colors.textPrimary }}>
          执行指令 <span style={{ color: colors.accent, fontFamily: 'monospace' }}>/{cmd.name}</span>
        </span>
      }
      footer={[
        <Button key="cancel" onClick={onClose} style={{ borderColor: colors.border }}>
          关闭
        </Button>,
        <Button
          key="execute"
          type="primary"
          loading={loading}
          onClick={handleExecute}
          style={{ background: colors.accent, borderColor: colors.accent }}
        >
          <PlayCircleOutlined /> 执行
        </Button>,
      ]}
      style={{ top: 80 }}
      bodyStyle={{ background: colors.bg }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>语法</Text>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: colors.textPrimary,
            background: colors.surface,
            padding: '8px 12px',
            borderRadius: 6,
            marginTop: 4,
            border: `1px solid ${colors.border}`,
          }}
        >
          {cmd.syntax}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {cmd.triggers.length > 0 ? '触发词' : '说明'}
        </Text>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {cmd.triggers.length > 0
            ? cmd.triggers.map(t => (
                <Tag key={t} style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                  {t}
                </Tag>
              ))
            : <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{cmd.description}</Text>
          }
        </div>
      </div>

      {cmd.name !== 'ping' && cmd.name !== 'time' && cmd.name !== 'version' &&
       cmd.name !== 'status' && cmd.name !== 'clear' && cmd.name !== 'reset' &&
       cmd.name !== 'retry' && cmd.name !== 'summarize' && cmd.name !== 'agents' &&
       cmd.name !== 'skills' && cmd.name !== 'transcribe' && (
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {cmd.name === 'image' || cmd.name === 'ask' || cmd.name === 'search' ? '输入内容' : '参数'}
          </Text>
          <Input.TextArea
            value={argsText}
            onChange={e => setArgsText(e.target.value)}
            placeholder={syntaxParts || '输入参数...'}
            style={{
              marginTop: 4,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontFamily: 'monospace',
            }}
            rows={3}
          />
        </div>
      )}

      {result && (
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${result.success ? colors.success : colors.error}40`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {result.success
              ? <CheckCircleOutlined style={{ color: colors.success }} />
              : <CloseCircleOutlined style={{ color: colors.error }} />}
            <Text style={{ color: result.success ? colors.success : colors.error, fontSize: 12 }}>
              {result.success ? '执行成功' : '执行失败'}
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
            {typeof result.result === 'object'
              ? JSON.stringify(result.result, null, 2)
              : String(result.result ?? result.error ?? '')}
          </pre>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommandsPage() {
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedCmd, setSelectedCmd] = useState<CommandInfo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadCommands()
  }, [])

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
    if (key === 'history') {
      loadHistory()
    }
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

  const categoryOrder = ['system', 'ai', 'search', 'media', 'code', 'agent', 'skill', 'memory', 'utility']

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
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        padding: '24px 32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Title
            level={3}
            style={{
              color: colors.textPrimary,
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
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
          style={{
            maxWidth: 360,
            marginBottom: 16,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
          }}
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
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : activeTab === 'history' ? (
        <div>
          <HistoryView history={history} loading={historyLoading} />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          description={<Text style={{ color: colors.textSecondary }}>没有找到匹配的指令</Text>}
          style={{ marginTop: 80 }}
        />
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
                  <Text
                    style={{
                      color: colors.categories[cat] || colors.accent,
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
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

function HistoryView({ history, loading }: { history: HistoryEntry[]; loading: boolean }) {
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
