import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Switch, Progress, Input, Button, Select } from 'antd'
import {
  FileTextOutlined,
  PictureOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FileOutlined,
  CodeOutlined,
  SendOutlined,
  PlayCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { TextArea } = Input

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

interface Capability {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
  status: 'enabled' | 'disabled'
}

interface QueuedTask {
  id: string
  type: string
  prompt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  timestamp: Date
}

const capabilities: Capability[] = [
  { id: 'text', name: '文本', icon: <FileTextOutlined style={{ fontSize: 24 }} />, enabled: true, status: 'enabled' },
  { id: 'image', name: '图像', icon: <PictureOutlined style={{ fontSize: 24 }} />, enabled: true, status: 'enabled' },
  { id: 'audio', name: '音频', icon: <AudioOutlined style={{ fontSize: 24 }} />, enabled: false, status: 'disabled' },
  { id: 'video', name: '视频', icon: <VideoCameraOutlined style={{ fontSize: 24 }} />, enabled: false, status: 'disabled' },
  { id: 'document', name: '文档', icon: <FileOutlined style={{ fontSize: 24 }} />, enabled: true, status: 'enabled' },
  { id: 'code', name: '代码', icon: <CodeOutlined style={{ fontSize: 24 }} />, enabled: true, status: 'enabled' },
]

const mockQueue: QueuedTask[] = [
  { id: '1', type: 'image', prompt: '生成一张科技感海报', status: 'processing', progress: 65, timestamp: new Date(Date.now() - 2 * 60000) },
  { id: '2', type: 'text', prompt: '总结这份文档的核心要点', status: 'pending', progress: 0, timestamp: new Date(Date.now() - 1 * 60000) },
  { id: '3', type: 'code', prompt: '解释这段Python代码的功能', status: 'completed', progress: 100, timestamp: new Date(Date.now() - 5 * 60000) },
  { id: '4', type: 'document', prompt: '将PDF转换为Markdown格式', status: 'failed', progress: 30, timestamp: new Date(Date.now() - 10 * 60000) },
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

export default function MultimodalPage() {
  const [capabilityList, setCapabilityList] = useState<Capability[]>(capabilities)
  const [selectedModality, setSelectedModality] = useState<string>('text')
  const [prompt, setPrompt] = useState('')
  const [previewOutput, setPreviewOutput] = useState('')
  const [queue] = useState<QueuedTask[]>(mockQueue)

  const handleToggle = (id: string) => {
    setCapabilityList((prev) =>
      prev.map((cap) =>
        cap.id === id ? { ...cap, enabled: !cap.enabled, status: !cap.enabled ? 'enabled' : 'disabled' } : cap
      )
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled': return colors.success
      case 'disabled': return colors.textSecondary
      case 'processing': return colors.accent
      case 'completed': return colors.success
      case 'failed': return colors.error
      case 'pending': return colors.warning
      default: return colors.textSecondary
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: 24, background: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: colors.textPrimary, margin: 0 }}>多模态</Title>
        <Text style={{ color: colors.textSecondary }}>支持多种模态内容的生成与处理</Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* Capabilities Grid - 2x3 */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>能力矩阵</div>
            <Row gutter={[12, 12]}>
              {capabilityList.map((cap) => (
                <Col xs={12} sm={8} key={cap.id}>
                  <div
                    style={{
                      background: cap.enabled ? colors.hover : colors.bg,
                      border: `1px solid ${cap.enabled ? colors.accent : colors.border}`,
                      borderRadius: 8,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ color: cap.enabled ? colors.accent : colors.textSecondary }}>
                      {cap.icon}
                    </div>
                    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{cap.name}</Text>
                    <Tag
                      color={cap.enabled ? 'success' : 'default'}
                      style={{ fontSize: 10, margin: 0 }}
                    >
                      {cap.status === 'enabled' ? '已启用' : '已禁用'}
                    </Tag>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Demo Card */}
        <Col xs={24} lg={14}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>多模态演示</div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Select
                value={selectedModality}
                onChange={setSelectedModality}
                style={{ width: '100%' }}
                options={[
                  { value: 'text', label: '文本生成' },
                  { value: 'image', label: '图像生成' },
                  { value: 'audio', label: '语音合成' },
                  { value: 'video', label: '视频生成' },
                  { value: 'document', label: '文档处理' },
                  { value: 'code', label: '代码生成' },
                ]}
              />
              <TextArea
                placeholder="输入提示词..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                style={{ background: colors.bg, borderColor: colors.border, color: colors.textPrimary }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                style={{ background: colors.accent, borderColor: colors.accent }}
              >
                生成
              </Button>
              <div
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: 16,
                  minHeight: 120,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>输出预览</Text>
                <div style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.textPrimary }}>
                    {previewOutput || '生成的內容將在此處顯示...'}
                  </Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Processing Queue Card */}
        <Col xs={24} lg={10}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>处理队列</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {queue.map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Space>
                      <Tag color={task.type === 'text' ? 'blue' : task.type === 'image' ? 'purple' : task.type === 'code' ? 'green' : 'orange'}>
                        {task.type}
                      </Tag>
                      <Text style={{ color: colors.textPrimary, fontSize: 12 }}>{task.prompt}</Text>
                    </Space>
                    {task.status === 'processing' && <LoadingOutlined style={{ color: colors.accent }} />}
                  </div>
                  <Progress
                    percent={task.progress}
                    size="small"
                    strokeColor={getStatusColor(task.status)}
                    trailColor={colors.border}
                    status={task.status === 'failed' ? 'exception' : task.status === 'completed' ? 'success' : 'active'}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                    {formatTime(task.timestamp)} · {task.status === 'pending' ? '等待中' : task.status === 'processing' ? '处理中' : task.status === 'completed' ? '已完成' : '失败'}
                  </Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Settings Card */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>模态设置</div>
            <Row gutter={[16, 16]}>
              {capabilityList.map((cap) => (
                <Col xs={12} sm={6} key={cap.id}>
                  <div
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Space>
                      <div style={{ color: cap.enabled ? colors.accent : colors.textSecondary }}>
                        {cap.icon}
                      </div>
                      <Text style={{ color: colors.textPrimary }}>{cap.name}</Text>
                    </Space>
                    <Switch
                      checked={cap.enabled}
                      onChange={() => handleToggle(cap.id)}
                      checkedChildren="开"
                      unCheckedChildren="关"
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
