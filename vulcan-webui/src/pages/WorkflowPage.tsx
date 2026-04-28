import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Button, Table, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  PlayCircleOutlined,
  NodeIndexOutlined,
  ApiOutlined,
  RobotOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ToolOutlined,
  BulbOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// Color tokens - Claude style
const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  accent: '#7065F3',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  hover: '#27272A',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  steps: number
}

interface ActiveWorkflow {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  startedAt: string
  actions?: string
}

const templates: WorkflowTemplate[] = [
  {
    id: '1',
    name: '内容采集',
    description: '自动采集网页内容并提取关键信息',
    icon: <FileTextOutlined style={{ fontSize: 32 }} />,
    steps: 4,
  },
  {
    id: '2',
    name: '数据分析',
    description: '对输入数据进行分析并生成可视化报告',
    icon: <BarChartOutlined style={{ fontSize: 32 }} />,
    steps: 5,
  },
  {
    id: '3',
    name: '智能客服',
    description: '基于知识库的自动问答系统',
    icon: <RobotOutlined style={{ fontSize: 32 }} />,
    steps: 3,
  },
  {
    id: '4',
    name: '定时任务',
    description: '设置定时执行的自动化任务',
    icon: <ToolOutlined style={{ fontSize: 32 }} />,
    steps: 2,
  },
  {
    id: '5',
    name: 'API 集成',
    description: '连接外部 API 并处理响应数据',
    icon: <ApiOutlined style={{ fontSize: 32 }} />,
    steps: 4,
  },
  {
    id: '6',
    name: '创意生成',
    description: '使用 AI 生成创意内容和建议',
    icon: <BulbOutlined style={{ fontSize: 32 }} />,
    steps: 3,
  },
]

const activeWorkflows: ActiveWorkflow[] = [
  { id: '1', name: '日报生成', status: 'running', progress: 65, startedAt: '10:23:15', actions: '查看' },
  { id: '2', name: '数据同步', status: 'completed', progress: 100, startedAt: '09:45:00', actions: '日志' },
  { id: '3', name: '内容采集', status: 'failed', progress: 42, startedAt: '10:05:30', actions: '重试' },
  { id: '4', name: '报告导出', status: 'paused', progress: 80, startedAt: '09:30:00', actions: '继续' },
  { id: '5', name: '批量处理', status: 'running', progress: 23, startedAt: '10:15:45', actions: '查看' },
]

const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
}

const headerStyle: React.CSSProperties = {
  color: colors.textPrimary,
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 16,
}

export default function WorkflowPage() {
  const [workflows] = useState<ActiveWorkflow[]>(activeWorkflows)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge status="processing" text={<Text style={{ color: colors.accent }}>运行中</Text>} />
      case 'completed':
        return <Badge status="success" text={<Text style={{ color: colors.success }}>已完成</Text>} />
      case 'failed':
        return <Badge status="error" text={<Text style={{ color: colors.error }}>失败</Text>} />
      case 'paused':
        return <Badge status="warning" text={<Text style={{ color: colors.warning }}>已暂停</Text>} />
      default:
        return null
    }
  }

  const workflowColumns: ColumnsType<ActiveWorkflow> = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text style={{ color: colors.textPrimary }}>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusBadge(status),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              background: colors.border,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: record.status === 'failed' ? colors.error : record.status === 'completed' ? colors.success : colors.accent,
                borderRadius: 3,
              }}
            />
          </div>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{progress}%</Text>
        </div>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (text) => <Text style={{ color: colors.textSecondary }}>{text}</Text>,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<NodeIndexOutlined />}
            style={{ color: colors.accent }}
          >
            {record.actions}
          </Button>
          {record.status === 'running' && (
            <Button
              type="text"
              size="small"
              danger
            >
              停止
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, background: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ color: colors.textPrimary, margin: 0 }}>工作流</Title>
          <Text style={{ color: colors.textSecondary }}>自动化任务编排与执行</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: colors.accent, borderColor: colors.accent }}
        >
          新建工作流
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Workflow Templates - 3 Column Grid */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>工作流模板</div>
            <Row gutter={[12, 12]}>
              {templates.map((template) => (
                <Col xs={24} sm={12} lg={8} key={template.id}>
                  <div
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ color: colors.accent }}>
                        {template.icon}
                      </div>
                      <Tag style={{ background: colors.hover, border: 'none', color: colors.textSecondary }}>
                        {template.steps} 步骤
                      </Tag>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: 500, fontSize: 14 }}>
                        {template.name}
                      </Text>
                      <br />
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {template.description}
                      </Text>
                    </div>
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      style={{
                        marginTop: 12,
                        width: '100%',
                        borderColor: colors.accent,
                        color: colors.accent,
                      }}
                    >
                      使用
                    </Button>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Active Workflows Card */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>运行中的工作流</div>
            <Table
              dataSource={workflows}
              columns={workflowColumns}
              pagination={false}
              size="middle"
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>

        {/* Workflow Builder Card - Coming Soon */}
        <Col span={24}>
          <Card
            style={{
              ...cardStyle,
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            styles={{ body: { padding: 40, width: '100%', textAlign: 'center' } }}
          >
            <div>
              <ClockCircleOutlined style={{ fontSize: 64, color: colors.textSecondary, marginBottom: 16 }} />
              <Title level={4} style={{ color: colors.textPrimary, margin: 0 }}>
                可视化工作流编辑器
              </Title>
              <Text style={{ color: colors.textSecondary, display: 'block', marginTop: 8 }}>
                即将推出 - 拖拽式界面，轻松编排复杂工作流
              </Text>
              <div style={{ marginTop: 24 }}>
                <Tag style={{ background: colors.hover, border: 'none', color: colors.accent }}>
                  敬请期待
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
