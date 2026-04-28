import { useState } from 'react'
import { Row, Col, Card, Typography, Space, Tag, Switch, Table, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  LockOutlined,
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

interface SecurityCheck {
  key: string
  name: string
  status: 'pass' | 'fail'
  lastRun: string
}

interface Threat {
  key: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  sourceIp: string
  timestamp: string
}

interface PolicyToggle {
  key: string
  name: string
  description: string
  enabled: boolean
}

const securityChecks: SecurityCheck[] = [
  { key: '1', name: 'API 认证验证', status: 'pass', lastRun: '2分钟前' },
  { key: '2', name: '输入内容过滤', status: 'pass', lastRun: '2分钟前' },
  { key: '3', name: 'SQL 注入检测', status: 'pass', lastRun: '5分钟前' },
  { key: '4', name: 'XSS 跨站脚本检测', status: 'pass', lastRun: '5分钟前' },
  { key: '5', name: 'Rate Limit 检查', status: 'fail', lastRun: '1分钟前' },
  { key: '6', name: 'IP 黑名单验证', status: 'pass', lastRun: '3分钟前' },
  { key: '7', name: '敏感数据加密', status: 'pass', lastRun: '10分钟前' },
  { key: '8', name: 'WebSocket 安全', status: 'pass', lastRun: '2分钟前' },
]

const threats: Threat[] = [
  { key: '1', type: '暴力破解', severity: 'high', sourceIp: '192.168.1.105', timestamp: '10:23:45' },
  { key: '2', type: '异常请求频率', severity: 'medium', sourceIp: '10.0.0.42', timestamp: '10:15:30' },
  { key: '3', type: 'SQL 注入尝试', severity: 'critical', sourceIp: '172.16.0.88', timestamp: '09:58:12' },
  { key: '4', type: '爬虫行为', severity: 'low', sourceIp: '203.0.113.50', timestamp: '09:45:00' },
]

const policies: PolicyToggle[] = [
  { key: '1', name: 'Rate Limiting', description: '限制请求频率防止滥用', enabled: true },
  { key: '2', name: 'IP 白名单', description: '仅允许白名单IP访问', enabled: false },
  { key: '3', name: 'API Key 验证', description: '请求必须携带有效的 API Key', enabled: true },
  { key: '4', name: '内容过滤', description: '过滤敏感和不当内容', enabled: true },
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

export default function ShieldPage() {
  const [policyList, setPolicyList] = useState<PolicyToggle[]>(policies)
  const [overallStatus] = useState<'secure' | 'warning' | 'danger'>('warning')
  const [checksPassed] = useState(7)
  const [checksFailed] = useState(1)

  const handlePolicyToggle = (key: string) => {
    setPolicyList((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.error
      case 'high': return colors.warning
      case 'medium': return '#F59E0B'
      case 'low': return colors.success
      default: return colors.textSecondary
    }
  }

  const checkColumns: ColumnsType<SecurityCheck> = [
    {
      title: '检查项',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text style={{ color: colors.textPrimary }}>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Space>
          {status === 'pass' ? (
            <CheckCircleOutlined style={{ color: colors.success }} />
          ) : (
            <CloseCircleOutlined style={{ color: colors.error }} />
          )}
          <Tag color={status === 'pass' ? 'success' : 'error'} style={{ margin: 0 }}>
            {status === 'pass' ? '通过' : '失败'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '最后运行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (text) => <Text style={{ color: colors.textSecondary }}>{text}</Text>,
    },
  ]

  const threatColumns: ColumnsType<Threat> = [
    {
      title: '威胁类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <Text style={{ color: colors.textPrimary }}>{text}</Text>,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={severity} style={{ margin: 0 }}>
          {severity === 'critical' ? '严重' : severity === 'high' ? '高' : severity === 'medium' ? '中' : '低'}
        </Tag>
      ),
    },
    {
      title: '来源 IP',
      dataIndex: 'sourceIp',
      key: 'sourceIp',
      render: (ip) => <Text style={{ color: colors.textSecondary, fontFamily: 'monospace' }}>{ip}</Text>,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => <Text style={{ color: colors.textSecondary }}>{text}</Text>,
    },
  ]

  return (
    <div style={{ padding: 24, background: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ color: colors.textPrimary, margin: 0 }}>安全</Title>
          <Text style={{ color: colors.textSecondary }}>系统安全状态与威胁防护</Text>
        </div>
        <Badge
          status={overallStatus === 'secure' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error'}
          text={
            <Text style={{ color: overallStatus === 'secure' ? colors.success : overallStatus === 'warning' ? colors.warning : colors.error }}>
              {overallStatus === 'secure' ? '安全' : overallStatus === 'warning' ? '警告' : '危险'}
            </Text>
          }
        />
      </div>

      <Row gutter={[16, 16]}>
        {/* Shield Status Card */}
        <Col span={24}>
          <Card
            style={{
              ...cardStyle,
              background: overallStatus === 'secure' 
                ? 'linear-gradient(135deg, #18181B 0%, #1a2e1a 100%)'
                : overallStatus === 'warning'
                ? 'linear-gradient(135deg, #18181B 0%, #2e2a1a 100%)'
                : 'linear-gradient(135deg, #18181B 0%, #2e1a1a 100%)',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: overallStatus === 'secure' ? colors.success : overallStatus === 'warning' ? colors.warning : colors.error,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.2,
                  position: 'absolute',
                }}
              />
              <SafetyOutlined
                style={{
                  fontSize: 48,
                  color: overallStatus === 'secure' ? colors.success : overallStatus === 'warning' ? colors.warning : colors.error,
                }}
              />
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ color: colors.textPrimary, margin: 0 }}>
                  安全状态: {overallStatus === 'secure' ? '已防护' : overallStatus === 'warning' ? '需关注' : '存在风险'}
                </Title>
                <Text style={{ color: colors.textSecondary }}>
                  系统安全检查已完成，发现 {checksPassed} 项通过，{checksFailed} 项需要处理
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <Text style={{ color: colors.success, fontSize: 24, fontWeight: 600 }}>{checksPassed}</Text>
                    <br />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>通过</Text>
                  </div>
                  <div>
                    <Text style={{ color: colors.error, fontSize: 24, fontWeight: 600 }}>{checksFailed}</Text>
                    <br />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>失败</Text>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Security Checks Card */}
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <SafetyCertificateOutlined style={{ color: colors.accent }} />
                安全检查项
              </Space>
            </div>
            <Table
              dataSource={securityChecks}
              columns={checkColumns}
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>

        {/* Threat Detection Card */}
        <Col xs={24} lg={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <AlertOutlined style={{ color: colors.error }} />
                威胁检测
              </Space>
            </div>
            <Table
              dataSource={threats}
              columns={threatColumns}
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>

        {/* Policy Card */}
        <Col span={24}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 20 } }}
          >
            <div style={headerStyle}>
              <Space>
                <LockOutlined style={{ color: colors.accent }} />
                安全策略
              </Space>
            </div>
            <Row gutter={[12, 12]}>
              {policyList.map((policy) => (
                <Col xs={24} sm={12} key={policy.key}>
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
                    <div>
                      <Text style={{ color: colors.textPrimary, fontWeight: 500 }}>{policy.name}</Text>
                      <br />
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{policy.description}</Text>
                    </div>
                    <Switch
                      checked={policy.enabled}
                      onChange={() => handlePolicyToggle(policy.key)}
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
