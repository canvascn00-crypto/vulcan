import {{ Typography }} from 'antd'
const { Title } = Typography

export default function ObservabilityPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>🔭 可观测性</Title>
            <p style={{ color: '#9ca3af' }}>结构化日志 + 全链路 trace_id + 实时指标看板。</p>
        </div>
    )
}
