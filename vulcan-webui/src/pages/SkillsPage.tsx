import { useState } from 'react'
import { Typography, Card, Row, Col, Tag, Button, Space, Input, Tabs, Modal, Form, Select, message, Spin, Badge, List, Drawer, Descriptions } from 'antd'
import { PlusOutlined, SearchOutlined, ThunderboltOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined, RocketOutlined, CodeOutlined, GlobalOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// ─── Skill type ───────────────────────────────────────────────────────────────

interface Skill {
  id: string
  name: string
  description: string
  category: 'productivity' | 'devops' | 'social' | 'mlops' | 'creative' | 'research' | 'other'
  author: string
  version: string
  installed: boolean
  tags: string[]
  triggers: string[]
  commands?: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  productivity: 'blue',
  devops: 'purple',
  social: 'green',
  mlops: 'orange',
  creative: 'magenta',
  research: 'cyan',
  other: 'default',
}

// ─── Built-in skills (inherited from Hermes) ──────────────────────────────────

const BUILT_IN_SKILLS: Skill[] = [
  {
    id: 'wechat-mp-article-pipeline',
    name: 'wechat-mp-article-pipeline',
    description: '一站式公众号爆款文章流水线 — 丢链接给我，自动完成：内容抓取 → AI提炼金句 → 生成封面图卡+内容配图卡 → wenyan-mcp 发布草稿箱',
    category: 'social',
    author: 'hermes',
    version: '1.0.0',
    installed: true,
    tags: ['微信公众号', 'AI', '文章'],
    triggers: ['公众号', '文章发布', '爆款'],
    commands: ['skillhub wechat-mp-article-pipeline'],
  },
  {
    id: 'email-client',
    name: 'email-client',
    description: '邮件收发技能，支持 Gmail 和 QQ 邮箱的 IMAP/SMTP 收发。触发场景：查邮件、收邮件、发邮件、搜索...',
    category: 'productivity',
    author: 'hermes',
    version: '1.0.0',
    installed: true,
    tags: ['email', 'gmail', 'qq'],
    triggers: ['邮件', '发邮件', '查邮件'],
  },
  {
    id: 'article-card-gen',
    name: 'article-card-gen',
    description: '从文章内容生成精美图卡，用于公众号/小红书配图。支持多种风格（渐变、孟菲斯、极客、毛玻璃等）',
    category: 'creative',
    author: 'hermes',
    version: '1.0.0',
    installed: true,
    tags: ['配图', '公众号', '小红书'],
    triggers: ['配图', '图卡', '公众号封面'],
  },
  {
    id: 'wechat-mp-rss-monitor',
    name: 'wechat-mp-rss-monitor',
    description: '微信公众号（订阅号）舆情/资讯监控 — 通过 RSS 源监控 + 定时推送微信',
    category: 'social',
    author: 'hermes',
    version: '1.0.0',
    installed: false,
    tags: ['微信公众号', 'RSS', '监控'],
    triggers: ['监控', '舆情', 'RSS'],
  },
  {
    id: 'skill-recommendations',
    name: 'skill-recommendations',
    description: '搜索并推荐实用技能，支持从 skillhub 搜索、浏览精选列表、一键安装',
    category: 'productivity',
    author: 'hermes',
    version: '1.0.0',
    installed: false,
    tags: ['skill', '推荐'],
    triggers: ['技能推荐', 'skillhub'],
  },
  {
    id: 'llama-cpp',
    name: 'llama-cpp',
    description: 'llama.cpp local GGUF inference + HF Hub model discovery',
    category: 'mlops',
    author: 'hermes',
    version: '1.0.0',
    installed: false,
    tags: ['llama.cpp', 'GGUF', 'inference'],
    triggers: ['本地推理', 'GGUF', 'llama'],
  },
  {
    id: 'jupyter-live-kernel',
    name: 'jupyter-live-kernel',
    description: 'Use a live Jupyter kernel for stateful, iterative Python...',
    category: 'productivity',
    author: 'hermes',
    version: '1.0.0',
    installed: false,
    tags: ['jupyter', 'python', '数据分析'],
    triggers: ['jupyter', '数据分析', 'python'],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(BUILT_IN_SKILLS)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [drawerSkill, setDrawerSkill] = useState<Skill | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)

  const filtered = skills.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.includes(search) ||
      s.tags.some((t) => t.includes(search))
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'installed' && s.installed) ||
      (activeTab === 'available' && !s.installed) ||
      s.category === activeTab
    return matchSearch && matchTab
  })

  const handleInstall = async (skill: Skill) => {
    setInstalling(skill.id)
    // Simulate install (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200))
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, installed: true } : s))
    )
    setInstalling(null)
    message.success(`✅ ${skill.name} 安装成功`)
  }

  const handleUninstall = (skill: Skill) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, installed: false } : s))
    )
    message.success(`${skill.name} 已卸载`)
  }

  const tabItems = [
    { key: 'all', label: `全部 (${skills.length})` },
    { key: 'installed', label: `已安装 (${skills.filter((s) => s.installed).length})` },
    { key: 'available', label: `可安装 (${skills.filter((s) => !s.installed).length})` },
    { key: 'productivity', label: '🛠️ 生产力' },
    { key: 'devops', label: '⚙️ DevOps' },
    { key: 'social', label: '💬 社交' },
    { key: 'mlops', label: '🤖 MLOps' },
    { key: 'creative', label: '🎨 创意' },
    { key: 'research', label: '🔬 研究' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>🛠️ 技能中心</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            继承 Hermes {skills.length} 个技能，支持 skillhub 安装更多
          </Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => message.info('SkillHub 浏览器开发中')}>
            浏览 SkillHub
          </Button>
        </Space>
      </div>

      {/* Search + filter */}
      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索技能名称、描述或标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          style={{ width: '100%' }}
        />
      </Space>

      {/* Skills grid */}
      <Row gutter={[16, 16]}>
        {filtered.map((skill) => (
          <Col xs={24} sm={12} md={8} lg={6} key={skill.id}>
            <Card
              size="small"
              hoverable
              style={{
                height: '100%',
                background: '#1c1c28',
                border: skill.installed ? '1px solid #5a6ef5' : '1px solid #2a2a3e',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Badge
                  status={skill.installed ? 'success' : 'default'}
                  text={
                    <Text strong style={{ color: '#e5e7eb', fontSize: 14 }}>
                      {skill.name}
                    </Text>
                  }
                />
                <Tag color={CATEGORY_COLORS[skill.category]} style={{ fontSize: 10 }}>
                  {skill.category}
                </Tag>
              </div>

              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginTop: 8, height: 40, overflow: 'hidden' }}
              >
                {skill.description}
              </Text>

              <div style={{ marginTop: 10 }}>
                {skill.tags.slice(0, 3).map((t) => (
                  <Tag key={t} style={{ fontSize: 10, marginBottom: 4 }}>{t}</Tag>
                ))}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  v{skill.version} · {skill.author}
                </Text>
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setDrawerSkill(skill)}
                  />
                  {skill.installed ? (
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleUninstall(skill)}
                    />
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={installing === skill.id}
                      onClick={() => handleInstall(skill)}
                    >
                      安装
                    </Button>
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Text type="secondary">没有找到匹配的技能</Text>
        </div>
      )}

      {/* Skill detail drawer */}
      <Drawer
        title={drawerSkill?.name}
        placement="right"
        width={480}
        onClose={() => setDrawerSkill(null)}
        open={!!drawerSkill}
        extra={
          drawerSkill?.installed ? (
            <Tag color="green">已安装</Tag>
          ) : (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={installing === drawerSkill?.id}
              onClick={() => drawerSkill && handleInstall(drawerSkill)}
            >
              安装
            </Button>
          )
        }
      >
        {drawerSkill && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="描述">{drawerSkill.description}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={CATEGORY_COLORS[drawerSkill.category]}>{drawerSkill.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="作者">{drawerSkill.author}</Descriptions.Item>
              <Descriptions.Item label="版本">v{drawerSkill.version}</Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>标签</Text>
              <Space wrap>
                {drawerSkill.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>触发词</Text>
              <Space wrap>
                {drawerSkill.triggers.map((t) => <Tag key={t}>{t}</Tag>)}
              </Space>
            </div>

            {drawerSkill.commands && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>命令</Text>
                {drawerSkill.commands.map((cmd) => (
                  <div key={cmd} style={{ background: '#1c1c28', padding: '6px 10px', borderRadius: 4, marginBottom: 4, fontFamily: 'monospace', fontSize: 13 }}>
                    {cmd}
                  </div>
                ))}
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  )
}
