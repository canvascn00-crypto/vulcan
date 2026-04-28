import { useState } from 'react'
import { Typography, Card, Tabs, Form, Input, Switch, Select, Button, Space, message, Tag, Divider, List, Modal, notification, Table, Popconfirm, Alert } from 'antd'
import { CheckCircleOutlined, GlobalOutlined, RobotOutlined, SafetyOutlined, ThunderboltOutlined, KeyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
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
      key: 'apikeys',
      label: '🔑 API Keys',
      children: (
        <APIKeysTab />
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

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function APIKeysTab() {
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKey, setNewKey] = useState<any>(null)
  const [createForm] = Form.useForm()

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await (api as any).get('/api/api-keys')
      setKeys(res)
    } catch { message.error('加载 API Keys 失败') }
    finally { setLoading(false) }
  }

  const handleCreate = async (values: any) => {
    try {
      const res = await (api as any).post('/api/api-keys', null, {
        name: values.name,
        role: values.role,
        rate_limit: values.rate_limit || 60,
        rate_window: values.rate_window || 60,
      })
      setNewKey(res)
      setCreateOpen(false)
      loadKeys()
    } catch (e: any) {
      message.error(e?.data?.detail || '创建失败')
    }
  }

  const handleRevoke = async (prefix: string) => {
    try {
      await (api as any).delete(`/api/api-keys/${prefix}`)
      message.success('已吊销')
      loadKeys()
    } catch (e: any) {
      message.error(e?.data?.detail || '吊销失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '前缀', dataIndex: 'key_prefix', key: 'key_prefix', render: (k: string) => <Tag>{k}***</Tag> },
    { title: '角色', dataIndex: 'role', key: 'role', render: (r: string) => <Tag color={r === 'admin' ? 'red' : r === 'operator' ? 'blue' : 'default'}>{r}</Tag> },
    { title: '速率限制', dataIndex: 'rate_limit', key: 'rate_limit', render: (n: number, _: any) => `${n}/min` },
    { title: '状态', dataIndex: 'active', key: 'active', render: (a: boolean) => a ? <Tag color="green">活跃</Tag> : <Tag color="red">已吊销</Tag> },
    { title: '最后使用', dataIndex: 'last_used', key: 'last_used', render: (t: number) => new Date(t * 1000).toLocaleString('zh-CN') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        record.active ? (
          <Popconfirm title="确认吊销此 Key？" onConfirm={() => handleRevoke(record.key_prefix)}>
            <Button size="small" danger icon={<DeleteOutlined />}>吊销</Button>
          </Popconfirm>
        ) : null
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            API Key 用于外部程序调用 Vulcan API。Key 只显示一次，请妥善保存。
          </Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewKey(null); setCreateOpen(true) }}>
          创建 Key
        </Button>
      </div>

      {newKey && (
        <Alert
          type="warning"
          showIcon
          message="✅ 新 API Key 已创建（只显示一次，请立即复制保存）"
          description={
            <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <strong>X-Vulcan-Key:</strong> {newKey.api_key}
              <br />
              <strong>Prefix:</strong> {newKey.key_prefix}*** &nbsp;
              <strong>Role:</strong> {newKey.role}
            </div>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        dataSource={keys}
        columns={columns}
        rowKey="key_prefix"
        loading={loading}
        size="small"
        pagination={false}
      />

      <Modal
        title="创建 API Key"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="my-app-key" />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="external" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Admin（完全访问）', value: 'admin' },
              { label: 'Operator（读写操作）', value: 'operator' },
              { label: 'Readonly（只读）', value: 'readonly' },
              { label: 'External（外部调用）', value: 'external' },
            ]} />
          </Form.Item>
          <Form.Item name="rate_limit" label="速率限制（请求/分钟）" initialValue={60}>
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="rate_window" label="速率窗口（秒）" initialValue={60}>
            <Input type="number" min={10} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
