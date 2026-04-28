import {{ Typography }} from 'antd'
const { Title } = Typography

export default function SkillsPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>🛠️ 技能中心</Title>
            <p style={{ color: '#9ca3af' }}>管理、发现、安装 Vulcan 技能（SkillHub 集成）。</p>
        </div>
    )
}
