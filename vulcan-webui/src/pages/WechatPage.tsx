import { useState } from 'react'
import { Typography, Card, Row, Col, Tag, Button, Space, Statistic, Switch, Input, List, message, Form, Modal, Divider, Badge } from 'antd'
import { WechatOutlined, SendOutlined, CloseCircleOutlined, ReloadOutlined, VideoCameraOutlined, FileImageOutlined, LinkOutlined } from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text } = Typography

// ─── Mock channel state ──────────────────────────────────────────────────────

const CHANNEL_CONFIG = {
  name: '微信（iLink API）',
  appId: 'wx25631adbd12cbc76',
  status: 'connected' as const,
  enabled: true,
  homeChannel: 'o9cq8083t6N-9NMpniULvVwyfU30@im.wechat',
  features: ['文字消息', '图片消息', '草稿箱发布', '素材库'],
  recentMessages: [
    { id: '1', from: 'user', content: '好了吗', time: '18:32' },
    { id: '2', from: 'assistant', content: 'Phase 2 完成 ✅，准备进入 Phase 3？', time: '18:32' },
    { id: '3', from: 'user', content: '对', time: '18:33' },
    { id: '4', from: 'assistant', content: '开始 Phase 3：WebUI 真实功能化...', time: '18:33' },
  ],
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WechatPage() {
  const [channel] = useState(CHANNEL_CONFIG)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendContent, setSendContent] = useState('')
  const [sending, setSending] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)

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
        setSendModalOpen(false)
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>
            💬 微信渠道
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            继承 Hermes WeChat Channel · iLink API
          </Text>
        </div>
        <Space>
          <Badge status={channel.status === 'connected' ? 'success' : 'error'} />
          <Tag color={channel.status === 'connected' ? 'green' : 'red'}>
            {channel.status === 'connected' ? '已连接' : '未连接'}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={() => message.info('刷新状态开发中')}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Channel info */}
        <Col xs={24} md={8}>
          <Card title="📡 渠道配置" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>渠道名称</Text>
                <div><Text strong>{channel.name}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>AppID</Text>
                <div><Text code>{channel.appId}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Home Channel</Text>
                <div><Text code style={{ fontSize: 11 }}>{channel.homeChannel}</Text></div>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用推送</Text>
                <Switch checked={pushEnabled} onChange={setPushEnabled} />
              </div>
            </Space>

            <Divider />

            <Text strong style={{ fontSize: 12 }}>支持功能</Text>
            <div style={{ marginTop: 8 }}>
              {channel.features.map((f) => (
                <Tag key={f} style={{ marginBottom: 4 }}>
                  {f === '文字消息' && <WechatOutlined />}
                  {f === '图片消息' && <FileImageOutlined />}
                  {f === '草稿箱发布' && <VideoCameraOutlined />}
                  {f === '素材库' && <LinkOutlined />}
                  {' '}{f}
                </Tag>
              ))}
            </div>

            <Button
              type="primary"
              icon={<SendOutlined />}
              block
              style={{ marginTop: 16 }}
              onClick={() => setSendModalOpen(true)}
            >
              发送消息
            </Button>
          </Card>
        </Col>

        {/* Recent messages */}
        <Col xs={24} md={16}>
          <Card
            title="💬 最近消息"
            size="small"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>实时继承 Hermes 会话</Text>}
          >
            <List
              size="small"
              dataSource={channel.recentMessages}
              style={{ maxHeight: 400, overflow: 'auto' }}
              renderItem={(msg) => (
                <List.Item
                  style={{
                    justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.from === 'user' ? '#3638cf20' : 'transparent',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {msg.from === 'assistant' && <WechatOutlined style={{ color: '#52c41a' }} />}
                      <Text style={{ color: '#e5e7eb' }}>{msg.content}</Text>
                      {msg.from === 'user' && <WechatOutlined style={{ color: '#1677ff' }} />}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>{msg.time}</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Stats row */}
      <Row gutter={12} style={{ marginTop: 16 }}>
        {[
          { label: '今日消息', value: 127 },
          { label: '粉丝数（API不可用）', value: 'N/A' },
          { label: '文章阅读', value: 'N/A' },
        ].map((s) => (
          <Col xs={24} sm={8} key={s.label}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>}
                value={s.value}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Send modal */}
      <Modal
        title="发送微信消息"
        open={sendModalOpen}
        onCancel={() => setSendModalOpen(false)}
        onOk={handleSend}
        confirmLoading={sending}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            发送到：{channel.homeChannel}
          </Text>
          <Input.TextArea
            value={sendContent}
            onChange={(e) => setSendContent(e.target.value)}
            placeholder="输入消息内容..."
            rows={4}
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        </Space>
      </Modal>
    </div>
  )
}
