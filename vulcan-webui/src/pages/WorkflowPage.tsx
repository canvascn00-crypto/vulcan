import {{ Typography }} from 'antd'
const { Title } = Typography

export default function WorkflowPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>⚡ 工作流编排</Title>
            <p style={{ color: '#9ca3af' }}>可视化编排 Agent 任务流程，拖拽连接工具节点。</p>
        </div>
    )
}
