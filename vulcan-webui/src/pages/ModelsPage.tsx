import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Table, Tag, Button, Space, Select, Switch,
  Modal, Form, Input, message, Spin, Badge, Tooltip, Popconfirm,
  Row, Col, Statistic, Divider, Alert
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  ApiOutlined, ThunderboltOutlined, ExperimentOutlined, SwapOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { api } from '@/services/api'

const { Title, Text } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelConfig {
  id: string
  name: string
  provider: string
  base_url?: string
  api_key?: string
  default_model?: string
  enabled: boolean
  priority: number
  max_tokens?: number
  temperature?: number
  latency_ms?: number
  status: 'unknown' | 'online' | 'offline' | 'error'
}

interface TestResult {
  success: boolean
  latency_ms?: number
  error?: string
  model?: string
}

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDERS: Record<string, { label: string; color: string; needsUrl: boolean; needsKey: boolean; defaultUrl?: string; models: string[] }> = {
  anthropic: {
    label: 'Anthropic (Claude)', color: '#d97706', needsUrl: false, needsKey: true,
    models: ['claude-sonnet-4-5', 'claude-sonnet-4', 'claude-opus-4', 'claude-3-5-haiku', 'claude-3-opus'],
  },
  openai: {
    label: 'OpenAI (GPT)', color: '#10b981', needsUrl: false, needsKey: true,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  google: {
    label: 'Google Gemini', color: '#4285f4', needsUrl: false, needsKey: true,
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
  },
  deepseek: {
    label: 'DeepSeek', color: '#2563eb', needsUrl: true, needsKey: true,
    defaultUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  groq: {
    label: 'Groq', color: '#9333ea', needsUrl: true, needsKey: true,
    defaultUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  mistral: {
    label: 'Mistral AI', color: '#ea4335', needsUrl: true, needsKey: true,
    defaultUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  },
  ollama: {
    label: 'Ollama (本地)', color: '#f59e0b', needsUrl: true, needsKey: false,
    defaultUrl: 'http://localhost:11434',
    models: ['llama3.2', 'llama3.1', 'qwen2.5', 'codellama', 'mistral'],
  },
  azure: {
    label: 'Azure OpenAI', color: '#0078d4', needsUrl: true, needsKey: true,
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
  },
  custom: {
    label: '自定义 API', color: '#6b7280', needsUrl: true, needsKey: false,
    models: [],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [form] = Form.useForm()
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, TestResult>>({})
  const [testingNew, setTestingNew] = useState(false)
  const [testNewResult, setTestNewResult] = useState<TestResult | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('openai')

  // ─── Fetch Models ────────────────────────────────────────────────────────────
  const loadModels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<ModelConfig[]>('/api/models/')
      setModels(data)
    } catch {
      message.warning('后端模型API未启动，使用本地数据')
      setModels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadModels() }, [loadModels])

  // ─── Test Connection ──────────────────────────────────────────────────────────
  const handleTest = async (modelId: string) => {
    setTestingId(modelId)
    setTestResult(prev => ({ ...prev, [modelId]: { success: false } }))
    try {
      const result = await api.post<TestResult>(`/api/models/${modelId}/test`, {})
      setTestResult(prev => ({ ...prev, [modelId]: result }))
      if (result.success) {
        message.success({ content: `✓ 连通成功 · ${result.latency_ms}ms`, duration: 2 })
      } else {
        message.error({ content: `✗ ${result.error}`, duration: 3 })
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e)
      setTestResult(prev => ({ ...prev, [modelId]: { success: false, error: errMsg } }))
      message.error('测试请求失败')
    } finally {
      setTestingId(null)
    }
  }

  // ─── Test New Model ───────────────────────────────────────────────────────────
  const handleTestNew = async () => {
    const values = form.getFieldsValue()
    if (!values.provider) { message.warning('请先选择 Provider'); return }
    const providerCfg = PROVIDERS[values.provider]
    if (providerCfg?.needsKey && !values.api_key) {
      message.warning('请先填写 API Key'); return
    }
    if (providerCfg?.needsUrl && !values.base_url) {
      message.warning('请先填写 Base URL'); return
    }
    setTestingNew(true)
    setTestNewResult(null)
    try {
      const result = await api.post<TestResult>('/api/models/test', {
        provider: values.provider,
        base_url: values.base_url || PROVIDERS[values.provider]?.defaultUrl,
        api_key: values.api_key,
        model: values.default_model,
      })
      setTestNewResult(result)
      if (result.success) {
        message.success({ content: `✓ 连通成功 · ${result.latency_ms}ms${result.model ? ` · 检测到模型: ${result.model}` : ''}`, duration: 3 })
        // Auto-fill model if detected
        if (result.model && !values.default_model) {
          form.setFieldValue('default_model', result.model)
        }
      } else {
        message.error({ content: `✗ ${result.error}`, duration: 3 })
      }
    } catch (e: unknown) {
      setTestNewResult({ success: false, error: e instanceof Error ? e.message : String(e) })
      message.error('测试失败')
    } finally {
      setTestingNew(false)
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditing(null)
    setTestResult({})
    setTestNewResult(null)
    form.resetFields()
    setSelectedProvider('openai')
    setModalOpen(true)
  }

  const handleEdit = (record: ModelConfig) => {
    setEditing(record)
    setTestResult({})
    setTestNewResult(null)
    form.setFieldsValue(record)
    setSelectedProvider(record.provider)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/api/models/${id}`)
      setModels(prev => prev.filter(m => m.id !== id))
      message.success('已删除')
    } catch {
      setModels(prev => prev.filter(m => m.id !== id))
      message.warning('后端未响应，本地已删除')
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.post(`/api/models/${id}/toggle`, { enabled })
      setModels(prev => prev.map(m => m.id === id ? { ...m, enabled } : m))
      message.success(enabled ? '已启用' : '已禁用')
    } catch {
      setModels(prev => prev.map(m => m.id === id ? { ...m, enabled } : m))
      message.warning('后端未响应，本地已更新')
    }
  }

  const handleSave = async (values: Record<string, any>) => {
    const providerCfg = PROVIDERS[values.provider]
    const payload: ModelConfig = {
      id: editing?.id || `model-${Date.now()}`,
      name: values.name,
      provider: values.provider,
      base_url: values.base_url || providerCfg?.defaultUrl,
      api_key: values.api_key,
      default_model: values.default_model,
      enabled: values.enabled ?? true,
      priority: values.priority ?? (models.length + 1),
      max_tokens: values.max_tokens,
      temperature: values.temperature ?? 0.7,
      status: 'unknown',
      latency_ms: testNewResult?.success ? testNewResult.latency_ms : undefined,
    }

    try {
      if (editing) {
        const updated = await api.put<ModelConfig>(`/api/models/${editing.id}`, payload as unknown as Record<string, unknown>)
        setModels(prev => prev.map(m => m.id === editing.id ? updated : m))
        message.success('已更新')
      } else {
        const created = await api.post<ModelConfig>('/api/models/', payload as unknown as Record<string, unknown>)
        setModels(prev => [...prev, created])
        message.success('已添加')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      // fallback to local
      if (editing) {
        setModels(prev => prev.map(m => m.id === editing.id ? { ...m, ...payload } : m))
      } else {
        setModels(prev => [...prev, { ...payload, id: payload.id }])
      }
      message.warning('后端未响应，本地已保存')
      setModalOpen(false)
    }
  }

  // ─── Status Badge ─────────────────────────────────────────────────────────────
  const StatusBadge = ({ status, latency }: { status: string; latency?: number }) => {
    if (status === 'online') return <Space size={4}><Badge status="success" /><Text style={{ color: '#52c41a' }}>在线</Text>{latency && <Text type="secondary" style={{ fontSize: 10 }}>{latency}ms</Text>}</Space>
    if (status === 'error') return <Space size={4}><Badge status="error" /><Text style={{ color: '#ff4d4f' }}>异常</Text></Space>
    if (status === 'offline') return <Space size={4}><Badge status="default" /><Text type="secondary">离线</Text></Space>
    return <Space size={4}><Badge status="warning" /><Text type="secondary">未测试</Text></Space>
  }

  // ─── Columns ─────────────────────────────────────────────────────────────────
  const columns: ColumnsType<ModelConfig> = [
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 60,
      render: (enabled: boolean, record) => (
        <Switch size="small" checked={enabled} onChange={(checked) => handleToggle(record.id, checked)} />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong={record.enabled} style={{ color: record.enabled ? '#e5e7eb' : '#6b7280' }}>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>#{record.priority} · {record.provider}</Text>
        </Space>
      ),
    },
    {
      title: '连通性',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: string, record) => (
        <Space size={8}>
          <StatusBadge status={testResult[record.id]?.success !== undefined ? (testResult[record.id].success ? 'online' : 'error') : record.status} latency={testResult[record.id]?.latency_ms ?? record.latency_ms} />
          <Tooltip title="测试连通性">
            <Button
              size="small"
              type="text"
              icon={testingId === record.id ? <LoadingOutlined /> : <ExperimentOutlined />}
              onClick={() => handleTest(record.id)}
              disabled={testingId !== null}
            />
          </Tooltip>
          {testResult[record.id]?.error && (
            <Tooltip title={testResult[record.id].error}>
              <Text type="danger" style={{ fontSize: 10 }}>详情</Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '默认模型',
      dataIndex: 'default_model',
      key: 'default_model',
      render: (v, record) => v ? (
        <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag>
      ) : <Text type="secondary">未设置</Text>,
    },
    {
      title: 'Base URL',
      dataIndex: 'base_url',
      key: 'base_url',
      render: (v) => v ? (
        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }} ellipsis={{ tooltip: v }}>{v}</Text>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 90,
      render: (v) => v ?? <Text type="secondary">0.7</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ModelConfig) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const onlineCount = models.filter(m => m.enabled && m.status === 'online').length
  const enabledCount = models.filter(m => m.enabled).length
  const avgLatency = models.filter(m => m.latency_ms).reduce((sum, m, _, arr) => sum + (m.latency_ms || 0) / arr.length, 0)

  // ─── Render ─────────────────────────────────────────────────────────────────
  const providerOptions = Object.entries(PROVIDERS).map(([key, cfg]) => ({
    value: key,
    label: <Space><Tag color={cfg.color} style={{ width: 80 }}>{cfg.label}</Tag></Space>,
  }))

  const currentProviderCfg = PROVIDERS[selectedProvider]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>🤖 模型管理</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            多 Provider · 连通性测试 · 智能路由
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined spin={loading} />} onClick={loadModels} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加模型</Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="已配置模型" value={models.length} valueStyle={{ fontSize: 20 }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已启用" value={enabledCount} valueStyle={{ fontSize: 20, color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="在线可用" value={onlineCount} valueStyle={{ fontSize: 20, color: onlineCount > 0 ? '#10b981' : '#6b7280' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="平均延迟" value={avgLatency > 0 ? `${Math.round(avgLatency)}ms` : 'N/A'} valueStyle={{ fontSize: 20 }} /></Card></Col>
      </Row>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={models}
            pagination={{ pageSize: 10, size: 'small' }}
            size="middle"
            style={{ background: 'transparent' }}
          />
        </Spin>
      </Card>

      {/* Modal */}
      <Modal
        title={
          <Space>
            {editing ? <EditOutlined /> : <PlusOutlined />}
            {editing ? '编辑模型' : '添加模型'}
            {editing && <Tag>{editing.name}</Tag>}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          {/* Provider */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={providerOptions}
                  onChange={(v) => { setSelectedProvider(v); setTestNewResult(null); form.setFieldValue('base_url', PROVIDERS[v]?.defaultUrl) }}
                  placeholder="选择模型提供商"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="显示名称" rules={[{ required: true }]}>
                <Input placeholder="例如：Claude (Anthropic)" />
              </Form.Item>
            </Col>
          </Row>

          {/* URL + Key */}
          {currentProviderCfg?.needsUrl && (
            <Form.Item name="base_url" label="Base URL" rules={[{ required: true, message: '此 Provider 需要填写 Base URL' }]}>
              <Input placeholder={currentProviderCfg.defaultUrl || 'https://...'} />
            </Form.Item>
          )}
          {currentProviderCfg?.needsKey && (
            <Form.Item name="api_key" label="API Key" rules={[{ required: true, message: '此 Provider 需要填写 API Key' }]}>
              <Input.Password placeholder="sk-..." />
            </Form.Item>
          )}

          {/* Model + Params */}
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="default_model" label="默认模型">
                <Select
                  allowClear
                  showSearch
                  options={currentProviderCfg?.models.map(m => ({ value: m, label: m })) || []}
                  placeholder={currentProviderCfg?.models.length ? `例如: ${currentProviderCfg.models[0]}` : '手动输入模型名'}
                  mode={!currentProviderCfg?.models.length ? 'tags' : undefined}
                  notFoundContent={null}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="temperature" label="Temperature">
                <Input type="number" min={0} max={2} step={0.1} defaultValue={0.7} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="priority" label="优先级">
                <Input type="number" min={1} defaultValue={models.length + 1} />
              </Form.Item>
            </Col>
          </Row>

          {/* Test Result */}
          {testNewResult && (
            <Alert
              type={testNewResult.success ? 'success' : 'error'}
              icon={testNewResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              message={
                testNewResult.success
                  ? `连接成功 · ${testNewResult.latency_ms}ms${testNewResult.model ? ` · 检测到模型: ${testNewResult.model}` : ''}`
                  : `连接失败: ${testNewResult.error}`
              }
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}

          {/* Actions */}
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                icon={<ExperimentOutlined />}
                onClick={handleTestNew}
                loading={testingNew}
                disabled={!form.getFieldValue('provider')}
              >
                测试连通性
              </Button>
            </Space>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                {editing ? '保存修改' : '添加模型'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
