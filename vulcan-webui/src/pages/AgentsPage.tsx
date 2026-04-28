import {{ Typography }} from 'antd'
const { Title } = Typography

export default function AgentsPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>👥 多 Agent 协作</Title>
            <p style={{ color: '#9ca3af' }}>A2A 消息总线，支持委托、查询、协作、投票。</p>
        </div>
    )
}
