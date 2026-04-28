import { useState } from 'react'
import { Typography, Input, Button, Switch, Form, message, Badge, Tooltip, Select } from 'antd'
import {
  WechatOutlined, SendOutlined, ReloadOutlined, MailOutlined,
  FileImageOutlined, CommentOutlined, RobotOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, SyncOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text } = Typography

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RECENT_MESSAGES: MessageRowProps[] = [
  { id: '1', from: 'user', sender: '用户 王五', content: '今天的会议几点开始？', time: '14:32' },
  { id: '2', from: 'assistant', sender: '助手', content: '今天的会议下午3点开始，在第一会议室。', time: '14:32' },
  { id: '3', from: 'user', sender: '用户 李四', content: '帮我查一下明天的天气', time: '14:35' },
  { id: '4', from: 'assistant', sender: '助手', content: '明天多云转晴，最高温度26°C，适合出行。', time: '14:35' },
  { id: '5', from: 'user', sender: '用户 王五', content: '项目进度报告发给我', time: '14:40' },
  { id: '6', from: 'assistant', sender: '助手', content: '已发送最新项目进度报告，请查收。', time: '14:40' },
]

const CHANNEL_CONFIG = {
  name: '微信（iLink API）',
  appId: 'wx25631adbd12cbc76',
  status: 'connected' as const,
  enabled: true,
  homeChannel: 'o9cq8083t6N-9NMpniULvVwyfU30@im.wechat',
  lastSync: '2026-04-28 21:30:15',
  features: ['文字消息', '图片消息', '素材库', '自动回复'],
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  onClick: () => void
}

function QuickAction({ icon, title, description, color, onClick }: QuickActionProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLDivElement
        target.style.background = colors.hover
        target.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLDivElement
        target.style.background = colors.surface
        target.style.borderColor = colors.border
      }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 24, color }}>{icon}</span>
      </div>
      <Text style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{title}</Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.4 }}>{description}</Text>
    </div>
  )
}

// ─── Message Row ──────────────────────────────────────────────────────────────

interface MessageRowProps {
  id: string
  from: 'user' | 'assistant'
  sender: string
  content: string
  time: string
}

function MessageRow({ from, sender, content, time }: MessageRowProps) {
  const isUser = from === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '70%',
        background: isUser ? `${colors.accent}20` : colors.surface,
        border: `1px solid ${isUser ? colors.accent : colors.border}`,
        borderRadius: 12,
        padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{sender}</span>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isUser ? colors.accent : colors.success,
          }} />
        </div>
        <Text style={{ fontSize: 13, color: colors.textPrimary, display: 'block' }}>{content}</Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4, display: 'block' }}>{time}</Text>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WechatPage() {
  const [channel] = useState(CHANNEL_CONFIG)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [autoReply, setAutoReply] = useState(true)
  const [sendContent, setSendContent] = useState('')
  const [sending, setSending] = useState(false)
  const [form] = Form.useForm()

  const isConnected = channel.status === 'connected'
  const statusColor = isConnected ? colors.success : colors.error

  const handleSend = async () => {
    if (!sendContent.trim()) return
    setSending(true)
    try {
      const result = await api.gatewaySend({
        message: sendContent,
        session_id: channel.homeChannel,
      })
      if (result.ok) {
        message.success('消息已发送')
        setSendContent('')
      } else {
        message.error('发送失败')
      }
    } catch {
      message.error('发送失败，请检查 Gateway')
    } finally {
      setSending(false)
    }
  }

  const handleQuickAction = (action: string) => {
    message.info(`打开 ${action}...`)
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${colors.accent}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <WechatOutlined style={{ fontSize: 24, color: colors.accent }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 700, fontSize: 28 }}>
              微信
            </Title>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2, display: 'block' }}>
              微信渠道管理与消息收发
            </Text>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }} />
            <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500 }}>
              {isConnected ? '已连接' : '未连接'}
            </Text>
            <Badge status={isConnected ? 'success' : 'error'} />
          </div>
          <Tooltip title="刷新状态">
            <Button
              icon={<ReloadOutlined />}
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

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, marginBottom: 24 }}>
        {/* Connection Card */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>连接状态</Text>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: `${statusColor}20`,
            }}>
              {isConnected ? (
                <CheckCircleOutlined style={{ fontSize: 12, color: statusColor }} />
              ) : (
                <ExclamationCircleOutlined style={{ fontSize: 12, color: statusColor }} />
              )}
              <Text style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>
                {isConnected ? '在线' : '离线'}
              </Text>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>渠道名称</Text>
              <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500 }}>{channel.name}</Text>
            </div>
            <div>
              <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>AppID</Text>
              <Text style={{
                fontSize: 13,
                color: colors.accent,
                fontFamily: 'Monaco, monospace',
                background: `${colors.accent}15`,
                padding: '4px 8px',
                borderRadius: 4,
                display: 'inline-block',
              }}>
                {channel.appId}
              </Text>
            </div>
            <div>
              <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>Home Channel</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, wordBreak: 'break-all' }}>
                {channel.homeChannel}
              </Text>
            </div>
            <div>
              <Text style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>最后同步</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SyncOutlined style={{ fontSize: 12, color: colors.textSecondary }} />
                <Text style={{ fontSize: 13, color: colors.textPrimary }}>{channel.lastSync}</Text>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 13, color: colors.textPrimary }}>启用消息推送</Text>
            <Switch checked={pushEnabled} onChange={setPushEnabled} />
          </div>
        </div>

        {/* Recent Messages */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>最近消息</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>实时同步</Text>
          </div>
          <div style={{ flex: 1, overflow: 'auto', maxHeight: 320 }}>
            {MOCK_RECENT_MESSAGES.map(msg => (
              <MessageRow key={msg.id} {...msg} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, display: 'block', marginBottom: 16 }}>
          快捷操作
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <QuickAction
            icon={<SendOutlined />}
            title="发送消息"
            description="向当前会话发送文本消息"
            color={colors.accent}
            onClick={() => handleQuickAction('发送消息')}
          />
          <QuickAction
            icon={<CommentOutlined />}
            title="接收消息"
            description="查看和管理收到的消息"
            color="#3B82F6"
            onClick={() => handleQuickAction('接收消息')}
          />
          <QuickAction
            icon={<FileImageOutlined />}
            title="素材管理"
            description="管理图片、视频、音频素材"
            color="#22C55E"
            onClick={() => handleQuickAction('素材管理')}
          />
          <QuickAction
            icon={<RobotOutlined />}
            title="自动回复"
            description="配置关键词自动回复规则"
            color="#F59E0B"
            onClick={() => handleQuickAction('自动回复')}
          />
        </div>
      </div>

      {/* Channel Config */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>渠道配置</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>自动回复</Text>
            <Switch checked={autoReply} onChange={setAutoReply} />
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            channelName: channel.name,
            appId: channel.appId,
            homeChannel: channel.homeChannel,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <Form.Item
              label={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>渠道名称</Text>}
              name="channelName"
            >
              <Input
                style={{
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  height: 40,
                }}
              />
            </Form.Item>
            <Form.Item
              label={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>AppID</Text>}
              name="appId"
            >
              <Input
                style={{
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  height: 40,
                }}
              />
            </Form.Item>
            <Form.Item
              label={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>AppSecret</Text>}
              name="appSecret"
            >
              <Input.Password
                placeholder="••••••••"
                style={{
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  height: 40,
                }}
              />
            </Form.Item>
            <Form.Item
              label={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>Home Channel</Text>}
              name="homeChannel"
              style={{ gridColumn: 'span 2' }}
            >
              <Input
                style={{
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  height: 40,
                }}
              />
            </Form.Item>
            <Form.Item
              label={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>API 模式</Text>}
              name="apiMode"
            >
              <Select
                defaultValue="ilink"
                style={{ width: '100%', height: 40 }}
                dropdownStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                options={[
                  { label: 'iLink API', value: 'ilink' },
                  { label: '企业微信', value: 'wecom' },
                  { label: '公众号', value: 'mp' },
                ] as { label: string; value: string }[]}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button
              style={{
                background: colors.hover,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.textPrimary,
                height: 40,
                paddingInline: 24,
              }}
            >
              重置
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              style={{
                background: colors.accent,
                border: 'none',
                borderRadius: 8,
                height: 40,
                paddingInline: 24,
              }}
              onClick={() => message.success('配置已保存')}
            >
              保存配置
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}
