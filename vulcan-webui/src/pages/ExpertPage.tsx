import { useState, useEffect } from 'react'
import {
  Typography, Card, Row, Col, Button, Space, Badge, Avatar, message
} from 'antd'
import {
  UserSwitchOutlined, RobotOutlined, SyncOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'
import type {
  ExpertMatch, IntentResult, DecompositionResult,
  ExecutionPlan, ExecutionResult, ExpertProfile, DomainInfo
} from './expert/types'
import { DOMAINS } from './expert/constants'
import { ExpertPool } from './expert/ExpertPool'
import { TaskInputPanel } from './expert/TaskInputPanel'
import { ResultsPanel } from './expert/ResultsPanel'
import { ExpertSidebar } from './expert/ExpertSidebar'

const { Title, Text } = Typography

export default function ExpertPage() {
  const [taskInput, setTaskInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('intent')

  // Intent & Decomposition results
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null)
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null)
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  // Expert pool
  const [allExperts, setAllExperts] = useState<ExpertMatch[]>([])
  const [domainFilter, setDomainFilter] = useState<string>('全部')
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  const [activeExperts, setActiveExperts] = useState<ExpertProfile[]>([])

  // Domain stats
  const [domainStats, setDomainStats] = useState<DomainInfo[]>([])

  // Load initial data
  useEffect(() => {
    loadExperts()
    loadDomainStats()
    loadActiveExperts()
  }, [])

  const loadExperts = async () => {
    try {
      const data = await api.get<ExpertMatch[]>('/experts/')
      setAllExperts(data)
    } catch (e) {
      console.error('Failed to load experts', e)
    }
  }

  const loadDomainStats = async () => {
    try {
      const data = await api.get<{ domains: Array<{ domain: string; count: number; avg_success_rate: number; tier_breakdown: Record<string, number> }> }>('/experts/domain-stats')
      const infos: DomainInfo[] = data.domains.map(d => ({
        ...d,
        ...(DOMAINS[d.domain] || { icon: <UserSwitchOutlined />, color: '#6b7280' })
      }))
      setDomainStats(infos)
    } catch (e) {
      console.error('Failed to load domain stats', e)
    }
  }

  const loadActiveExperts = async () => {
    try {
      const data = await api.get<{ experts: ExpertProfile[] }>('/experts/orchestrate/experts')
      setActiveExperts(data.experts)
    } catch (e) {
      console.error('Failed to load active experts', e)
    }
  }

  // ─── Task Processing ───────────────────────────────────────────────

  const handleClassify = async () => {
    if (!taskInput.trim()) {
      message.warning('请输入任务描述')
      return
    }
    setLoading(true)
    try {
      const [intent, decomp, plan] = await Promise.all([
        api.post<IntentResult>('/experts/intent/classify', { user_input: taskInput }),
        api.post<DecompositionResult>('/experts/decompose', { goal: taskInput }),
        api.post<ExecutionPlan>('/experts/orchestrate/plan', { user_input: taskInput })
      ])
      setIntentResult(intent)
      setDecomposition(decomp)
      setExecutionPlan(plan)
      setExecutionResult(null)
      message.success('任务分析完成')
    } catch (e: any) {
      message.error('分析失败: ' + (e.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!taskInput.trim()) return
    setLoading(true)
    try {
      const result = await api.post<ExecutionResult>('/experts/orchestrate/process', {
        user_input: taskInput
      })
      setExecutionResult(result)
      message.success('执行完成')
    } catch (e: any) {
      message.error('执行失败: ' + (e.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Expert Selection ────────────────────────────────────────────────

  const handleSelectExpert = (expertId: string) => {
    setSelectedExperts(prev =>
      prev.includes(expertId)
        ? prev.filter(id => id !== expertId)
        : [...prev, expertId]
    )
  }

  const filteredExperts = domainFilter === '全部'
    ? allExperts
    : allExperts.filter(e => e.domain === domainFilter)

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, background: '#0D0D0F', minHeight: '100vh' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Header */}
        <Card
          style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Avatar
                size={40}
                style={{ background: '#7065F3', fontSize: 20 }}
                icon={<RobotOutlined />}
              />
              <div>
                <Title level={4} style={{ color: '#FAFAFA', margin: 0 }}>
                  🧠 专家工作台
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  100 AI专家 · 自适应识别 · 自动任务拆解 · 多Agent编排
                </Text>
              </div>
            </Space>
            <Space>
              <Badge count={activeExperts.filter(e => e.status === 'busy').length} size="small">
                <Button icon={<UserSwitchOutlined />}>活跃专家</Button>
              </Badge>
              <Button icon={<SyncOutlined spin={loading} />} onClick={() => { loadExperts(); loadActiveExperts(); }}>
                刷新
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Main Grid */}
        <Row gutter={16}>
          {/* Left: Expert Pool */}
          <Col span={6}>
            <ExpertPool
              domainStats={domainStats}
              domainFilter={domainFilter}
              filteredExperts={filteredExperts}
              selectedExperts={selectedExperts}
              onSelectExpert={handleSelectExpert}
              onDomainFilterChange={setDomainFilter}
            />
          </Col>

          {/* Center: Task Input + Results */}
          <Col span={12}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <TaskInputPanel
                taskInput={taskInput}
                loading={loading}
                onTaskInputChange={setTaskInput}
                onClassify={handleClassify}
                onExecute={handleExecute}
                onClear={() => {
                  setTaskInput('')
                  setIntentResult(null)
                  setDecomposition(null)
                  setExecutionPlan(null)
                  setExecutionResult(null)
                }}
              />
              <ResultsPanel
                activeTab={activeTab}
                onTabChange={setActiveTab}
                intentResult={intentResult}
                decomposition={decomposition}
                executionPlan={executionPlan}
                executionResult={executionResult}
              />
            </Space>
          </Col>

          {/* Right: Active Experts + Quick Stats */}
          <Col span={6}>
            <ExpertSidebar
              activeExperts={activeExperts}
              executionPlan={executionPlan}
            />
          </Col>
        </Row>
      </Space>
    </div>
  )
}
