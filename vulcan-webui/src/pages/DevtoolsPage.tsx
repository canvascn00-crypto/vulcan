import {{ Typography }} from 'antd'
const { Title } = Typography

export default function DevtoolsPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>🧪 开发者工具链</Title>
            <p style={{ color: '#9ca3af' }}>MCP Server 管理、API Playground、本地调试。</p>
        </div>
    )
}
