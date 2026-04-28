import {{ Typography }} from 'antd'
const { Title } = Typography

export default function ShieldPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>🛡️ 安全与隐私</Title>
            <p style={{ color: '#9ca3af' }}>PII 检测与脱敏、敏感操作二次确认、数据加密传输。</p>
        </div>
    )
}
