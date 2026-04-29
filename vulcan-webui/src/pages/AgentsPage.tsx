import { useState, useRef } from 'react'
import { Form, Input, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { Agent } from './agents/types'
import { DEMO_AGENTS } from './agents/constants'
import { AgentGrid } from './agents/AgentGrid'
import { AgentConfigModal } from './agents/AgentConfigForm'
import { AgentMessagesModal } from './agents/AgentMessagesModal'
import { AgentPoolStatus } from './agents/AgentPoolStatus'

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  page: {
    padding: '24px',
    minHeight: '100vh',
    background: '#09090B',
    color: '#FAFAFA',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  } as React.CSSProperties,
  headerLeft: { flex: 1 } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#FAFAFA',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#A1A1AA',
    marginTop: '4px',
    marginBottom: 0,
  } as React.CSSProperties,
  searchInput: {
    width: '240px',
    background: '#18181B',
    borderColor: '#2C2C31',
    color: '#FAFAFA',
    borderRadius: '8px',
  } as React.CSSProperties,
  createBtn: {
    background: 'rgba(112, 101, 243, 0.15)',
    border: '1px solid rgba(112, 101, 243, 0.3)',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  } as React.CSSProperties,
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents] = useState<Agent[]>(DEMO_AGENTS)
  const [searchText, setSearchText] = useState('')
  const [configModal, setConfigModal] = useState(false)
  const [messagesModal, setMessagesModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [form] = Form.useForm()

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchText.toLowerCase()) ||
    a.role.toLowerCase().includes(searchText.toLowerCase())
  )

  const handleOpenConfig = (agent: Agent) => {
    setSelectedAgent(agent)
    form.setFieldsValue({
      name: agent.name,
      role: agent.role,
      model: agent.model,
      channels: ['a2a'],
      capabilities: agent.tools,
    })
    setConfigModal(true)
  }

  const handleOpenMessages = (agent: Agent) => {
    setSelectedAgent(agent)
    setMessagesModal(true)
  }

  const handleDelete = (agent: Agent) => {
    message.success(`Agent ${agent.name} 已删除`)
  }

  const handleSubmitConfig = (values: { name: string; role: string; model?: string; channels?: string[]; capabilities?: string[] }) => {
    message.success(`Agent ${values.name} 配置已保存`)
    setConfigModal(false)
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Agent 管理</h1>
          <p style={styles.subtitle}>管理和监控所有 AI Agent 状态</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Input
            placeholder="搜索 Agent..."
            prefix={<SearchOutlined style={{ color: '#A1A1AA' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={styles.searchInput}
            allowClear
          />
          <button style={{ ...styles.createBtn, color: '#fff' }} onClick={() => setConfigModal(true)}>
            <PlusOutlined /> 新建 Agent
          </button>
        </div>
      </div>

      {/* Stats + Grid + Modals */}
      <AgentPoolStatus agents={agents} />
      <AgentGrid
        agents={filteredAgents}
        onOpenConfig={handleOpenConfig}
        onOpenMessages={handleOpenMessages}
        onDelete={handleDelete}
      />
      <AgentConfigModal
        open={configModal}
        onClose={() => setConfigModal(false)}
      />
      <AgentMessagesModal
        open={messagesModal}
        selectedAgent={selectedAgent}
        onClose={() => setMessagesModal(false)}
      />
    </div>
  )
}
