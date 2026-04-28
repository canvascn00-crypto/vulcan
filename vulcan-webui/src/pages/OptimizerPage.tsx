import {{ Typography }} from 'antd'
const { Title } = Typography

export default function OptimizerPagePage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level=3>📦 模型优化器</Title>
            <p style={{ color: '#9ca3af' }}>GGUF 量化压缩、TensorRT 加速、批量推理优化。</p>
        </div>
    )
}
