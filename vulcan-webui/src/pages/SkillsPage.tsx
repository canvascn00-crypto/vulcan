import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, Input, Tabs,
  Modal, Form, Select, message, Spin, Badge, Drawer, Descriptions,
  Statistic, Progress, Tooltip, Empty, Popconfirm
} from 'antd'
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined,
  ReloadOutlined, ThunderboltOutlined, StarOutlined, ShopOutlined,
  CheckCircleOutlined, StopOutlined, ApiOutlined, ToolOutlined
} from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text, Paragraph } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface Skill {
  name: string
  description: string
  trigger_keywords: string[]
  trigger_patterns: string[]
  tools: string[]
  source: string          // vulcan | hermes | marketplace | github
  source_path: string | null
  trust_level: string    // builtin | trusted | community
  version: string
  author: string | null
  tags: string[]
  status: string         // active | disabled
  installed_at: string | null
  last_used: string | null
  use_count: number
  rating: number
  content?: string       // full SKILL.md when detail loaded
}

interface SkillStats {
  total: number
  by_source: Record<string, number>
  by_status: Record<string, number>
  by_trust: Record<string, number>
}

interface MarketplaceEntry {
  name: string
  description: string
  source: string
  identifier: string
  repo: string | null
  path: string | null
  trust_level: string
  version: string
  author: string | null
  tags: string[]
  rating: number
  install_count: number
}

// ─── Source / Trust badges ───────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  vulcan: 'blue',
  hermes: 'green',
  marketplace: 'purple',
  github: 'orange',
}

const TRUST_COLORS: Record<string, string> = {
  builtin: 'blue',
  trusted: 'green',
  community: 'orange',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  disabled: 'warning',
  outdated: 'error',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<SkillStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [drawerSkill, setDrawerSkill] = useState<Skill | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [marketplaceQuery, setMarketplaceQuery] = useState('')
  const [marketplaceResults, setMarketplaceResults] = useState<MarketplaceEntry[]>([])
  const [mpLoading, setMpLoading] = useState(false)

  // ── Load skills ──────────────────────────────────────────────────────────

  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await api.get<{ skills: Skill[]; _stats: SkillStats }>(`/api/skills/${q}`)
      setSkills(res.skills || [])
      setStats(res._stats || null)
    } catch {
      message.error('技能加载失败')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadSkills() }, [loadSkills])

  // ── Load stats ───────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<SkillStats>('/api/skills/stats').then(setStats).catch(() => {})
  }, [])

  // ── Load skill detail ─────────────────────────────────────────────────────

  const openDrawer = async (skill: Skill) => {
    setDrawerSkill(skill)
    setDrawerLoading(true)
    try {
      const detail = await api.get<Skill & { content?: string }>(`/api/skills/${skill.name}`)
      setDrawerSkill({ ...skill, ...detail, content: detail.content })
    } catch {
      message.error('加载技能详情失败')
    } finally {
      setDrawerLoading(false)
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleEnable = async (name: string) => {
    setActionLoading(name)
    try {
      await api.post(`/api/skills/${name}/enable`)
      setSkills(prev => prev.map(s => s.name === name ? { ...s, status: 'active' } : s))
      if (drawerSkill?.name === name) setDrawerSkill(prev => prev ? { ...prev, status: 'active' } : null)
      message.success(`${name} 已启用`)
    } catch { message.error('启用失败') }
    finally { setActionLoading(null) }
  }

  const handleDisable = async (name: string) => {
    setActionLoading(name)
    try {
      await api.post(`/api/skills/${name}/disable`)
      setSkills(prev => prev.map(s => s.name === name ? { ...s, status: 'disabled' } : s))
      if (drawerSkill?.name === name) setDrawerSkill(prev => prev ? { ...prev, status: 'disabled' } : null)
      message.success(`${name} 已禁用`)
    } catch { message.error('禁用失败') }
    finally { setActionLoading(null) }
  }

  const handleInstall = async (entry: MarketplaceEntry) => {
    setInstalling(entry.identifier)
    try {
      await api.post('/api/skills/install', { source: entry.source, identifier: entry.identifier })
      message.success(`${entry.name} 安装成功`)
      setMarketplaceOpen(false)
      loadSkills()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '安装失败')
    } finally { setInstalling(null) }
  }

  const handleUninstall = async (name: string) => {
    setActionLoading(name)
    try {
      await api.post(`/api/skills/${name}/uninstall`)
      setSkills(prev => prev.filter(s => s.name !== name))
      if (drawerSkill?.name === name) setDrawerSkill(null)
      message.success(`${name} 已卸载`)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '卸载失败')
    } finally { setActionLoading(null) }
  }

  const handleReload = async () => {
    try {
      await api.post('/api/skills/reload')
      message.success('技能库已刷新')
      loadSkills()
    } catch { message.error('刷新失败') }
  }

  // ── Marketplace search ────────────────────────────────────────────────────

  const searchMarketplace = async (q: string) => {
    setMpLoading(true)
    try {
      const res = await api.get<{ entries: MarketplaceEntry[] }>(`/api/skills/marketplace/search?q=${encodeURIComponent(q)}&limit=20`)
      setMarketplaceResults(res.entries || [])
    } catch {
      message.error(' marketplace 搜索失败')
    } finally { setMpLoading(false) }
  }

  useEffect(() => {
    if (marketplaceOpen && !marketplaceResults.length) {
      searchMarketplace('')
    }
  }, [marketplaceOpen])

  // ── Filter ────────────────────────────────────────────────────────────────

  const getSkillSource = (s: Skill): string => {
    if (s.status === 'disabled') return 'disabled'
    if (s.source === 'hermes') return 'hermes'
    if (s.source === 'vulcan') return 'vulcan'
    return 'marketplace'
  }

  const filtered = skills.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.includes(search) ||
      s.tags.some(t => t.includes(search))
    const matchTab = activeTab === 'all' ||
      (activeTab === 'active' && s.status === 'active') ||
      (activeTab === 'disabled' && s.status === 'disabled') ||
      (activeTab === 'hermes' && s.source === 'hermes') ||
      (activeTab === 'vulcan' && s.source === 'vulcan')
    return matchSearch && matchTab
  })

  const activeCount = skills.filter(s => s.status === 'active').length
  const disabledCount = skills.filter(s => s.status === 'disabled').length
  const hermesCount = skills.filter(s => s.source === 'hermes').length

  const tabItems = [
    { key: 'all', label: `全部 (${skills.length})` },
    { key: 'active', label: `✅ 已启用 (${activeCount})` },
    { key: 'disabled', label: `⛔ 已禁用 (${disabledCount})` },
    { key: 'hermes', label: `🔥 Hermes (${hermesCount})` },
    { key: 'vulcan', label: `⚡ Vulcan` },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>⚡ SkillForge</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            继承 Hermes {hermesCount} 个技能 · Vulcan {skills.filter(s => s.source === 'vulcan').length} 个
            {stats && <> · 共 {stats.total} 个</>}
          </Text>
        </div>
        <Space>
          <Tooltip title="刷新技能库">
            <Button icon={<ReloadOutlined />} onClick={handleReload}>刷新</Button>
          </Tooltip>
          <Button icon={<ShopOutlined />} type="primary" onClick={() => setMarketplaceOpen(true)}>
            浏览 Marketplace
          </Button>
        </Space>
      </div>

      {/* Stats row */}
      {stats && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>总计</Text>} value={stats.total} valueStyle={{ color: '#e5e7eb', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>Hermes</Text>} value={stats.by_source?.hermes || 0} valueStyle={{ color: '#22c55e', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>Vulcan</Text>} value={stats.by_source?.vulcan || 0} valueStyle={{ color: '#60a5fa', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>已启用</Text>} value={stats.by_status?.active || 0} valueStyle={{ color: '#22c55e', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>已禁用</Text>} value={stats.by_status?.disabled || 0} valueStyle={{ color: '#f59e0b', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
              <Statistic title={<Text style={{ color: '#9ca3af', fontSize: 11 }}>触发调用</Text>} value={skills.reduce((a, s) => a + s.use_count, 0)} valueStyle={{ color: '#a78bfa', fontSize: 22 }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Search + tabs */}
      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索技能名称、描述或标签..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
          allowClear
        />
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
        />
      </Space>

      {/* Skills grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map(s => (
            <Col xs={24} sm={12} md={8} lg={6} key={s.name}>
              <Card
                size="small"
                hoverable
                style={{
                  height: '100%',
                  background: '#1c1c28',
                  border: s.status === 'active' ? '1px solid #3b4ddb' : '1px solid #2a2a3e',
                  opacity: s.status === 'disabled' ? 0.7 : 1,
                }}
                bodyStyle={{ padding: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ color: '#e5e7eb', fontSize: 13, display: 'block' }} ellipsis={{ tooltip: s.name }}>
                      {s.name}
                    </Text>
                    <Space size={4} style={{ marginTop: 4 }}>
                      <Tag color={SOURCE_COLORS[s.source] || 'default'} style={{ fontSize: 9, margin: 0 }}>{s.source}</Tag>
                      <Tag color={TRUST_COLORS[s.trust_level] || 'default'} style={{ fontSize: 9, margin: 0 }}>{s.trust_level}</Tag>
                    </Space>
                  </div>
                  <Tag color={STATUS_COLORS[s.status] || 'default'} style={{ fontSize: 9 }}>{s.status}</Tag>
                </div>

                <Text type="secondary" style={{ fontSize: 11, display: 'block', height: 32, overflow: 'hidden' }} ellipsis={{ tooltip: s.description }}>
                  {s.description}
                </Text>

                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {s.tags.slice(0, 3).map(t => (
                    <Tag key={t} style={{ fontSize: 9, margin: 0 }}>{t}</Tag>
                  ))}
                  {s.tools.length > 0 && (
                    <Tooltip title={`需要工具: ${s.tools.join(', ')}`}>
                      <Tag style={{ fontSize: 9, margin: 0 }}><ToolOutlined /> {s.tools.length}</Tag>
                    </Tooltip>
                  )}
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    v{s.version} {s.use_count > 0 && `· ⚡${s.use_count}`}
                  </Text>
                  <Space size={2}>
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDrawer(s)} style={{ color: '#9ca3af' }} />
                    {s.status === 'active' ? (
                      <Button type="text" size="small" icon={<StopOutlined />} loading={actionLoading === s.name} onClick={() => handleDisable(s.name)} style={{ color: '#f59e0b' }} />
                    ) : (
                      <Button type="text" size="small" icon={<CheckCircleOutlined />} loading={actionLoading === s.name} onClick={() => handleEnable(s.name)} style={{ color: '#22c55e' }} />
                    )}
                    {s.source === 'vulcan' && (
                      <Popconfirm title="确认卸载？" onConfirm={() => handleUninstall(s.name)} okText="卸载" cancelText="取消">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={actionLoading === s.name} />
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {filtered.length === 0 && !loading && (
        <Empty description="没有找到匹配的技能" style={{ padding: 48 }} />
      )}

      {/* Skill detail drawer */}
      <Drawer
        title={drawerSkill?.name}
        placement="right"
        width={520}
        onClose={() => setDrawerSkill(null)}
        open={!!drawerSkill}
        extra={
          drawerSkill && (
            <Space>
              {drawerSkill.status === 'active' ? (
                <Button icon={<StopOutlined />} loading={actionLoading === drawerSkill.name} onClick={() => handleDisable(drawerSkill.name)}>
                  禁用
                </Button>
              ) : (
                <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading === drawerSkill.name} onClick={() => handleEnable(drawerSkill.name)}>
                  启用
                </Button>
              )}
            </Space>
          )
        }
      >
        {drawerSkill && (
          <Spin spinning={drawerLoading}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Descriptions column={2} size="small" style={{ background: '#1c1c28', borderRadius: 8, padding: 12 }}>
                <Descriptions.Item label="来源"><Tag color={SOURCE_COLORS[drawerSkill.source]}>{drawerSkill.source}</Tag></Descriptions.Item>
                <Descriptions.Item label="可信度"><Tag color={TRUST_COLORS[drawerSkill.trust_level]}>{drawerSkill.trust_level}</Tag></Descriptions.Item>
                <Descriptions.Item label="状态"><Tag color={STATUS_COLORS[drawerSkill.status]}>{drawerSkill.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="版本">v{drawerSkill.version}</Descriptions.Item>
                <Descriptions.Item label="作者">{drawerSkill.author || '-'}</Descriptions.Item>
                <Descriptions.Item label="调用次数">{drawerSkill.use_count}</Descriptions.Item>
              </Descriptions>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, color: '#e5e7eb' }}>描述</Text>
                <Paragraph style={{ color: '#9ca3af', margin: 0 }}>{drawerSkill.description}</Paragraph>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, color: '#e5e7eb' }}>标签</Text>
                <Space wrap>
                  {drawerSkill.tags.map(t => <Tag key={t}>{t}</Tag>)}
                  {(!drawerSkill.tags || drawerSkill.tags.length === 0) && <Text type="secondary">无</Text>}
                </Space>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, color: '#e5e7eb' }}>触发关键词</Text>
                <Space wrap>
                  {drawerSkill.trigger_keywords.map(t => <Tag key={t} color="blue">{t}</Tag>)}
                  {(!drawerSkill.trigger_keywords || drawerSkill.trigger_keywords.length === 0) && <Text type="secondary">无</Text>}
                </Space>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, color: '#e5e7eb' }}>需要的工具</Text>
                <Space wrap>
                  {drawerSkill.tools.map(t => <Tag key={t} icon={<ApiOutlined />}>{t}</Tag>)}
                  {(!drawerSkill.tools || drawerSkill.tools.length === 0) && <Text type="secondary">无</Text>}
                </Space>
              </div>

              {drawerSkill.content && (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: '#e5e7eb' }}>SKILL.md 内容</Text>
                  <Card size="small" style={{ background: '#0d1117', maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: '#c9d1d9', margin: 0, fontFamily: 'Monaco, Menlo, monospace' }}>
                      {drawerSkill.content}
                    </pre>
                  </Card>
                </div>
              )}
            </Space>
          </Spin>
        )}
      </Drawer>

      {/* Marketplace modal */}
      <Modal
        title="🛒 Skill Marketplace"
        open={marketplaceOpen}
        onCancel={() => setMarketplaceOpen(false)}
        footer={null}
        width={720}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索 Marketplace 技能..."
            value={marketplaceQuery}
            onChange={e => setMarketplaceQuery(e.target.value)}
            onPressEnter={() => searchMarketplace(marketplaceQuery)}
            allowClear
          />
          <Spin spinning={mpLoading}>
            <div style={{ maxHeight: 480, overflow: 'auto' }}>
              {marketplaceResults.length === 0 ? (
                <Empty description="Marketplace 暂不可用（离线模式），请从本地技能库选择" style={{ padding: 32 }} />
              ) : (
                <Row gutter={[12, 12]}>
                  {marketplaceResults.map(entry => (
                    <Col span={24} key={entry.identifier}>
                      <Card size="small" style={{ background: '#1c1c28', border: '1px solid #2a2a3e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <Space>
                              <Text strong style={{ color: '#e5e7eb' }}>{entry.name}</Text>
                              <Tag color={SOURCE_COLORS[entry.source] || 'default'} style={{ fontSize: 9 }}>{entry.source}</Tag>
                              <Tag color={TRUST_COLORS[entry.trust_level] || 'default'} style={{ fontSize: 9 }}>{entry.trust_level}</Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                              {entry.description}
                            </Text>
                            <Space style={{ marginTop: 6 }}>
                              {entry.tags.map(t => <Tag key={t} style={{ fontSize: 9 }}>{t}</Tag>)}
                              {entry.rating > 0 && <Text type="secondary" style={{ fontSize: 11 }}>⭐ {entry.rating.toFixed(1)}</Text>}
                              {entry.install_count > 0 && <Text type="secondary" style={{ fontSize: 11 }}>📥 {entry.install_count}</Text>}
                            </Space>
                          </div>
                          <Button
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            loading={installing === entry.identifier}
                            onClick={() => handleInstall(entry)}
                          >
                            安装
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </Spin>
        </Space>
      </Modal>
    </div>
  )
}
