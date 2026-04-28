import { useState, useEffect } from 'react'
import { Typography, Input, Select, Button, Spin, Badge, Tooltip, message } from 'antd'
import {
  SearchOutlined, ShopOutlined, ReloadOutlined, SettingOutlined,
  ThunderboltOutlined, StarOutlined, CodeOutlined, ApiOutlined,
  ToolOutlined, SyncOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface Skill {
  name: string
  description: string
  source: string
  source_path: string | null
  trust_level: string
  version: string
  author: string | null
  tags: string[]
  status: string
  installed_at: string | null
  last_used: string | null
  use_count: number
  rating: number
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
}

const ICON_BG_COLORS = ['#7065F3', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6']

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INSTALLED_SKILLS: Skill[] = [
  { name: 'Hermes Core', description: '核心助手技能，提供基础对话和推理能力', source: 'hermes', source_path: null, trust_level: 'builtin', version: '2.1.0', author: 'System', tags: ['core', 'assistant'], status: 'active', installed_at: '2026-01-15', last_used: '2026-04-28', use_count: 1247, rating: 5.0 },
  { name: 'Web Search', description: '互联网搜索技能，实时获取最新信息', source: 'vulcan', source_path: '/skills/web_search', trust_level: 'trusted', version: '1.5.2', author: 'Vulcan Team', tags: ['search', 'web'], status: 'active', installed_at: '2026-02-20', last_used: '2026-04-28', use_count: 892, rating: 4.8 },
  { name: 'Code Interpreter', description: '代码执行技能，支持 Python/JS 等多语言', source: 'vulcan', source_path: '/skills/code_interpreter', trust_level: 'trusted', version: '1.3.0', author: 'Vulcan Team', tags: ['code', 'execution'], status: 'active', installed_at: '2026-03-01', last_used: '2026-04-27', use_count: 456, rating: 4.6 },
  { name: 'Image Gen', description: 'AI 图像生成技能，支持多种风格', source: 'marketplace', source_path: null, trust_level: 'community', version: '0.9.1', author: 'Community', tags: ['image', 'generation'], status: 'active', installed_at: '2026-03-15', last_used: '2026-04-25', use_count: 234, rating: 4.3 },
  { name: 'Data Analysis', description: '数据分析和可视化技能', source: 'vulcan', source_path: '/skills/data_analysis', trust_level: 'trusted', version: '1.0.5', author: 'Vulcan Team', tags: ['data', 'analytics'], status: 'active', installed_at: '2026-04-01', last_used: '2026-04-26', use_count: 178, rating: 4.7 },
  { name: 'Memory', description: '长期记忆存储和检索技能', source: 'hermes', source_path: null, trust_level: 'builtin', version: '1.8.0', author: 'System', tags: ['memory', 'storage'], status: 'active', installed_at: '2026-01-10', last_used: '2026-04-28', use_count: 3102, rating: 4.9 },
]

const MOCK_MARKETPLACE_SKILLS: MarketplaceEntry[] = [
  { name: 'Advanced RAG', description: '高级检索增强生成，支持多跳推理', source: 'marketplace', identifier: 'adv-rag', repo: 'vulcan-marketplace', path: null, trust_level: 'trusted', version: '2.0.0', author: 'Research Lab', tags: ['rag', 'retrieval'], rating: 4.9, install_count: 2847 },
  { name: 'Voice Synthesis', description: '语音合成技能，支持多种音色', source: 'marketplace', identifier: 'voice-synth', repo: 'vulcan-marketplace', path: null, trust_level: 'community', version: '1.2.0', author: 'Audio Team', tags: ['voice', 'audio'], rating: 4.5, install_count: 1234 },
  { name: 'Document Parser', description: 'PDF/Word 文档解析技能', source: 'marketplace', identifier: 'doc-parser', repo: 'vulcan-marketplace', path: null, trust_level: 'trusted', version: '1.1.0', author: 'DocTools', tags: ['document', 'parser'], rating: 4.7, install_count: 3456 },
  { name: 'API Connector', description: '通用 API 连接器技能', source: 'marketplace', identifier: 'api-connector', repo: 'vulcan-marketplace', path: null, trust_level: 'community', version: '0.8.5', author: 'DevOps Team', tags: ['api', 'integration'], rating: 4.2, install_count: 892 },
  { name: 'Scheduler', description: '任务调度和定时执行技能', source: 'marketplace', identifier: 'scheduler', repo: 'vulcan-marketplace', path: null, trust_level: 'trusted', version: '1.5.0', author: 'System Team', tags: ['scheduler', 'tasks'], rating: 4.8, install_count: 2100 },
  { name: 'Translator', description: '多语言翻译技能，支持 50+ 语言', source: 'marketplace', identifier: 'translator', repo: 'vulcan-marketplace', path: null, trust_level: 'community', version: '2.3.1', author: 'i18n Team', tags: ['translation', 'i18n'], rating: 4.6, install_count: 5678 },
]

const CATEGORIES = [
  { label: '全部', value: 'all', icon: <ApiOutlined /> },
  { label: '核心', value: 'core', icon: <ThunderboltOutlined /> },
  { label: '搜索', value: 'search', icon: <SearchOutlined /> },
  { label: '代码', value: 'code', icon: <CodeOutlined /> },
  { label: '数据', value: 'data', icon: <ToolOutlined /> },
  { label: '图像', value: 'image', icon: <StarOutlined /> },
  { label: '语音', value: 'voice', icon: <ApiOutlined /> },
  { label: '集成', value: 'integration', icon: <SyncOutlined /> },
]

const TRUST_OPTIONS = [
  { label: '全部等级', value: 'all' },
  { label: '内置', value: 'builtin' },
  { label: '可信', value: 'trusted' },
  { label: '社区', value: 'community' },
]

const SOURCE_OPTIONS = [
  { label: '全部来源', value: 'all' },
  { label: 'Hermes', value: 'hermes' },
  { label: '本地', value: 'vulcan' },
  { label: 'Marketplace', value: 'marketplace' },
]

// ─── Skill Card ───────────────────────────────────────────────────────────────

interface SkillCardProps {
  skill: Skill
  onConfig: (name: string) => void
  index: number
}

function SkillCard({ skill, onConfig, index }: SkillCardProps) {
  const iconBg = ICON_BG_COLORS[index % ICON_BG_COLORS.length]

  const trustColor = skill.trust_level === 'builtin' ? '#3B82F6' : skill.trust_level === 'trusted' ? '#22C55E' : '#F59E0B'
  const statusDot = skill.status === 'active' ? '#22C55E' : '#6B7280'

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.hover }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.surface }}
    >
      {/* Icon + Status Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ThunderboltOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot }} />
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{skill.status === 'active' ? '运行中' : '已禁用'}</Text>
        </div>
      </div>

      {/* Name */}
      <Text style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, display: 'block', marginBottom: 8 }}>
        {skill.name}
      </Text>

      {/* Description */}
      <Text style={{ fontSize: 13, color: colors.textSecondary, display: 'block', marginBottom: 16, lineHeight: 1.5, minHeight: 40, overflow: 'hidden' }}>
        {skill.description}
      </Text>

      {/* Tags Row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 6,
          background: `${trustColor}20`,
          color: trustColor,
          border: `1px solid ${trustColor}40`,
        }}>
          {skill.trust_level === 'builtin' ? '内置' : skill.trust_level === 'trusted' ? '可信' : '社区'}
        </span>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 6,
          background: `${colors.accent}20`,
          color: colors.accent,
          border: `1px solid ${colors.accent}40`,
        }}>
          v{skill.version}
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          使用 {skill.use_count} 次
        </Text>
        <Button
          size="small"
          icon={<SettingOutlined />}
          onClick={(e) => { e.stopPropagation(); onConfig(skill.name) }}
          style={{
            background: colors.hover,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          配置
        </Button>
      </div>
    </div>
  )
}

// ─── Marketplace Card ─────────────────────────────────────────────────────────

interface MarketplaceCardProps {
  skill: MarketplaceEntry
  index: number
}

function MarketplaceCard({ skill, index }: MarketplaceCardProps) {
  const iconBg = ICON_BG_COLORS[(index + 2) % ICON_BG_COLORS.length]
  const trustColor = skill.trust_level === 'trusted' ? '#22C55E' : '#F59E0B'

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.hover }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.surface }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShopOutlined style={{ fontSize: 22, color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{skill.name}</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <StarOutlined style={{ fontSize: 11, color: '#F59E0B' }} />
              <Text style={{ fontSize: 11, color: '#F59E0B' }}>{skill.rating}</Text>
            </div>
          </div>
          <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 8 }}>
            {skill.description}
          </Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: `${trustColor}20`,
              color: trustColor,
            }}>
              {skill.trust_level === 'trusted' ? '可信' : '社区'}
            </span>
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: colors.hover,
              color: colors.textSecondary,
            }}>
              v{skill.version}
            </span>
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: colors.hover,
              color: colors.textSecondary,
            }}>
              {skill.install_count.toLocaleString()} 安装
            </span>
          </div>
        </div>
      </div>
      <Button
        type="primary"
        size="small"
        icon={<ApiOutlined />}
        block
        style={{
          marginTop: 16,
          background: colors.accent,
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          height: 32,
        }}
        onClick={() => message.success(`正在安装 ${skill.name}...`)}
      >
        安装
      </Button>
    </div>
  )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string
  value: number | string
  subtitle: string
  color: string
}

function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      flex: 1,
      minWidth: 0,
    }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 32, fontWeight: 700, color, display: 'block', marginBottom: 4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [trustLevel, setTrustLevel] = useState('all')
  const [skills] = useState<Skill[]>(MOCK_INSTALLED_SKILLS)
  const [marketplace] = useState<MarketplaceEntry[]>(MOCK_MARKETPLACE_SKILLS)

  // Filter installed skills
  const filteredSkills = skills.filter(skill => {
    const matchSearch = !searchQuery ||
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = category === 'all' || skill.tags.some(t => t.includes(category))
    const matchTrust = trustLevel === 'all' || skill.trust_level === trustLevel
    return matchSearch && matchCategory && matchTrust
  })

  const handleReload = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    message.success('技能库已刷新')
  }

  const handleConfig = (name: string) => {
    message.info(`打开 ${name} 配置页面`)
  }

  const installedCount = skills.filter(s => s.status === 'active').length
  const localCount = skills.filter(s => s.source === 'vulcan').length

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 700, fontSize: 28 }}>
              技能市场
            </Title>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4, display: 'block' }}>
              发现、安装和管理你的 AI 技能
            </Text>
          </div>
          <Button
            type="primary"
            icon={<ShopOutlined />}
            style={{
              background: colors.accent,
              border: 'none',
              borderRadius: 8,
              height: 40,
              paddingInline: 24,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            浏览 SkillHub
          </Button>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: colors.textSecondary }} />}
            placeholder="搜索技能名称或描述..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{
              flex: 1,
              minWidth: 240,
              maxWidth: 400,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              height: 40,
            }}
          />
          <Select
            value={category}
            onChange={setCategory}
            style={{ minWidth: 140 }}
            dropdownStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
            options={CATEGORIES.map(c => ({ value: c.value, label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{c.icon} {c.label}</span> }))}
          />
          <Select
            value={trustLevel}
            onChange={setTrustLevel}
            style={{ minWidth: 120 }}
            dropdownStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
            options={TRUST_OPTIONS as { label: string; value: string }[]}
          />
          <Tooltip title="刷新技能库">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleReload}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                height: 40,
                width: 40,
                padding: 0,
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <StatsCard title="已安装" value={installedCount} subtitle={`共 ${skills.length} 个技能`} color={colors.accent} />
        <StatsCard title="本地技能" value={localCount} subtitle="来自 Vulcan 本地库" color="#3B82F6" />
        <StatsCard title="SkillHub" value={marketplace.length} subtitle="可从市场安装" color="#22C55E" />
      </div>

      {/* Installed Skills Section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={4} style={{ margin: 0, color: colors.textPrimary, fontSize: 18, fontWeight: 600 }}>
            已安装技能
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {filteredSkills.length} 个技能
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}>
            {filteredSkills.map((skill, index) => (
              <SkillCard key={skill.name} skill={skill} onConfig={handleConfig} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Skill Categories */}
      <div style={{ marginBottom: 40 }}>
        <Title level={4} style={{ margin: 0, color: colors.textPrimary, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          技能分类
        </Title>
        <div style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
        }}>
          {CATEGORIES.map(cat => (
            <div
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: category === cat.value ? colors.accent : colors.surface,
                border: `1px solid ${category === cat.value ? colors.accent : colors.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: category === cat.value ? '#fff' : colors.textSecondary, fontSize: 16 }}>
                {cat.icon}
              </span>
              <Text style={{
                color: category === cat.value ? '#fff' : colors.textSecondary,
                fontSize: 13,
                fontWeight: category === cat.value ? 500 : 400,
              }}>
                {cat.label}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Skills from SkillHub */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0, color: colors.textPrimary, fontSize: 18, fontWeight: 600 }}>
              特色技能
            </Title>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, display: 'block' }}>
              来自 SkillHub 的热门推荐
            </Text>
          </div>
          <Button
            type="text"
            icon={<ShopOutlined />}
            style={{ color: colors.accent, fontSize: 13 }}
          >
            查看全部
          </Button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {marketplace.map((skill, index) => (
            <MarketplaceCard key={skill.identifier} skill={skill} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
