import { Form, Input, Select, message } from 'antd'
import { CHANNEL_OPTIONS, MODEL_OPTIONS, CAPABILITY_OPTIONS } from './constants'

const styles = {
  modalHeader: {
    background: '#18181B',
    borderBottom: '1px solid #2C2C31',
  } as React.CSSProperties,
  modalTitle: {
    color: '#FAFAFA',
    fontSize: '16px',
    fontWeight: 600,
  } as React.CSSProperties,
  modalContent: {
    background: '#18181B',
    padding: '24px',
  } as React.CSSProperties,
  modalFooter: {
    background: '#18181B',
    borderTop: '1px solid #2C2C31',
    padding: '16px 24px',
  } as React.CSSProperties,
  formLabel: {
    color: '#A1A1AA',
    fontSize: '13px',
    marginBottom: '8px',
  } as React.CSSProperties,
  formInput: {
    background: '#0D0D0F',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
    color: '#FAFAFA',
  } as React.CSSProperties,
  formSelect: {
    background: '#0D0D0F',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
  } as React.CSSProperties,
  submitBtn: {
    background: '#7065F3',
    border: 'none',
    borderRadius: '8px',
    height: '36px',
    fontWeight: 500,
  } as React.CSSProperties,
}

// We re-export the page-level modal wrapper as a render-prop component
// so that the parent can still control open/close state.

interface AgentConfigModalProps {
  open: boolean
  onClose: () => void
}

export function AgentConfigModal({ open, onClose }: AgentConfigModalProps) {
  const [form] = Form.useForm()

  const handleSubmit = (values: any) => {
    message.success(`Agent ${values.name} 配置已保存`)
    onClose()
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="name"
        label={<span style={styles.formLabel}>Agent 名称</span>}
        rules={[{ required: true, message: '请输入 Agent 名称' }]}
      >
        <Input
          placeholder="例如：Researcher-γ"
          style={styles.formInput}
        />
      </Form.Item>

      <Form.Item
        name="role"
        label={<span style={styles.formLabel}>角色</span>}
        rules={[{ required: true, message: '请选择角色' }]}
      >
        <Select style={styles.formSelect}>
          <Select.Option value="planner">Planner（规划者）</Select.Option>
          <Select.Option value="executor">Executor（执行者）</Select.Option>
          <Select.Option value="coordinator">Coordinator（协调者）</Select.Option>
          <Select.Option value="specialist">Specialist（专家）</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="model"
        label={<span style={styles.formLabel}>使用模型</span>}
      >
        <Select style={styles.formSelect}>
          {MODEL_OPTIONS.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="channels"
        label={<span style={styles.formLabel}>通信渠道</span>}
      >
        <Select mode="multiple" style={styles.formSelect}>
          {CHANNEL_OPTIONS.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="capabilities"
        label={<span style={styles.formLabel}>能力 / 工具</span>}
      >
        <Select mode="multiple" style={styles.formSelect}>
          {CAPABILITY_OPTIONS.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          style={{ ...styles.submitBtn, flex: 1, color: '#fff' }}
          type="button"
          onClick={() => form.resetFields()}
        >
          取消
        </button>
        <button
          style={{ ...styles.submitBtn, flex: 2, color: '#fff' }}
          type="submit"
        >
          保存配置
        </button>
      </div>
    </Form>
  )
}
