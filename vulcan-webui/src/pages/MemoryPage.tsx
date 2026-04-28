import { useState } from 'react'
import { Typography, Card, Row, Col, Tag, Space, Button, Statistic, List, Input, message, Tabs, Popconfirm } from 'antd'
import { ThunderboltOutlined, DatabaseOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, LockOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemoryEntry {
  id: string
  layer: 'ephemeral' | 'short-term' | 'long-term'
  content: string
  timestamp: string
  importance?: number
  recall_count?: number
}

interface MemoryStats {
  ephemeral: number
  shortTerm: number
  longTerm: number
  total: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATS: MemoryStats = {
  ephemeral: 12,
  shortTerm: 847,
  longTerm: 3421,
  total: 4280,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats>(MOCK_STATS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState<MemoryEntry[]>([
    { id: '1', layer: 'long-term', content: '用户偏好：微信会话直接操作，简短回复，不需要多余解释', timestamp: '2026-04-28T10:00:00Z', importance: 5, recall_count: 42 },
    { id: '2', layer: 'long-term', content: 'Vulcan 全局指令系统已内置，支持 /命令 触发（查看 commands 页）', timestamp: '2026-04-28T09:30:00Z', importance: 5, recall_count: 28 },
    { id: '3', layer: 'short-term', content: '当前 VPN provider: rioLU/riolu01.link，df.dawnloadai.com:8443 地府GLM', timestamp: '2026-04-28T14:00:00Z', importance: 3, recall_count: 5 },
    { id: '4', layer: 'short-term', content: 'Polymarket Bot 项目在 120.48.14.185:8099，ETH链USDC跨链Polygon问题未解决', timestamp: '2026-04-28T15:00:00Z', importance: 2, recall_count: 2 },
    { id: '5', layer: 'ephemeral', content: '当前会话：Vulcan Phase 3 WebUI 开发中', timestamp: '2026-04-28T18:00:00Z', importance: 1, recall_count: 1 },
  ])

  const layerConfig = {
    ephemeral: { label: '⚡ 瞬时记忆', color: '#f59e0b', desc: 'Redis · 会话级 · 自动过期', icon: <ThunderboltOutlined /> },
    'short-term': { label: '🔎 短期记忆', color: '#5a6ef5', desc: 'ChromaDB · 向量检索 · 跨会话', icon: <SearchOutlined /> },
    'long-term': { label: '🧬 长期记忆', color: '#10b981', desc: 'PostgreSQL · 知识图谱 + SOUL.md · 永久', icon: <DatabaseOutlined /> },
  }

  const filtered = entries.filter((e) =>
    !search || e.content.includes(search)
  )

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    message.success('已删除')
  }

  const handleClearLayer = (layer: string) => {
    setEntries((prev) => prev.filter((e) => e.layer !== layer))
    message.success(`已清空${layerConfig[layer as keyof typeof layerConfig]?.label}`)
  }

  const statCards = [
    { ...layerConfig.ephemeral, value: stats.ephemeral, suffix: '条' },
    { ...layerConfig['short-term'], value: stats.shortTerm, suffix: '条' },
    { ...layerConfig['long-term'], value: stats.longTerm, suffix: '条' },
  ]

  const tabItems = [
    {
      key: 'all',
      label: `全部 (${entries.length})`,
      children: (
        <List
          size="small"
          dataSource={filtered}
          renderItem={(item) => {
            const lc = layerConfig[item.layer]
            return (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="确认删除这条记忆？"
                    onConfirm={() => handleDelete(item.id)}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<span style={{ fontSize: 18 }}>{lc.icon}</span>}
                  title={
                    <Space>
                      <Tag color={lc.color}>{lc.label}</Tag>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.timestamp}</Text>
                      {item.recall_count !== undefined && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          被访问 {item.recall_count} 次
                        </Text>
                      )}
                    </Space>
                  }
                  description={
                    <Text style={{ color: '#d1d5db' }}>{item.content}</Text>
                  }
                />
              </List.Item>
            )
          }}
        />
      ),
    },
    ...(['ephemeral', 'short-term', 'long-term'] as const).map((layer) => ({
      key: layer,
      label: layerConfig[layer].label,
      children: (
        <List
          size="small"
          dataSource={filtered.filter((e) => e.layer === layer)}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title={`确认清空${layerConfig[layer].label}？`}
                  onConfirm={() => handleDelete(item.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={layerConfig[layer].color}>{item.timestamp}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      访问 {item.recall_count ?? 0} 次
                    </Text>
                  </Space>
                }
                description={<Text style={{ color: '#d1d5db' }}>{item.content}</Text>}
              />
            </List.Item>
          )}
        />
      ),
    })),
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>🧠 记忆库</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            三层记忆 · 瞬时 → 短期（向量）→ 长期（SOUL.md）
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => message.info('刷新开发中')}>
          刷新
        </Button>
      </div>

      {/* Stats cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={24} sm={8} key={s.label}>
            <Card
              size="small"
              style={{ background: '#1c1c28', border: `1px solid ${s.color}30` }}
              bodyStyle={{ display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ fontSize: 32, color: s.color }}>{s.icon}</div>
              <div>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>}
                  value={s.value}
                  suffix={s.suffix}
                  valueStyle={{ fontSize: 24, color: s.color }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{s.desc}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Layer info cards */}
      <Row gutter={12} style={{ marginBottom: 24 }}>
        {(['ephemeral', 'short-term', 'long-term'] as const).map((layer) => {
          const lc = layerConfig[layer]
          return (
            <Col xs={24} md={8} key={layer}>
              <Card size="small" style={{ background: '#16162a', border: `1px solid ${lc.color}40` }}>
                <Space direction="vertical" size={4}>
                  <Space>
                    <span style={{ color: lc.color, fontSize: 16 }}>{lc.icon}</span>
                    <Text strong style={{ color: '#e5e7eb' }}>{lc.label}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>{lc.desc}</Text>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleClearLayer(layer)}
                  >
                    清空此层
                  </Button>
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* Search */}
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索记忆内容..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 16 }}
      />

      {/* Memory entries */}
      <Card style={{ background: '#1c1c28' }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
