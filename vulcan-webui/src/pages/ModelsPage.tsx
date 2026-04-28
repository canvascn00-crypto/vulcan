import { useState, useEffect } from 'react'
import {
  Typography, Card, Table, Tag, Button, Space, Select, Switch,
  Modal, Form, Input, message, Spin, Badge
} from 'antd'
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelConfig {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'ollama' | 'azure' | 'custom'
  base_url?: string
  api_key?: string
  default_model?: string
  enabled: boolean
  priority: number
  max_tokens?: number
  temperature?: number
}

// ─── Mock / placeholder providers ───────────────────────────────────────────

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'anthropic-default',
    name: 'Claude (Anthropic)',
    provider: 'anthropic',
    default_model: 'claude-sonnet-4',
    enabled: true,
    priority: 1,
    temperature: 0.7,
  },
  {
    id: 'openai-default',
    name: 'OpenAI GPT',
    provider: 'openai',
    default_model: 'gpt-4o',
    enabled: true,
    priority: 2,
    temperature: 0.7,
  },
  {
    id: 'ollama-local',
    name: 'Ollama (本地)',
    provider: 'ollama',
    base_url: 'http://localhost:11434',
    default_model: 'llama3.2',
    enabled: false,
    priority: 3,
    temperature: 0.8,
  },
]

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  ollama: 'Ollama (本地)',
  azure: 'Azure OpenAI',
  custom: '自定义',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [form] = Form.useForm()

  const loadModels = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call when backend is ready
      // const data = await api.listModels()
      // setModels(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: ModelConfig) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id))
    message.success('已删除')
  }

  const handleToggle = (id: string, enabled: boolean) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled } : m))
    )
    message.success(enabled ? '已启用' : '已禁用')
  }

  const handleSave = (values: Partial<ModelConfig>) => {
    if (editing) {
      setModels((prev) =>
        prev.map((m) => (m.id === editing.id ? { ...m, ...values } : m))
      )
      message.success('已更新')
    } else {
      const newModel: ModelConfig = {
        id: `model-${Date.now()}`,
        enabled: true,
        priority: models.length + 1,
        ...values,
      } as ModelConfig
      setModels((prev) => [...prev, newModel])
      message.success('已添加')
    }
    setModalOpen(false)
  }

  const columns: ColumnsType<ModelConfig> = [
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 70,
      render: (enabled: boolean, record) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <Badge status={record.enabled ? 'success' : 'default'} />
          <Text strong={record.enabled}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (p: string) => <Tag>{PROVIDER_LABELS[p] || p}</Tag>,
    },
    {
      title: '默认模型',
      dataIndex: 'default_model',
      key: 'default_model',
      render: (v) => v || <Text type="secondary">未设置</Text>,
    },
    {
      title: 'Base URL',
      dataIndex: 'base_url',
      key: 'base_url',
      render: (v) => v ? (
        <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      render: (v) => v ?? <Text type="secondary">0.7</Text>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p) => <Text>#{p}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ModelConfig) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>🤖 模型管理</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            配置多模型 Provider，Vulcan 自动选择最优模型
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadModels} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加模型
          </Button>
        </Space>
      </div>

      {/* Info banner */}
      <Card style={{ marginBottom: 16, background: '#1c1c28' }}>
        <Space>
          <Text type="secondary">当前默认：</Text>
          <Tag color="blue">{models.find((m) => m.enabled && m.priority === 1)?.name || '未配置'}</Tag>
          <Text type="secondary">·</Text>
          <Text type="secondary">共 {models.filter((m) => m.enabled).length} 个可用模型</Text>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={models}
            pagination={false}
            size="middle"
          />
        </Spin>
      </Card>

      {/* Modal */}
      <Modal
        title={editing ? '编辑模型' : '添加模型'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{ enabled: true, temperature: 0.7, priority: models.length + 1 }}
        >
          <Form.Item name="name" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="例如：Claude (Anthropic)" />
          </Form.Item>

          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="anthropic">Anthropic (Claude)</Select.Option>
              <Select.Option value="openai">OpenAI (GPT)</Select.Option>
              <Select.Option value="ollama">Ollama (本地)</Select.Option>
              <Select.Option value="azure">Azure OpenAI</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="base_url" label="Base URL（可选）">
            <Input placeholder="http://localhost:11434" />
          </Form.Item>

          <Form.Item name="default_model" label="默认模型">
            <Input placeholder="claude-sonnet-4" />
          </Form.Item>

          <Form.Item name="api_key" label="API Key">
            <Input.Password placeholder="sk-..." />
          </Form.Item>

          <Space size={16}>
            <Form.Item name="temperature" label="Temperature" style={{ width: 120 }}>
              <Input type="number" min={0} max={2} step={0.1} />
            </Form.Item>
            <Form.Item name="max_tokens" label="Max Tokens" style={{ width: 120 }}>
              <Input type="number" min={1} />
            </Form.Item>
            <Form.Item name="priority" label="优先级" style={{ width: 80 }}>
              <Input type="number" min={1} />
            </Form.Item>
          </Space>

          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
