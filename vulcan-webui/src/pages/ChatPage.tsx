import { useState, useEffect, useRef } from 'react'
import { Input, Button, Avatar, Dropdown, Select, Typography, Space, Empty } from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PlusOutlined,
  SettingOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { api } from '@/services/api'

const { TextArea } = Input
const { Title, Text } = Typography

// Color tokens - Claude style
const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  date: Date
  messageCount: number
  messages: Message[]
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    title: '数据分析任务',
    date: new Date(Date.now() - 2 * 3600000),
    messageCount: 12,
    messages: [
      {
        id: '1-1',
        role: 'assistant',
        content: '好的，我将帮您分析这份数据。请上传数据文件或提供数据源信息。',
        timestamp: new Date(Date.now() - 2 * 3600000),
      },
      {
        id: '1-2',
        role: 'user',
        content: '分析一下这个月的销售数据',
        timestamp: new Date(Date.now() - 1.9 * 3600000),
      },
      {
        id: '1-3',
        role: 'assistant',
        content: '我已经分析了本月销售数据。本月总销售额为 ¥1,258,000，环比增长 15.3%。各品类表现：电子产品增长 22%，服装类增长 8%，食品类下降 3%。',
        timestamp: new Date(Date.now() - 1.8 * 3600000),
      },
    ],
  },
  {
    id: '2',
    title: 'API 集成咨询',
    date: new Date(Date.now() - 24 * 3600000),
    messageCount: 8,
    messages: [
      {
        id: '2-1',
        role: 'assistant',
        content: '您好，我是 Vulcan 助手。请问您需要集成哪些 API？',
        timestamp: new Date(Date.now() - 24 * 3600000),
      },
      {
        id: '2-2',
        role: 'user',
        content: '我想集成微信支付 API',
        timestamp: new Date(Date.now() - 23.5 * 3600000),
      },
    ],
  },
  {
    id: '3',
    title: '系统配置讨论',
    date: new Date(Date.now() - 3 * 24 * 3600000),
    messageCount: 5,
    messages: [
      {
        id: '3-1',
        role: 'assistant',
        content: '关于系统配置，我建议启用缓存机制以提升性能。',
        timestamp: new Date(Date.now() - 3 * 24 * 3600000),
      },
    ],
  },
  {
    id: '4',
    title: '新项目规划',
    date: new Date(Date.now() - 5 * 24 * 3600000),
    messageCount: 15,
    messages: [],
  },
]

const models = [
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'deepseek-v3', label: 'DeepSeek V3' },
]

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)

  useEffect(() => {
    if (selectedConversation) {
      setMessages(selectedConversation.messages)
    } else {
      setMessages([])
    }
  }, [selectedConversationId, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 3600000))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: `new-${Date.now()}`,
      title: '新对话',
      date: new Date(),
      messageCount: 0,
      messages: [
        {
          id: `${Date.now()}-welcome`,
          role: 'assistant',
          content: '您好！我是 Vulcan 助手。有什么我可以帮您的吗？',
          timestamp: new Date(),
        },
      ],
    }
    setConversations((prev) => [newConversation, ...prev])
    setSelectedConversationId(newConversation.id)
    setMessages(newConversation.messages)
  }

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Update conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? { ...c, messageCount: c.messageCount + 1 }
          : c
      )
    )

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '我正在处理您的请求，请稍候...',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (selectedConversationId === id) {
      setSelectedConversationId(null)
      setMessages([])
    }
  }

  const getConversationActions = (convId: string, e: React.MouseEvent) => ({
    items: [
      { key: 'rename', label: '重命名', icon: <EditOutlined /> },
      { key: 'duplicate', label: '复制', icon: <CopyOutlined /> },
      { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') {
        handleDeleteConversation(convId, e)
      }
    },
  })

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
  }

  // Empty state
  if (!selectedConversationId) {
    return (
      <div
        style={{
          height: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <RobotOutlined style={{ fontSize: 36, color: colors.accent }} />
          </div>
          <Title level={3} style={{ color: colors.textPrimary, margin: '0 0 8px 0' }}>
            Vulcan 对话
          </Title>
          <Text style={{ color: colors.textSecondary }}>
            选择一个对话或开始新对话
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg }}>
      {/* Left Panel - Conversation History */}
      <div
        style={{
          width: 280,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
        }}
      >
        {/* Header */}
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="large"
            onClick={handleNewChat}
            style={{
              background: colors.accent,
              border: 'none',
              borderRadius: 10,
              height: 44,
            }}
          >
            新对话
          </Button>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              style={{
                padding: '12px 14px',
                marginBottom: 4,
                borderRadius: 10,
                cursor: 'pointer',
                background: selectedConversationId === conv.id ? colors.hover : 'transparent',
                border: selectedConversationId === conv.id ? `1px solid ${colors.border}` : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: selectedConversationId === conv.id ? colors.textPrimary : colors.textSecondary,
                      fontSize: 14,
                      fontWeight: 500,
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {conv.title}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {formatDate(conv.date)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      · {conv.messageCount} 条消息
                    </Text>
                  </div>
                </div>
                <Dropdown
                  menu={getConversationActions(conv.id, {} as React.MouseEvent)}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: colors.textSecondary }}
                  />
                </Dropdown>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: colors.surface,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Title level={4} style={{ margin: 0, color: colors.textPrimary }}>
              {selectedConversation?.title}
            </Title>
          </div>
          <Space size={16}>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={models}
              style={{ width: 180 }}
              dropdownStyle={{ background: colors.surface }}
            />
            <Button type="text" icon={<SettingOutlined />} style={{ color: colors.textSecondary }} />
          </Space>
        </div>

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <Avatar
                  icon={<RobotOutlined />}
                  style={{
                    background: colors.accent,
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                  }}
                />
              )}
              <div
                style={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    background: msg.role === 'user' ? colors.accent : colors.surface,
                    border: msg.role === 'assistant' ? `1px solid ${colors.border}` : 'none',
                    borderRadius: 16,
                    padding: '12px 16px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Text>
                </div>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginTop: 4,
                    paddingLeft: msg.role === 'user' ? 0 : 44,
                    paddingRight: msg.role === 'user' ? 44 : 0,
                  }}
                >
                  {formatTime(msg.timestamp)}
                </Text>
              </div>
              {msg.role === 'user' && (
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    background: colors.hover,
                    color: colors.textSecondary,
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                  }}
                />
              )}
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar icon={<RobotOutlined />} style={{ background: colors.accent }} />
              <div
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 16,
                  padding: '12px 16px',
                }}
              >
                <Text style={{ color: colors.textSecondary }}>思考中...</Text>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.surface,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => !e.shiftKey && (e.preventDefault(), handleSend())}
                style={{
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  resize: 'none',
                  padding: '10px 14px',
                }}
              />
            </div>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isTyping}
              style={{
                background: colors.accent,
                border: 'none',
                borderRadius: 12,
                width: 48,
                height: 48,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              模型: {models.find((m) => m.value === selectedModel)?.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              按 Enter 发送 · Shift + Enter 换行
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
