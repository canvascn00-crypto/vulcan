import { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Button, Avatar, Spin, Typography, Dropdown, Tag } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, EllipsisOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import { api, ChatRequest } from '@/services/api'
import { getWsClient, VulcanWsClient, WsMessage } from '@/services/ws'

const { TextArea } = Input
const { Text } = Typography

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  taskId?: string
  traceId?: string
}

// Markdown renderer
marked.setOptions({ breaks: true, gfm: true })

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '🔥 **Vulcan 来了。** 我是盗火者，双核驱动（Planner + Executor），20 个平台接入。有什么要做的？',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `session-${Date.now()}`)
  const [useStreaming, setUseStreaming] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<VulcanWsClient | null>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket setup
  useEffect(() => {
    if (!useStreaming) return
    const ws = getWsClient()
    wsRef.current = ws

    ws.connect().then(() => {
      console.log('[WS] Connected')
    }).catch(() => {
      console.warn('[WS] Connection failed, falling back to REST')
      setUseStreaming(false)
    })

    const unsub = ws.onMessage((msg: WsMessage) => {
      if (msg.type === 'result' && msg.task_id) {
        setMessages((prev) => {
          // Find the "pending" assistant message and update it
          const idx = [...prev].reverse().findIndex((m) => m.role === 'assistant' && !m.traceId)
          if (idx === -1) return prev
          const realIdx = prev.length - 1 - idx
          return prev.map((m, i) =>
            i === realIdx
              ? { ...m, content: msg.reply || '（无回复）', traceId: msg.trace_id, taskId: msg.task_id }
              : m
          )
        })
        setLoading(false)
      } else if (msg.type === 'step_update' && msg.step) {
        // Could render step progress here
        console.debug('[WS] Step:', msg.step)
      } else if (msg.type === 'error') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ 错误：${msg.error}`,
            timestamp: new Date(),
          },
        ])
        setLoading(false)
      }
    })

    return () => {
      unsub()
    }
  }, [useStreaming])

  const send = useCallback(async () => {
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

    // Placeholder for streaming reply
    const pendingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '🔥 Vulcan 思考中...',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, pendingMsg])

    try {
      if (useStreaming && wsRef.current?.isConnected) {
        // WebSocket streaming
        wsRef.current.sendMessage(userMsg.content, sessionId)
        // Response comes via onMessage callback (loading cleared there)
      } else {
        // REST polling fallback
        const req: ChatRequest = { message: userMsg.content, session_id: sessionId }
        const data = await api.chat(req)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: data.reply || '（无回复）', taskId: data.task_id, traceId: data.trace_id }
              : m
          )
        )
        setLoading(false)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '连接失败'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, content: `⚠️ ${errMsg}，请检查 Vulcan 服务是否启动。` }
            : m
        )
      )
      setLoading(false)
    }
  }, [input, loading, sessionId, useStreaming])

  const menuItems = [
    { key: 'clear', label: '清空对话' },
    { key: 'toggle-ws', label: useStreaming ? '切换 REST' : '切换 WebSocket' },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'clear') {
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: '🔥 **Vulcan 来了。** 我是盗火者，双核驱动（Planner + Executor），20 个平台接入。有什么要做的？',
          timestamp: new Date(),
        },
      ])
    } else if (key === 'toggle-ws') {
      setUseStreaming((v) => !v)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: '#e5e7eb' }}>🔥 Vulcan 对话</h2>
          <Text type="secondary" style={{ fontSize: 12 }}>
            双核 · Planner + Executor
            {useStreaming && wsRef.current?.isConnected && (
              <Tag color="green" style={{ marginLeft: 8 }}>WebSocket</Tag>
            )}
            {!useStreaming && <Tag color="default" style={{ marginLeft: 8 }}>REST</Tag>}
          </Text>
        </div>
        <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }}>
          <Button type="text" icon={<EllipsisOutlined />} style={{ color: '#9ca3af' }} />
        </Dropdown>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
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
              <Avatar icon={<RobotOutlined />} style={{ background: '#5a6ef5', flexShrink: 0 }} />
            )}
            <div
              style={{
                maxWidth: '70%',
                background: msg.role === 'user' ? '#3638cf' : '#1f2937',
                borderRadius: 12,
                padding: '10px 14px',
                border: msg.role === 'assistant' && !msg.traceId && loading ? '1px solid #5a6ef5' : 'none',
              }}
            >
              <div
                style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
              />
              {msg.traceId && (
                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                  trace: {msg.traceId.slice(0, 8)}
                </Text>
              )}
            </div>
            {msg.role === 'user' && (
              <Avatar icon={<UserOutlined />} style={{ background: '#374151', flexShrink: 0 }} />
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
          placeholder="输入消息，Shift+Enter 换行...（按 Enter 发送）"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, resize: 'none' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          loading={loading}
          style={{ height: 'auto', alignSelf: 'flex-end' }}
        >
          发送
        </Button>
      </div>
    </div>
  )
}
