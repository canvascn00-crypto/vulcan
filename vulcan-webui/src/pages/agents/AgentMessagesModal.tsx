import { Input, message } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { DEMO_AGENTS } from './constants'
import type { Agent } from './types'

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
  formInput: {
    background: '#0D0D0F',
    border: '1px solid #2C2C31',
    borderRadius: '8px',
    color: '#FAFAFA',
  } as React.CSSProperties,
  submitBtn: {
    background: '#7065F3',
    border: 'none',
    borderRadius: '8px',
    height: '36px',
    fontWeight: 500,
  } as React.CSSProperties,
}

interface AgentMessagesModalProps {
  open: boolean
  selectedAgent: Agent | null
  onClose: () => void
}

export function AgentMessagesModal({ open: _open, selectedAgent, onClose: _onClose }: AgentMessagesModalProps) {
  if (!selectedAgent) return null

  const otherAgents = DEMO_AGENTS.filter(a => a.id !== selectedAgent.id).slice(0, 3)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {otherAgents.map(agent => (
          <div
            key={agent.id}
            style={{
              background: '#0D0D0F',
              border: '1px solid #2C2C31',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#FAFAFA', fontWeight: 500 }}>{agent.name}</span>
              <span style={{ color: '#A1A1AA', fontSize: '12px' }}>{agent.role}</span>
            </div>
            <Input.TextArea
              placeholder={`发送消息给 ${agent.name}...`}
              rows={2}
              style={styles.formInput}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={{ ...styles.submitBtn, color: '#fff' }}
          onClick={() => message.success('消息已发送')}
        >
          <SendOutlined style={{ marginRight: '6px' }} />
          发送消息
        </button>
      </div>
    </div>
  )
}
