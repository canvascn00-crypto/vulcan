import { useState } from 'react'
import { Row, Col, Card, Typography, Form, Switch, Select, Input, Button, Space, message } from 'antd'
import {
  SettingOutlined,
  GlobalOutlined,
  KeyOutlined,
  BellOutlined,
  GatewayOutlined,
  DatabaseOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text } = Typography

// Claude-style color tokens
const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
}

interface SettingsForm {
  // General
  theme: 'dark' | 'light'
  language: string
  timezone: string
  // API Configuration
  apiKey: string
  baseUrl: string
  timeout: number
  // Notifications
  emailNotification: boolean
  wechatNotification: boolean
  slackNotification: boolean
  // Gateway
  wsPort: number
  httpPort: number
  enabledPlatforms: string[]
  // Memory
  memoryBackend: string
  retentionPeriod: number
  vectorDimensions: number
}

export default function SettingsPage() {
  const [form] = Form.useForm<SettingsForm>()
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: SettingsForm) => {
    setSaving(true)
    try {
      localStorage.setItem('vulcan_settings', JSON.stringify(values))
      message.success('设置已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
  }

  const sectionTitleStyle: React.CSSProperties = {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }

  const labelStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    background: colors.hover,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    color: colors.textPrimary,
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, color: colors.textPrimary, fontWeight: 600 }}>
          设置
        </Title>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          配置 Vulcan 各项参数
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          theme: 'dark',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          apiKey: '',
          baseUrl: 'https://api.anthropic.com',
          timeout: 30,
          emailNotification: true,
          wechatNotification: false,
          slackNotification: false,
          wsPort: 8080,
          httpPort: 8000,
          enabledPlatforms: ['wechat', 'telegram', 'discord'],
          memoryBackend: 'chroma',
          retentionPeriod: 30,
          vectorDimensions: 1536,
        }}
      >
        <Row gutter={[20, 20]}>
          {/* 1. General */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
              <div style={sectionTitleStyle}>
                <SettingOutlined style={{ color: colors.accent }} />
                通用
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <Text style={labelStyle}>主题</Text>
                  <Form.Item name="theme" noStyle>
                    <Select
                      style={{ width: '100%' }}
                      options={[
                        { label: '🌙 深色', value: 'dark' },
                        { label: '☀️ 浅色', value: 'light' },
                      ]}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>语言</Text>
                  <Form.Item name="language" noStyle>
                    <Select
                      style={{ width: '100%' }}
                      options={[
                        { label: '🇨🇳 简体中文', value: 'zh-CN' },
                        { label: '🇺🇸 English', value: 'en-US' },
                        { label: '🇭🇰 繁体中文', value: 'zh-HK' },
                      ]}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>时区</Text>
                  <Form.Item name="timezone" noStyle>
                    <Select
                      style={{ width: '100%' }}
                      options={[
                        { label: 'Asia/Shanghai (UTC+8)', value: 'Asia/Shanghai' },
                        { label: 'America/New_York (UTC-5)', value: 'America/New_York' },
                        { label: 'Europe/London (UTC+0)', value: 'Europe/London' },
                      ]}
                    />
                  </Form.Item>
                </div>
              </div>
            </Card>
          </Col>

          {/* 2. API Configuration */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
              <div style={sectionTitleStyle}>
                <KeyOutlined style={{ color: colors.accent }} />
                API 配置
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <Text style={labelStyle}>API Key</Text>
                  <Form.Item name="apiKey" noStyle>
                    <Input.Password
                      placeholder="sk-ant-..."
                      style={inputStyle}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>Base URL</Text>
                  <Form.Item name="baseUrl" noStyle>
                    <Input
                      placeholder="https://api.anthropic.com"
                      style={inputStyle}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>超时时间（秒）</Text>
                  <Form.Item name="timeout" noStyle>
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      placeholder="30"
                      style={inputStyle}
                    />
                  </Form.Item>
                </div>
              </div>
            </Card>
          </Col>

          {/* 3. Notification Settings */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
              <div style={sectionTitleStyle}>
                <BellOutlined style={{ color: colors.accent }} />
                通知设置
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: colors.textPrimary, fontSize: 14 }}>邮件通知</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                      系统事件发送至邮箱
                    </Text>
                  </div>
                  <Form.Item name="emailNotification" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: colors.textPrimary, fontSize: 14 }}>微信通知</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                      通过企业微信推送
                    </Text>
                  </div>
                  <Form.Item name="wechatNotification" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: colors.textPrimary, fontSize: 14 }}>Slack 通知</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, display: 'block' }}>
                      推送至指定 Slack 频道
                    </Text>
                  </div>
                  <Form.Item name="slackNotification" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            </Card>
          </Col>

          {/* 4. Gateway Settings */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
              <div style={sectionTitleStyle}>
                <GatewayOutlined style={{ color: colors.accent }} />
                网关设置
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <Text style={labelStyle}>WebSocket 端口</Text>
                  <Form.Item name="wsPort" noStyle>
                    <Input
                      type="number"
                      placeholder="8080"
                      style={inputStyle}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>HTTP 端口</Text>
                  <Form.Item name="httpPort" noStyle>
                    <Input
                      type="number"
                      placeholder="8000"
                      style={inputStyle}
                    />
                  </Form.Item>
                </div>

                <div>
                  <Text style={labelStyle}>已启用平台</Text>
                  <Form.Item name="enabledPlatforms" noStyle>
                    <Select
                      mode="multiple"
                      placeholder="选择平台"
                      style={{ width: '100%' }}
                      options={[
                        { label: '💬 微信', value: 'wechat' },
                        { label: '✈️ Telegram', value: 'telegram' },
                        { label: '🎮 Discord', value: 'discord' },
                        { label: '📱 WhatsApp', value: 'whatsapp' },
                        { label: '💼 Slack', value: 'slack' },
                        { label: '📧 Email', value: 'email' },
                      ]}
                    />
                  </Form.Item>
                </div>
              </div>
            </Card>
          </Col>

          {/* 5. Memory Settings */}
          <Col xs={24}>
            <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
              <div style={sectionTitleStyle}>
                <DatabaseOutlined style={{ color: colors.accent }} />
                记忆设置
              </div>

              <Row gutter={[20, 0]}>
                <Col xs={24} lg={8}>
                  <div>
                    <Text style={labelStyle}>记忆后端</Text>
                    <Form.Item name="memoryBackend" noStyle>
                      <Select
                        style={{ width: '100%' }}
                        options={[
                          { label: 'Chroma', value: 'chroma' },
                          { label: 'Milvus', value: 'milvus' },
                          { label: 'Qdrant', value: 'qdrant' },
                          { label: 'FAISS', value: 'faiss' },
                          { label: '内存存储', value: 'memory' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                </Col>

                <Col xs={24} lg={8}>
                  <div>
                    <Text style={labelStyle}>保留期限（天）</Text>
                    <Form.Item name="retentionPeriod" noStyle>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        placeholder="30"
                        style={inputStyle}
                      />
                    </Form.Item>
                  </div>
                </Col>

                <Col xs={24} lg={8}>
                  <div>
                    <Text style={labelStyle}>向量维度</Text>
                    <Form.Item name="vectorDimensions" noStyle>
                      <Select
                        style={{ width: '100%' }}
                        options={[
                          { label: '1536 (OpenAI)', value: 1536 },
                          { label: '1024 (Cohere)', value: 1024 },
                          { label: '768 (BERT)', value: 768 },
                          { label: '3584 (Claude)', value: 3584 },
                        ]}
                      />
                    </Form.Item>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Save Button */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<SaveOutlined />}
            style={{
              background: colors.accent,
              border: 'none',
              borderRadius: 8,
              height: 42,
              paddingLeft: 24,
              paddingRight: 24,
              fontWeight: 500,
            }}
          >
            保存设置
          </Button>
        </div>
      </Form>
    </div>
  )
}
