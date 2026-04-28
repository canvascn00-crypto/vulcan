import { useState } from 'react'
import { Typography, Card, Row, Col, Tag, Button, Space, Modal, Form, Input, Select, message, Switch, Divider, Badge } from 'antd'
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, NodeIndexOutlined, RocketOutlined, ArrowRightOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface WorkflowStep {
  id: string
  name: string
  type: 'trigger' | 'agent' | 'tool' | 'condition' | 'output'
  config: Record<string, unknown>
  enabled: boolean
}

interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  enabled: boolean
  trigger: string
  lastRun?: string
  runCount: number
}

const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: '1',
    name: '公众号文章流水线',
    description: '接收链接 → 抓取内容 → AI提炼 → 生成图卡 → wenyan-mcp发布',
    enabled: true,
    trigger: 'webhook',
    lastRun: '2026-04-28 18:00',
    runCount: 47,
    steps: [
      { id: 's1', name: '触发器', type: 'trigger', config: { type: 'webhook' }, enabled: true },
      { id: 's2', name: 'URL抓取', type: 'tool', config: { tool: 'fetch' }, enabled: true },
      { id: 's3', name: 'AI提炼', type: 'agent', config: { model: 'claude-sonnet-4', prompt: '提炼金句' }, enabled: true },
      { id: 's4', name: '生成图卡', type: 'tool', config: { tool: 'article-card-gen' }, enabled: true },
      { id: 's5', name: '发布草稿', type: 'tool', config: { tool: 'wenyan-mcp' }, enabled: true },
    ],
  },
  {
    id: '2',
    name: '每日资讯推送',
    description: '定时触发 → RSS抓取 → AI摘要 → 微信推送',
    enabled: true,
    trigger: 'cron:0 9 * * *',
    lastRun: '2026-04-28 09:00',
    runCount: 28,
    steps: [
      { id: 's1', name: '定时触发', type: 'trigger', config: { schedule: '0 9 * * *' }, enabled: true },
      { id: 's2', name: 'RSS监控', type: 'tool', config: { tool: 'blogwatcher' }, enabled: true },
      { id: 's3', name: 'AI摘要', type: 'agent', config: { model: 'gpt-4o' }, enabled: true },
      { id: 's4', name: '微信推送', type: 'tool', config: { tool: 'hermes-wechat-push' }, enabled: true },
    ],
  },
  {
    id: '3',
    name: '舆情监控',
    description: '关键词监控 → Polymarket数据 → 异常告警 → 微信通知',
    enabled: false,
    trigger: 'cron:*/30 * * * *',
    runCount: 0,
    steps: [],
  },
]

const STEP_COLORS: Record<string, string> = {
  trigger: 'orange',
  agent: 'blue',
  tool: 'green',
  condition: 'purple',
  output: 'cyan',
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEMO_WORKFLOWS)
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const handleToggle = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
  }

  const handleDelete = (id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    message.success('已删除')
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e5e7eb' }}>⚡ 工作流编排</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            可视化编排 Agent 任务流程（Phase 4 完善）
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建工作流
        </Button>
      </div>

      {/* Workflow list */}
      <Row gutter={[16, 16]}>
        {workflows.map((wf) => (
          <Col xs={24} md={12} lg={8} key={wf.id}>
            <Card
              size="small"
              hoverable
              style={{
                background: '#1c1c28',
                border: wf.enabled ? '1px solid #5a6ef5' : '1px solid #2a2a3e',
              }}
              title={
                <Space>
                  <Badge status={wf.enabled ? 'success' : 'default'} />
                  <Text strong style={{ color: '#e5e7eb' }}>{wf.name}</Text>
                </Space>
              }
              extra={
                <Switch
                  size="small"
                  checked={wf.enabled}
                  onChange={() => handleToggle(wf.id)}
                />
              }
              actions={[
                <Button key="run" type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => message.info('运行开发中')} />,
                <Button key="view" type="text" size="small" icon={<NodeIndexOutlined />} onClick={() => setSelectedWf(wf)} />,
                <Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(wf.id)} />,
              ]}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>{wf.description}</Text>

              <div style={{ marginTop: 12 }}>
                <Space wrap size={4}>
                  {wf.steps.map((step) => (
                    <Tag key={step.id} color={STEP_COLORS[step.type]} style={{ fontSize: 10 }}>
                      {step.name}
                    </Tag>
                  ))}
                </Space>
              </div>

              <Divider style={{ margin: '10px 0' }} />

              <Row gutter={8}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>触发：{wf.trigger}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>运行：{wf.runCount}次</Text>
                </Col>
                {wf.lastRun && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 11 }}>上次：{wf.lastRun}</Text>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Workflow detail modal */}
      <Modal
        title={selectedWf?.name}
        open={!!selectedWf}
        onCancel={() => setSelectedWf(null)}
        footer={null}
        width={600}
      >
        {selectedWf && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">{selectedWf.description}</Text>

            <Divider>执行步骤</Divider>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedWf.steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={STEP_COLORS[step.type]}>{step.type}</Tag>
                  <Text strong style={{ color: '#e5e7eb' }}>{step.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12, flex: 1 }} code>
                    {JSON.stringify(step.config)}
                  </Text>
                  {idx < selectedWf.steps.length - 1 && (
                    <ArrowRightOutlined style={{ color: '#5a6ef5' }} />
                  )}
                </div>
              ))}
            </div>

            {selectedWf.steps.length === 0 && (
              <Text type="secondary">暂无步骤配置</Text>
            )}
          </Space>
        )}
      </Modal>

      {/* New workflow modal */}
      <Modal
        title="新建工作流"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => { form.submit(); setModalOpen(false) }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const wf: Workflow = {
              id: Date.now().toString(),
              name: values.name,
              description: values.description || '',
              enabled: false,
              trigger: values.trigger,
              runCount: 0,
              steps: [],
            }
            setWorkflows((prev) => [...prev, wf])
            message.success('工作流已创建')
            form.resetFields()
          }}
        >
          <Form.Item name="name" label="工作流名称" rules={[{ required: true }]}>
            <Input placeholder="例如：资讯推送" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="简短描述..." />
          </Form.Item>
          <Form.Item name="trigger" label="触发方式" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="webhook">Webhook</Select.Option>
              <Select.Option value="cron:0 9 * * *">定时（每天9点）</Select.Option>
              <Select.Option value="cron:*/30 * * * *">定时（每30分钟）</Select.Option>
              <Select.Option value="manual">手动</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>
    </div>
  )
}
