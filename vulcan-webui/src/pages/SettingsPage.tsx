import { useState } from 'react'
import { Typography, Card, Tabs, Form, Input, Switch, Select, Button, Space, message, Tag, Divider, List, Modal, notification } from 'antd'
import { CheckCircleOutlined, GlobalOutlined, RobotOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text } = Typography

interface AppSettings {
  defaultModel: string
  apiBaseUrl: string
  apiKey: string
  streamMode: boolean
  enableMemory: boolean
  enableObservability: boolean
  logLevel: string
  maxHistory: number
}

export default function SettingsPage() {
  const [form] = Form.useForm<AppSettings>()
  const [saving, setSaving] = useState(false)
  const [gatewayInfo, setGatewayInfo] = useState<{ running: boolean; platforms: string[] } | null>(null)

  // Load gateway status
  const loadGateway = async () => {
    try {
      const data = await api.gatewayStatus()
      setGatewayInfo(data)
    } catch {
      setGatewayInfo(null)
    }
  }

  const handleSave = async (values: AppSettings) => {
    setSaving(true)
    try {
      // Persist to localStorage for now (backend can override)
      localStorage.setItem('vulcan_settings', JSON.stringify(values))
      message.success('设置已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    try {
      const h = await api.health()
      if (h.status === 'ok') {
        notification.success({ message: '✅ 连接成功', description: `Vulcan ${h.version} 运行中` })
      } else {
        notification.error({ message: '❌ 连接异常' })
      }
    } catch {
      notification.error({ message: '❌ 无法连接 Vulcan 服务' })
    }
  }

  const tabItems = [
    {
      key: 'general',
      label: '⚙️ 通用',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            defaultModel: 'anthropic/claude-sonnet-4',
            streamMode: true,
            enableMemory: true,
            enableObservability: true,
            logLevel: 'INFO',
            maxHistory: 100,
          }}
        >
          <Divider>模型</Divider>
          <Form.Item name="defaultModel" label="默认模型">
            <Input placeholder="anthropic/claude-sonnet-4" />
          </Form.Item>
          <Form.Item name="apiBaseUrl" label="API Base URL">
            <Input placeholder="https://api.anthropic.com" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password placeholder="sk-..." />
          </Form.Item>

          <Divider>对话</Divider>
          <Form.Item name="streamMode" label="流式输出" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="maxHistory" label="最大历史记录数">
            <Input type="number" min={10} max={10000} />
          </Form.Item>

          <Divider>系统</Divider>
          <Form.Item name="enableMemory" label="启用记忆（三层）" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="enableObservability" label="启用可观测性" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="logLevel" label="日志级别">
            <Select>
              <Select.Option value="DEBUG">DEBUG</Select.Option>
              <Select.Option value="INFO">INFO</Select.Option>
              <Select.Option value="WARN">WARN</Select.Option>
              <Select.Option value="ERROR">ERROR</Select.Option>
            </Select>
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存设置
            </Button>
            <Button onClick={testConnection}>测试连接</Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'channels',
      label: '🌐 渠道',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button onClick={loadGateway}>刷新状态</Button>
          </div>
          {gatewayInfo === null ? (
            <Text type="secondary">点击刷新获取渠道状态</Text>
          ) : (
            <List
              bordered
              dataSource={gatewayInfo.platforms.length > 0 ? gatewayInfo.platforms : ['微信', 'Telegram', 'Discord', 'WhatsApp', 'Slack']}
              renderItem={(item: string) => (
                <List.Item
                  extra={<Tag color="green" icon={<CheckCircleOutlined />}>已继承</Tag>}
                >
                  <List.Item.Meta
                    avatar={<GlobalOutlined style={{ fontSize: 20, color: '#5a6ef5' }} />}
                    title={item}
                    description="继承自 Hermes Gateway"
                  />
                </List.Item>
              )}
            />
          )}
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 20 个平台渠道已继承配置，详细配置请修改 config/gateway.yaml
            </Text>
          </div>
        </>
      ),
    },
    {
      key: 'about',
      label: 'ℹ️ 关于',
      children: (
        <div>
          <Card style={{ marginBottom: 16, background: '#1c1c28' }}>
            <Space>
              <ThunderboltOutlined style={{ fontSize: 32, color: '#5a6ef5' }} />
              <div>
                <Title level={4} style={{ margin: 0, color: '#e5e7eb' }}>Vulcan</Title>
                <Text type="secondary">盗火者 · 下一代 AI Agent 平台</Text>
              </div>
            </Space>
          </Card>
          <List size="small">
            <List.Item><Text strong>版本</Text><Text>0.1.0</Text></List.Item>
            <List.Item><Text strong>架构</Text><Text>双核（Planner + Executor）</Text></List.Item>
            <List.Item><Text strong>渠道</Text><Text>20 个平台（继承 Hermes）</Text></List.Item>
            <List.Item><Text strong>记忆</Text><Text>三层（瞬时 + 短期 + 长期）</Text></List.Item>
            <List.Item><Text strong>工具</Text><Text>60+（自动发现 Hermes）</Text></List.Item>
            <List.Item><Text strong>技术栈</Text><Text>Python · FastAPI · React · Ant Design</Text></List.Item>
          </List>
          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>
            基于 Hermes Agent 框架构建，完全继承所有功能，并进行架构级升级。
          </Text>
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>⚙️ 设置</Title>
        <Text type="secondary">配置 Vulcan 各项参数</Text>
      </div>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
