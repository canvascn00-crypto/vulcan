import { Typography, Card, List, Switch, Input, Button, Space } from 'antd'
import { SettingOutlined, GlobalOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function SettingsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3}>⚙️ 设置</Title>

      <Card title="🌐 模型配置" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>默认模型</Text>
            <Input placeholder="e.g. anthropic/claude-sonnet-4" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>API Base URL</Text>
            <Input placeholder="https://api.anthropic.com" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>API Key</Text>
            <Input.Password placeholder="sk-..." style={{ marginTop: 4 }} />
          </div>
        </Space>
      </Card>

      <Card title="🔧 渠道配置" style={{ marginBottom: 16 }}>
        <List size="small">
          <List.Item
            extra={<Switch defaultChecked />}
            actions={[<Button size="small">配置</Button>]}
          >
            <List.Item.Meta
              avatar={<GlobalOutlined style={{ fontSize: 20, color: '#5a6ef5' }} />}
              title="微信（WeChat）"
              description="Hermes WeChat Channel 已继承"
            />
          </List.Item>
          <List.Item extra={<Switch defaultChecked />}>
            <List.Item.Meta
              title="Telegram"
              description="已继承 28 渠道配置"
            />
          </List.Item>
        </List>
      </Card>

      <Card title="🔥 Vulcan 特性">
        <List size="small">
          <List.Item extra={<Switch defaultChecked />}>
            <Text>双核架构（Planner + Executor）</Text>
          </List.Item>
          <List.Item extra={<Switch defaultChecked />}>
            <Text>三层记忆（瞬时 + 短期 + 长期）</Text>
          </List.Item>
          <List.Item extra={<Switch />}>
            <Text>全链路可观测性</Text>
          </List.Item>
          <List.Item extra={<Switch />}>
            <Text>自我进化引擎</Text>
          </List.Item>
        </List>
      </Card>
    </div>
  )
}
