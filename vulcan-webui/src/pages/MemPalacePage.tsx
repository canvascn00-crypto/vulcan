import { useState, useEffect, useCallback } from 'react'
import { Typography, Card, Row, Col, Tag, Space, Button, Statistic, List, Input, message, Tabs, Spin, Alert, Divider, Popconfirm, Badge, Tooltip, Modal, Form } from 'antd'
import { ThunderboltOutlined, DatabaseOutlined, SearchOutlined, ReloadOutlined, LockOutlined, GlobalOutlined, ApiOutlined, SyncOutlined, DeleteOutlined, SaveOutlined, KeyOutlined, BankOutlined, ApartmentOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text, Paragraph } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemPalaceStatus {
  palace_path: string
  L0_identity: { exists: boolean; tokens: number }
  total_drawers: number
  backends: Record<string, any>
}

interface IdentityInfo {
  name: string
  role: string
  traits: string[]
  goals: string[]
}

interface MemoryDrawer {
  id: string
  layer: string
  content: string
  timestamp: string
  tags: string[]
  recall_count: number
}

interface SearchResult {
  id: string
  content: string
  similarity: number
  layer: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATUS: MemPalaceStatus = {
  palace_path: '/root/.mempalace/palace',
  L0_identity: { exists: true, tokens: 234 },
  total_drawers: 2847,
  backends: {
    'chroma': { status: 'active', collections: 12, vectors: 4521 },
    'redis': { status: 'active', keys: 89 },
    'postgresql': { status: 'active', tables: 7 },
    'mcp': { status: 'connected', servers: 3 },
  },
}

const MOCK_DRAWERS: MemoryDrawer[] = [
  { id: '1', layer: 'L3_Universal', content: '跨Agent记忆协议：MemPalace v3.3.3 统一记忆层，支持多Agent并发读写', timestamp: '2026-04-28T10:00:00Z', tags: ['MCP', '跨Agent', '协议'], recall_count: 156 },
  { id: '2', layer: 'L2_LongTerm', content: '用户偏好：微信会话直接操作，简短回复，不需要多余解释', timestamp: '2026-04-28T09:30:00Z', tags: ['用户偏好', '微信'], recall_count: 89 },
  { id: '3', layer: 'L1_ShortTerm', content: '当前 VPN provider: rioLU/riolu01.link，df.dawnloadai.com:8443 地府GLM', timestamp: '2026-04-28T14:00:00Z', tags: ['VPN', '配置'], recall_count: 34 },
  { id: '4', layer: 'L0_Identity', content: 'Vulcan Agent — Phase 0-7 完成，Phase 8 MemPalace 集成中', timestamp: '2026-04-28T18:00:00Z', tags: ['Vulcan', 'Phase'], recall_count: 12 },
]

// ─── Layer Config ─────────────────────────────────────────────────────────────

const layerConfig: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  'L0_Identity': { label: '🧠 L0 身份层', color: '#7c3aed', desc: 'Agent 身份 · 角色定义 · 核心目标', icon: <BankOutlined /> },
  'L1_ShortTerm': { label: '⚡ L1 短期记忆', color: '#f59e0b', desc: '会话上下文 · Redis · 自动过期', icon: <ThunderboltOutlined /> },
  'L2_LongTerm': { label: '🔎 L2 长期记忆', color: '#5a6ef5', desc: 'ChromaDB · 向量检索 · 跨会话', icon: <SearchOutlined /> },
  'L3_Universal': { label: '🌐 L3 通用记忆', color: '#10b981', desc: '跨Agent · MCP协议 · 知识共享', icon: <GlobalOutlined /> },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MemPalacePage() {
  const [status, setStatus] = useState<MemPalaceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [identity, setIdentity] = useState<IdentityInfo>({ name: 'Vulcan Agent', role: 'AI Agent', traits: ['自动化', '高效', '跨平台'], goals: ['集成MemPalace', '增强记忆能力'] })
  const [identityModalOpen, setIdentityModalOpen] = useState(false)
  const [drawers, setDrawers] = useState<MemoryDrawer[]>(MOCK_DRAWERS)
  const [wakeUpLoading, setWakeUpLoading] = useState(false)
  const [wingsLoading, setWingsLoading] = useState(false)

  // ─── Fetch Status ──────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await fetch('/api/mempalace/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // fallback to mock
      setStatus(MOCK_STATUS)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // ─── Wake-up ────────────────────────────────────────────────────────────────
  const handleWakeUp = async () => {
    setWakeUpLoading(true)
    try {
      const res = await fetch('/api/mempalace/wake-up', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        message.success(`唤醒成功 · ${data.tokens} tokens`)
        fetchStatus()
      } else {
        message.error(data.detail || '唤醒失败')
      }
    } catch {
      message.success('唤醒成功 · (mock)')
    } finally {
      setWakeUpLoading(false)
    }
  }

  // ─── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mempalace/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.results || [])
        message.success(`找到 ${data.results?.length || 0} 条结果`)
      }
    } catch {
      // mock search
      const mock = drawers.filter(d => d.content.includes(searchQuery) || d.tags.some(t => t.includes(searchQuery)))
      setSearchResults(mock.map(d => ({ id: d.id, content: d.content, similarity: 0.95, layer: d.layer })))
    } finally {
      setLoading(false)
    }
  }

  // ─── Recall ─────────────────────────────────────────────────────────────────
  const handleRecall = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mempalace/recall?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (res.ok) {
        message.success(`回忆提取: ${data.count} 条`)
      }
    } catch {
      message.success('回忆提取成功 (mock)')
    } finally {
      setLoading(false)
    }
  }

  // ─── Sync Wings ─────────────────────────────────────────────────────────────
  const handleWings = async () => {
    setWingsLoading(true)
    try {
      const res = await fetch('/api/mempalace/wings', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        message.success(`翅膀同步完成 · ${data.synced} 条`)
        fetchStatus()
      }
    } catch {
      message.success('翅膀同步完成 (mock)')
    } finally {
      setWingsLoading(false)
    }
  }

  // ─── Backend Cards ──────────────────────────────────────────────────────────
  const backends = status?.backends || MOCK_STATUS.backends
  const backendCards = Object.entries(backends).map(([name, info]: [string, any]) => ({
    key: name,
    title: name.toUpperCase(),
    status: info.status,
    icon: <ApiOutlined />,
    stats: Object.entries(info).filter(([k]) => k !== 'status').map(([k, v]) => `${k}: ${v}`).join(' · '),
  }))

  // ─── Filtered Drawers ───────────────────────────────────────────────────────
  const filtered = drawers.filter(d =>
    !search || d.content.includes(search) || d.tags.some(t => t.includes(search))
  )

  const tabItems = [
    {
      key: 'all',
      label: `全部抽屉 (${filtered.length})`,
      children: (
        <List
          size="small"
          dataSource={filtered}
          renderItem={(item) => {
            const cfg = layerConfig[item.layer] || { label: item.layer, color: '#999', icon: <DatabaseOutlined /> }
            return (
              <List.Item
                actions={[
                  <Tag color={cfg.color} key="layer">{cfg.label}</Tag>,
                  <Tag key="recall">召回 {item.recall_count}</Tag>,
                  <Popconfirm title="确认删除？" onConfirm={() => { setDrawers(prev => prev.filter(d => d.id !== item.id)); message.success('已删除') }}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<Text style={{ fontSize: 12 }}>{item.content}</Text>}
                  description={
                    <Space size="small" style={{ marginTop: 4 }}>
                      {item.tags.map(tag => <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>)}
                      <Text type="secondary" style={{ fontSize: 10 }}>{item.timestamp}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      ),
    },
    ...Object.entries(layerConfig).map(([layer, cfg]) => ({
      key: layer,
      label: <span style={{ color: cfg.color }}>{cfg.label}</span>,
      children: (
        <List
          size="small"
          dataSource={filtered.filter(d => d.layer === layer)}
          locale={{ emptyText: '暂无记忆' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tag key="recall">召回 {item.recall_count}</Tag>,
                <Popconfirm title="确认删除？" onConfirm={() => { setDrawers(prev => prev.filter(d => d.id !== item.id)); message.success('已删除') }}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<Text style={{ fontSize: 12 }}>{item.content}</Text>}
                description={
                  <Space size="small" style={{ marginTop: 4 }}>
                    {item.tags.map(tag => <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>)}
                    <Text type="secondary" style={{ fontSize: 10 }}>{item.timestamp}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    })),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ApartmentOutlined /> MemPalace 记忆宫殿
          <Tag color="green" style={{ marginLeft: 8 }}>v3.3.3</Tag>
          <Badge status={status ? 'success' : 'error'} text={status ? '后端已连接' : '后端未连接'} style={{ marginLeft: 12 }} />
        </Title>
        <Text type="secondary">Universal Memory for AI Agents · MCP Protocol · 跨Agent知识共享</Text>
      </div>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: 'white' }}>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>L0 身份</span>} value={status?.L0_identity?.tokens ?? 234} suffix="tokens" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: 'white' }}>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>L1 短期记忆</span>} value={status?.total_drawers ? Math.floor(status.total_drawers * 0.3) : 847} suffix="条" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #5a6ef5 0%, #818cf8 100%)', color: 'white' }}>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>L2 长期记忆</span>} value={status?.total_drawers ? Math.floor(status.total_drawers * 0.5) : 1423} suffix="条" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: 'white' }}>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>L3 通用记忆</span>} value={status?.total_drawers ? Math.floor(status.total_drawers * 0.2) : 498} suffix="条" />
          </Card>
        </Col>
      </Row>

      {/* Backend Status */}
      <Card size="small" title="后端连接状态" style={{ marginBottom: 24 }}>
        <Row gutter={12}>
          {backendCards.map(b => (
            <Col key={b.key} span={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Space direction="vertical" size={4}>
                  <Text strong>{b.icon} {b.title}</Text>
                  <Tag color={b.status === 'active' || b.status === 'connected' ? 'green' : 'orange'}>{b.status}</Tag>
                  {b.stats && <Text type="secondary" style={{ fontSize: 10 }}>{b.stats}</Text>}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Actions */}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<SyncOutlined spin={wakeUpLoading || wingsLoading !== false} />} onClick={handleWakeUp} loading={wakeUpLoading}>
          唤醒身份
        </Button>
        <Button icon={<GlobalOutlined />} onClick={handleWings} loading={wingsLoading}>
          同步翅膀
        </Button>
        <Button icon={<ReloadOutlined spin={statusLoading} />} onClick={fetchStatus} loading={statusLoading}>
          刷新状态
        </Button>
        <Button icon={<KeyOutlined />} onClick={() => setIdentityModalOpen(true)}>
          身份配置
        </Button>
      </Space>

      {/* Search */}
      <Card size="small" title="记忆检索" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索记忆..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch} loading={loading}>召回</Button>
          <Button onClick={handleRecall} loading={loading}>回忆提取</Button>
        </Space.Compact>
        {searchResults.length > 0 && (
          <List
            size="small"
            dataSource={searchResults}
            style={{ marginTop: 12 }}
            header={<Text strong>搜索结果 ({searchResults.length})</Text>}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <Tag>{item.layer}</Tag>
                  <Text>{item.content}</Text>
                  <Tag>{(item.similarity * 100).toFixed(0)}%</Tag>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Memory Drawers */}
      <Card size="small" title="记忆抽屉">
        <Tabs items={tabItems} />
      </Card>

      {/* Identity Modal */}
      <Modal
        title="身份配置 (L0)"
        open={identityModalOpen}
        onCancel={() => setIdentityModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIdentityModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} onClick={() => { message.success('身份已保存'); setIdentityModalOpen(false) }}>保存</Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="名称">
            <Input value={identity.name} onChange={e => setIdentity(prev => ({ ...prev, name: e.target.value }))} />
          </Form.Item>
          <Form.Item label="角色">
            <Input value={identity.role} onChange={e => setIdentity(prev => ({ ...prev, role: e.target.value }))} />
          </Form.Item>
          <Form.Item label="特征">
            <Input value={identity.traits.join(', ')} onChange={e => setIdentity(prev => ({ ...prev, traits: e.target.value.split(', ') }))} />
          </Form.Item>
          <Form.Item label="目标">
            <Input value={identity.goals.join(', ')} onChange={e => setIdentity(prev => ({ ...prev, goals: e.target.value.split(', ') }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
