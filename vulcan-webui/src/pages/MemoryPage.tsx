import {{ Typography }} from 'antd'
const { Title } = Typography

export default function MemoryPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>🧠 记忆库</Title>
            <p style={{ color: '#9ca3af' }}>三层记忆系统：瞬时 → 短期（向量）→ 长期（SOUL）。</p>
        </div>
    )
}
