import { useState, useRef, useEffect } from 'react'
import { Input, Button, Card, Avatar, Spin, Typography } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons'
import { marked } from 'marked'

const { TextArea } = Input
const { Text } = Typography

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '🔥 Vulcan 来了。我是盗火者，有什么可以帮你的？',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      })
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'Vulcan 正在思考...',
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ 连接失败，请检查 Vulcan 服务是否启动。',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#e5e7eb' }}>🔥 Vulcan 对话</h2>
        <Text type="secondary">双核架构 · Planner + Executor</Text>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 16,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role !== 'user' && (
              <Avatar icon={<RobotOutlined />} style={{ background: '#5a6ef5' }} />
            )}
            <Card
              size="small"
              style={{
                maxWidth: '70%',
                background: msg.role === 'user' ? '#3638cf' : '#1f2937',
                border: 'none',
              }}
            >
              <div
                style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
              />
            </Card>
            {msg.role === 'user' && (
              <Avatar icon={<UserOutlined />} style={{ background: '#374151' }} />
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar icon={<RobotOutlined />} style={{ background: '#5a6ef5' }} />
            <Spin size="small" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => !e.shiftKey && (e.preventDefault(), send())}
          placeholder="输入消息，Shift+Enter 换行..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          loading={loading}
          style={{ height: 'auto' }}
        >
          发送
        </Button>
      </div>
    </div>
  )
}
