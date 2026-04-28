import { Typography } from 'antd'
const { Title } = Typography

export default function MultimodalPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level={3}>🎤 多模态交互</Title>
            <p style={{ color: '#9ca3af' }}>语音输入 / 输出、视觉理解、实时摄像头交互。</p>
        </div>
    )
}
