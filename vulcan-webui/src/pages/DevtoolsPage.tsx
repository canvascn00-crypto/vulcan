import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Input, Button, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ApiOutlined,
  FileTextOutlined,
  GatewayOutlined,
  ConsoleSqlOutlined,
  SettingOutlined,
  SendOutlined,
  LinkOutlined,
  BugOutlined,
  DatabaseOutlined,
  CloudOutlined,
  CodeOutlined,
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

interface Tool {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

interface LogEntry {
  key: string
  level: 'INFO' | 'WARN' | 'ERROR'
  timestamp: string
  message: string
}

interface QuickLink {
  name: string
  url: string
  description: string
}

const tools: Tool[] = [
  { id: 'api', name: 'API Explorer', icon: <ApiOutlined style={{ fontSize: 28 }} />, description: '测试 REST API 端点' },
  { id: 'schema', name: 'Schema Viewer', icon: <FileTextOutlined style={{ fontSize: 28 }} />, description: '查看数据模型结构' },
  { id: 'ws', name: 'WebSocket Tester', icon: <GatewayOutlined style={{ fontSize: 28 }} />, description: '测试 WebSocket 连接' },
  { id: 'logs', name: 'Log Viewer', icon: <ConsoleSqlOutlined style={{ fontSize: 28 }} />, description: '查看系统日志' },
  { id: 'config', name: 'Config Editor', icon: <SettingOutlined style={{ fontSize: 28 }} />, description: '编辑配置文件' },
  { id: 'terminal', name: 'Terminal', icon: <ConsoleSqlOutlined style={{ fontSize: 28 }} />, description: '命令行终端' },
]

const mockLogs: LogEntry[] = [
  { key: '1', level: 'INFO', timestamp: '10:23:45.123', message: 'Server started on port 3000' },
  { key: '2', level: 'INFO', timestamp: '10:23:46.456', message: 'Database connection established' },
  { key: '3', level: 'WARN', timestamp: '10:24:12.789', message: 'High memory usage detected: 85%' },
  { key: '4', level: 'ERROR', timestamp: '10:25:01.234', message: 'Failed to connect to external API: timeout' },
  { key: '5', level: 'INFO', timestamp: '10:25:15.567', message: 'Retrying connection attempt 1/3' },
  { key: '6', level: 'INFO', timestamp: '10:25:16.890', message: 'Connection restored successfully' },
  { key: '7', level: 'WARN', timestamp: '10:26:00.123', message: 'Rate limit approaching for client 192.168.1.50' },
  { key: '8', level: 'INFO', timestamp: '10:26:30.456', message: 'Scheduled task completed: data-sync' },
  { key: '9', level: 'ERROR', timestamp: '10:27:15.789', message: 'Unhandled exception in worker thread' },
  { key: '10', level: 'INFO', timestamp: '10:27:20.012', message: 'Health check passed: all systems operational' },
]

const quickLinks: QuickLink[] = [
  { name: 'API Documentation', url: '/docs/api', description: '完整的 API 参考文档' },
  { name: 'MCP Servers', url: '/docs/mcp', description: 'MCP 服务器配置指南' },
  { name: 'SDK Examples', url: '/docs/sdk', description: '多语言 SDK 使用示例' },
  { name: 'System Status', url: '/status', description: '查看系统运行状态' },
  { name: 'GitHub Repository', url: 'https://github.com/example/vulcan', description: '源代码与 Issue 追踪' },
  { name: 'Discord Community', url: 'https://discord.gg/example', description: '社区讨论与支持' },
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

export default function DevtoolsPage() {
  const [endpoint, setEndpoint] = useState('')
  const [method, setMethod] = useState('GET')
  const [requestBody, setRequestBody] = useState('')
  const [responsePreview, setResponsePreview] = useState('')
  const [activeTool, setActiveTool] = useState<string | null>(null)

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return colors.accent
      case 'WARN': return colors.warning
      case 'ERROR': return colors.error
      default: return colors.textSecondary
    }
  }

  const logColumns: ColumnsType<LogEntry> = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => (
        <Tag color={level === 'INFO' ? 'processing' : level === 'WARN' ? 'warning' : 'error'} style={{ margin: 0 }}>
          {level}
        </Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (text) => <Text style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: 12 }}>{text}</Text>,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (text) => <Text style={{ color: colors.textPrimary }}>{text}</Text>,
    },
  ]

  return (
    <div style={{ padding: 24, background: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: colors.textPrimary, margin: 0 }}>DevTools</Title>
        <Text style={{ color: colors.textSecondary }}>开发者工具集</Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* Tools Grid - 2x3 */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>工具集</div>
            <Row gutter={[12, 12]}>
              {tools.map((tool) => (
                <Col xs={12} sm={8} lg={4} key={tool.id}>
                  <div
                    onClick={() => setActiveTool(tool.id === activeTool ? null : tool.id)}
                    style={{
                      background: activeTool === tool.id ? colors.hover : colors.bg,
                      border: `1px solid ${activeTool === tool.id ? colors.accent : colors.border}`,
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ color: activeTool === tool.id ? colors.accent : colors.textSecondary }}>
                      {tool.icon}
                    </div>
                    <Text style={{ color: colors.textPrimary, fontSize: 12, display: 'block', marginTop: 8 }}>
                      {tool.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                      {tool.description}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* API Explorer Card */}
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <ApiOutlined style={{ color: colors.accent }} />
                API Explorer
              </Space>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Space style={{ width: '100%' }}>
                <Select
                  value={method}
                  onChange={setMethod}
                  style={{ width: 100 }}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' },
                  ]}
                />
                <Input
                  placeholder="Enter API endpoint URL"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  style={{ flex: 1, background: colors.bg, borderColor: colors.border }}
                />
              </Space>
              <TextArea
                placeholder="Request body (JSON)"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={4}
                style={{ background: colors.bg, borderColor: colors.border, color: colors.textPrimary }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                style={{ background: colors.accent, borderColor: colors.accent }}
              >
                发送请求
              </Button>
              <div
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: 16,
                  minHeight: 150,
                  maxHeight: 250,
                  overflow: 'auto',
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>响应预览</Text>
                <pre style={{ color: colors.textPrimary, fontSize: 12, margin: '8px 0 0 0' }}>
                  {responsePreview || 'Response will appear here...'}
                </pre>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Log Viewer Card */}
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <ConsoleSqlOutlined style={{ color: colors.accent }} />
                Log Viewer
              </Space>
            </div>
            <Table
              dataSource={mockLogs}
              columns={logColumns}
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>

        {/* Quick Links Card */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <LinkOutlined style={{ color: colors.accent }} />
                快速链接
              </Space>
            </div>
            <Row gutter={[12, 12]}>
              {quickLinks.map((link) => (
                <Col xs={24} sm={12} lg={8} key={link.name}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: 16,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Text style={{ color: colors.accent, fontWeight: 500 }}>{link.name}</Text>
                    <br />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{link.description}</Text>
                  </a>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
