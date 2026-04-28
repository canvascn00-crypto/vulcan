import { Typography, Card, Row, Col } from 'antd'

const { Title, Text } = Typography

export default function DashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>📊 监控面板</Title>
      <Row gutter={16} style={{ marginTop: 16 }}>
        {[
          { title: '活跃 Agent', value: '3', color: '#5a6ef5' },
          { title: '今日对话', value: '127', color: '#10b981' },
          { title: '工具调用', value: '892', color: '#f59e0b' },
          { title: '平均延迟', value: '1.2s', color: '#ef4444' },
        ].map((stat) => (
          <Col span={6} key={stat.title}>
            <Card style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <Text type="secondary">{stat.title}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
