import { useState, useEffect, useCallback } from 'react'
import {
  Typography, Card, Row, Col, Tag, Button, Space, Input, Select,
  Modal, message, Spin, Badge, Tooltip, Divider, Alert, Statistic,
  List, Avatar, Progress, Timeline, Collapse, Switch, Popconfirm, Tabs
} from 'antd'
import {
  UserSwitchOutlined, ThunderboltOutlined, ExperimentOutlined,
  CheckCircleOutlined, LoadingOutlined, AimOutlined, BulbOutlined,
  SafetyOutlined, DashboardOutlined, BuildOutlined, RobotOutlined,
  SearchOutlined, PlusOutlined, PlayCircleOutlined, SyncOutlined,
  ClockCircleOutlined, FallOutlined, RiseOutlined, BarChartOutlined,
  ClusterOutlined, NodeIndexOutlined, ArrowRightOutlined,
  FireOutlined, StarOutlined, CrownOutlined
} from '@ant-design/icons'
import { api } from '@/services/api'

const { Title, Text, Paragraph } = Typography
const { Search } = Input
const { TextArea } = Input
const { Panel } = Collapse

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpertMatch {
  expert_id: string
  name: string
  title: string
  domain: string
  match_score: number
  reason: string
  tier: string
  model_preference: string
}

interface IntentResult {
  raw_input: string
  language: string
  primary_intent: string
  secondary_intents: string[]
  confidence: number
  intent_keywords: string[]
  task_complexity: string
  decomposition_needed: boolean
  suggested_strategy: string
  suggested_experts: ExpertMatch[]
}

interface SubTask {
  id: string
  description: string
  assigned_expert_id: string | null
  assigned_expert_name: string | null
  status: string
  priority: number
  dependencies: string[]
}

interface DecompositionResult {
  original_goal: string
  sub_tasks: SubTask[]
  total_experts_needed: number
  estimated_total_tokens: number
  estimated_duration_sec: number
  complexity_level: string
  execution_strategy: string
  summary: string
}

interface ExecutionStage {
  stage_id: string
  expert_ids: string[]
  subtask_ids: string[]
  can_parallel: boolean
}

interface ExecutionPlan {
  plan_id: string
  original_goal: string
  strategy: string
  stages: ExecutionStage[]
  estimated_duration_sec: number
  estimated_tokens: number
}

interface TaskResult {
  expert_id: string
  expert_name: string
  task_id: string
  status: string
  result: string | null
  output_tokens: number
  execution_time_sec: number
  error: string | null
}

interface ExecutionResult {
  plan_id: string
  status: string
  results: TaskResult[]
  final_summary: string
  total_execution_time_sec: number
  total_tokens: number
}

interface ExpertProfile {
  expert_id: string
  name: string
  status: string
  current_task: string | null
  tasks_completed: number
  success_rate: number
}

interface DomainInfo {
  domain: string
  name: string
  count: number
  avg_success_rate: number
  icon: React.ReactNode
  color: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOMAINS: Record<string, Omit<DomainInfo, 'domain'>> = {
  '科研': { name: '科研 Science', count: 10, avg_success_rate: 0.92, icon: <ExperimentOutlined />, color: '#8b5cf6' },
  '技术': { name: '技术 Engineering', count: 15, avg_success_rate: 0.93, icon: <BuildOutlined />, color: '#3b82f6' },
  '数据': { name: '数据 Data', count: 10, avg_success_rate: 0.91, icon: <BarChartOutlined />, color: '#10b981' },
  '商业': { name: '商业 Business', count: 10, avg_success_rate: 0.90, icon: <RiseOutlined />, color: '#f59e0b' },
  '内容': { name: '内容 Content', count: 10, avg_success_rate: 0.89, icon: <BulbOutlined />, color: '#ec4899' },
  '分析': { name: '分析 Analysis', count: 10, avg_success_rate: 0.92, icon: <AimOutlined />, color: '#06b6d4' },
  '安全': { name: '安全 Security', count: 8, avg_success_rate: 0.92, icon: <SafetyOutlined />, color: '#ef4444' },
  '运营': { name: '运营 DevOps', count: 10, avg_success_rate: 0.92, icon: <NodeIndexOutlined />, color: '#84cc16' },
  '产品': { name: '产品 Product', count: 9, avg_success_rate: 0.90, icon: <DashboardOutlined />, color: '#f97316' },
  '数学': { name: '数学 Math', count: 8, avg_success_rate: 0.94, icon: <ClusterOutlined />, color: '#a855f7' },
}

const TIER_COLORS: Record<string, string> = {
  elite: '#fbbf24',
  expert: '#a855f7',
  proficient: '#3b82f6',
  associate: '#6b7280'
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  elite: <CrownOutlined />,
  expert: <StarOutlined />,
  proficient: <CheckCircleOutlined />,
  associate: <UserSwitchOutlined />
}

const STRATEGY_COLORS: Record<string, string> = {
  single_expert: '#6b7280',
  parallel_experts: '#10b981',
  sequential_chain: '#3b82f6',
  hierarchical: '#f59e0b'
}

const COMPLEXITY_COLORS: Record<string, string> = {
  simple: '#10b981',
  moderate: '#f59e0b',
  complex: '#f97316',
  very_complex: '#ef4444'
}

// ─── Helper Components ────────────────────────────────────────────────────────

const TierTag = ({ tier }: { tier: string }) => (
  <Tag color={TIER_COLORS[tier] || '#6b7280'} icon={TIER_ICONS[tier]}>
    {tier.charAt(0).toUpperCase() + tier.slice(1)}
  </Tag>
)

const ScoreBar = ({ score }: { score: number }) => (
  <Progress
    percent={Math.round(score * 100)}
    size="small"
    strokeColor={score > 0.8 ? '#10b981' : score > 0.6 ? '#f59e0b' : '#ef4444'}
    showInfo={false}
    style={{ width: 80 }}
  />
)

const ExpertCard = ({ expert, selected, onSelect }: { expert: ExpertMatch; selected: boolean; onSelect: () => void }) => (
  <Card
    size="small"
    hoverable
    onClick={onSelect}
    style={{
      border: selected ? '2px solid #7065F3' : '1px solid #2C2C31',
      background: selected ? '#1a1a2e' : '#18181B',
      cursor: 'pointer',
      borderRadius: 8,
    }}
    bodyStyle={{ padding: 10 }}
  >
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Space>
        <Text strong style={{ color: '#FAFAFA', fontSize: 12 }}>{expert.name}</Text>
        <TierTag tier={expert.tier} />
      </Space>
      <Text type="secondary" style={{ fontSize: 10, color: '#9ca3af' }}>{expert.title}</Text>
      <Space>
        <Tag color={DOMAINS[expert.domain]?.color || '#6b7280'} style={{ fontSize: 10 }}>
          {expert.domain}
        </Tag>
        <ScoreBar score={expert.match_score} />
      </Space>
    </Space>
  </Card>
)

// ─── Main Component ────────────────────────────────────────────────────────────

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

  // ─── Task Processing ───────────────────────────────────────────────────────

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

  // ─── Expert Selection ────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

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
            <Card
              title={<Space><NodeIndexOutlined /> 专家池 (100位)</Space>}
              style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}
            >
              {/* Domain Stats */}
              <div style={{ padding: '12px 12px 0' }}>
                <Row gutter={[8, 8]}>
                  {domainStats.map(d => (
                    <Col span={12} key={d.domain}>
                      <Card
                        size="small"
                        style={{
                          background: '#0D0D0F',
                          border: `1px solid ${d.color}30`,
                          borderRadius: 8,
                          cursor: domainFilter === d.domain ? 'pointer' : 'default'
                        }}
                        bodyStyle={{ padding: '8px 6px' }}
                        onClick={() => setDomainFilter(domainFilter === d.domain ? '全部' : d.domain)}
                      >
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space>
                            <Text style={{ color: d.color, fontSize: 14 }}>{d.icon}</Text>
                            <Text style={{ color: '#FAFAFA', fontSize: 11 }}>{d.domain}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {d.count}人 · {(d.avg_success_rate * 100).toFixed(0)}%成功率
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              <Divider style={{ margin: '12px 0', borderColor: '#2C2C31' }} />

              {/* Expert List */}
              <div style={{ padding: '0 12px 12px' }}>
                <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {filteredExperts.length} 位专家
                  </Text>
                  {domainFilter !== '全部' && (
                    <Tag color={DOMAINS[domainFilter]?.color}>{domainFilter}</Tag>
                  )}
                </Space>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {filteredExperts.slice(0, 50).map(expert => (
                    <ExpertCard
                      key={expert.expert_id}
                      expert={expert}
                      selected={selectedExperts.includes(expert.expert_id)}
                      onSelect={() => handleSelectExpert(expert.expert_id)}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </Col>

          {/* Center: Task Input + Intent + Decomposition */}
          <Col span={12}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {/* Task Input */}
              <Card
                style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
                bodyStyle={{ padding: 16 }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text strong style={{ color: '#FAFAFA' }}>📋 输入任务</Text>
                  <TextArea
                    placeholder="描述你的任务，例如：帮我分析一下最近的量子计算进展，并生成一份技术报告..."
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    rows={3}
                    style={{
                      background: '#0D0D0F',
                      border: '1px solid #2C2C31',
                      color: '#FAFAFA',
                      borderRadius: 8
                    }}
                  />
                  <Space>
                    <Button
                      type="primary"
                      icon={<AimOutlined />}
                      onClick={handleClassify}
                      loading={loading}
                      style={{ background: '#7065F3', borderColor: '#7065F3' }}
                    >
                      分析任务
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleExecute}
                      loading={loading}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    >
                      执行
                    </Button>
                    <Button onClick={() => {
                      setTaskInput(''); setIntentResult(null);
                      setDecomposition(null); setExecutionPlan(null); setExecutionResult(null);
                    }}>
                      清空
                    </Button>
                  </Space>
                </Space>
              </Card>

              {/* Results Tabs */}
              {(intentResult || decomposition || executionResult) && (
                <Card
                  style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    style={{ padding: '0 16px' }}
                    items={[
                      {
                        key: 'intent',
                        label: <Space><BulbOutlined /> 意图识别</Space>,
                        children: intentResult ? (
                          <div style={{ padding: 12 }}>
                            {/* Language + Intent */}
                            <Row gutter={[12, 12]}>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>语言检测</Text>
                                  <div>
                                    <Tag color={intentResult.language === 'zh' ? '#3b82f6' : intentResult.language === 'en' ? '#10b981' : '#f59e0b'}>
                                      {intentResult.language === 'zh' ? '🇨🇳 中文' : intentResult.language === 'en' ? '🇺🇸 English' : '🇨🇳🇺🇸 混合'}
                                    </Tag>
                                  </div>
                                </Card>
                              </Col>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>任务复杂度</Text>
                                  <Tag color={COMPLEXITY_COLORS[intentResult.task_complexity]}>
                                    {intentResult.task_complexity === 'very_complex' ? '极复杂' :
                                     intentResult.task_complexity === 'complex' ? '复杂' :
                                     intentResult.task_complexity === 'moderate' ? '中等' : '简单'}
                                  </Tag>
                                </Card>
                              </Col>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>执行策略</Text>
                                  <Tag color={STRATEGY_COLORS[intentResult.suggested_strategy]}>
                                    {intentResult.suggested_strategy === 'single_expert' ? '单专家' :
                                     intentResult.suggested_strategy === 'parallel_experts' ? '并行专家' :
                                     intentResult.suggested_strategy === 'sequential_chain' ? '顺序链' : '层级'}
                                  </Tag>
                                </Card>
                              </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0', borderColor: '#2C2C31' }} />

                            {/* Primary Intent */}
                            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>主意图</Text>
                              <div style={{ marginTop: 4 }}>
                                <Tag color="#7065F3" style={{ fontSize: 13 }}>{intentResult.primary_intent}</Tag>
                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                  置信度: {(intentResult.confidence * 100).toFixed(0)}%
                                </Text>
                              </div>
                            </Card>

                            {/* Secondary Intents */}
                            {intentResult.secondary_intents.length > 0 && (
                              <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>辅助意图</Text>
                                <div style={{ marginTop: 4 }}>
                                  {intentResult.secondary_intents.map((i, idx) => (
                                    <Tag key={idx} style={{ marginBottom: 4 }}>{i}</Tag>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* Keywords */}
                            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>关键词</Text>
                              <div style={{ marginTop: 4 }}>
                                {intentResult.intent_keywords.slice(0, 15).map((kw, idx) => (
                                  <Tag key={idx} color="default" style={{ marginBottom: 2 }}>{kw}</Tag>
                                ))}
                              </div>
                            </Card>

                            {/* Recommended Experts */}
                            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>推荐专家 (Top 5)</Text>
                              <div style={{ marginTop: 6 }}>
                                {intentResult.suggested_experts.map((exp, idx) => (
                                  <Card
                                    key={exp.expert_id}
                                    size="small"
                                    style={{
                                      background: '#18181B',
                                      border: '1px solid #2C2C31',
                                      marginBottom: 4,
                                      borderRadius: 6
                                    }}
                                    bodyStyle={{ padding: '6px 8px' }}
                                  >
                                    <Space>
                                      <Text style={{ color: '#7065F3', fontSize: 12 }}>{idx + 1}</Text>
                                      <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{exp.name}</Text>
                                      <TierTag tier={exp.tier} />
                                      <Tag color={DOMAINS[exp.domain]?.color}>{exp.domain}</Tag>
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        {(exp.match_score * 100).toFixed(0)}% 匹配
                                      </Text>
                                    </Space>
                                  </Card>
                                ))}
                              </div>
                            </Card>
                          </div>
                        ) : <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                      },
                      {
                        key: 'decomp',
                        label: <Space><NodeIndexOutlined /> 任务拆解</Space>,
                        children: decomposition ? (
                          <div style={{ padding: 12 }}>
                            {/* Summary */}
                            <Alert
                              message={decomposition.summary}
                              type="info"
                              style={{ background: '#1e1e3f', border: '1px solid #7065F3', marginBottom: 12 }}
                              icon={<ClusterOutlined />}
                            />

                            {/* Stats */}
                            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                              <Col span={6}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>子任务</Text>}
                                    value={decomposition.sub_tasks.length}
                                    valueStyle={{ color: '#7065F3', fontSize: 20 }}
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>所需专家</Text>}
                                    value={decomposition.total_experts_needed}
                                    valueStyle={{ color: '#3b82f6', fontSize: 20 }}
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>预估Token</Text>}
                                    value={decomposition.estimated_total_tokens}
                                    valueStyle={{ color: '#10b981', fontSize: 20 }}
                                  />
                                </Card>
                              </Col>
                              <Col span={6}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>策略</Text>}
                                    value={decomposition.execution_strategy === 'parallel' ? '并行' :
                                           decomposition.execution_strategy === 'sequential' ? '顺序' : '混合'}
                                    valueStyle={{ color: STRATEGY_COLORS[decomposition.execution_strategy] ? '#10b981' : '#f59e0b', fontSize: 16 }}
                                  />
                                </Card>
                              </Col>
                            </Row>

                            {/* Subtasks Timeline */}
                            <Text strong style={{ color: '#FAFAFA', fontSize: 12 }}>任务分解:</Text>
                            <Timeline style={{ marginTop: 8, paddingLeft: 8 }}>
                              {decomposition.sub_tasks.map((task, idx) => (
                                <Timeline.Item
                                  key={task.id}
                                  color={task.status === 'pending' ? '#6b7280' : task.status === 'completed' ? '#10b981' : '#7065F3'}
                                  dot={task.priority >= 4 ? <FireOutlined /> : undefined}
                                >
                                  <Card
                                    size="small"
                                    style={{
                                      background: '#0D0D0F',
                                      border: `1px solid ${task.priority >= 4 ? '#f97316' : '#2C2C31'}`,
                                      borderRadius: 6,
                                      marginLeft: 4
                                    }}
                                    bodyStyle={{ padding: '6px 10px' }}
                                  >
                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                      <Space>
                                        <Tag color={task.priority >= 4 ? '#f97316' : '#6b7280'}>P{task.priority}</Tag>
                                        <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{task.description}</Text>
                                      </Space>
                                      {task.assigned_expert_name && (
                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                          👤 {task.assigned_expert_name}
                                          {task.dependencies.length > 0 && ` ← 依赖: ${task.dependencies.join(', ')}`}
                                        </Text>
                                      )}
                                    </Space>
                                  </Card>
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          </div>
                        ) : <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                      },
                      {
                        key: 'plan',
                        label: <Space><ArrowRightOutlined /> 执行计划</Space>,
                        children: executionPlan ? (
                          <div style={{ padding: 12 }}>
                            <Alert
                              message={`策略: ${executionPlan.strategy} | 预计耗时: ${executionPlan.estimated_duration_sec}秒 | 预计Token: ${executionPlan.estimated_tokens}`}
                              type="success"
                              style={{ background: '#0d2618', border: '1px solid #10b981', marginBottom: 12 }}
                            />
                            <Row gutter={[8, 8]}>
                              {executionPlan.stages.map((stage, idx) => (
                                <Col span={24} key={stage.stage_id}>
                                  <Card
                                    size="small"
                                    style={{
                                      background: '#0D0D0F',
                                      border: `1px solid ${stage.can_parallel ? '#10b981' : '#f59e0b'}`,
                                      borderRadius: 8,
                                      marginBottom: 6
                                    }}
                                    bodyStyle={{ padding: '8px 12px' }}
                                  >
                                    <Space>
                                      <Badge count={idx + 1} style={{ backgroundColor: '#7065F3' }} />
                                      <Text strong style={{ color: '#FAFAFA' }}>
                                        阶段 {idx + 1}: {stage.can_parallel ? '🔄 可并行' : '⏳ 顺序执行'}
                                      </Text>
                                    </Space>
                                    <div style={{ marginTop: 6, marginLeft: 32 }}>
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        专家: {stage.expert_ids.join(', ')} | 任务: {stage.subtask_ids.join(', ')}
                                      </Text>
                                    </div>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        ) : <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                      },
                      {
                        key: 'result',
                        label: <Space><CheckCircleOutlined /> 执行结果</Space>,
                        children: executionResult ? (
                          <div style={{ padding: 12 }}>
                            <Alert
                              message={executionResult.final_summary}
                              type={executionResult.status === 'success' ? 'success' : 'warning'}
                              style={{ background: executionResult.status === 'success' ? '#0d2618' : '#2d1b00', border: `1px solid ${executionResult.status === 'success' ? '#10b981' : '#f59e0b'}`, marginBottom: 12 }}
                            />
                            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>执行状态</Text>}
                                    value={executionResult.status === 'success' ? '✅ 成功' : '⚠️ 部分成功'}
                                    valueStyle={{ color: executionResult.status === 'success' ? '#10b981' : '#f59e0b', fontSize: 14 }}
                                  />
                                </Card>
                              </Col>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>总耗时</Text>}
                                    value={`${executionResult.total_execution_time_sec.toFixed(1)}s`}
                                    valueStyle={{ color: '#3b82f6', fontSize: 20 }}
                                  />
                                </Card>
                              </Col>
                              <Col span={8}>
                                <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                                  <Statistic
                                    title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>总Token</Text>}
                                    value={executionResult.total_tokens}
                                    valueStyle={{ color: '#10b981', fontSize: 20 }}
                                  />
                                </Card>
                              </Col>
                            </Row>
                            {executionResult.results.map((r, idx) => (
                              <Card
                                key={`${r.expert_id}-${r.task_id}`}
                                size="small"
                                style={{
                                  background: '#0D0D0F',
                                  border: '1px solid #2C2C31',
                                  marginBottom: 6,
                                  borderRadius: 6
                                }}
                                bodyStyle={{ padding: '8px 12px' }}
                              >
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                  <Space>
                                    <Badge status={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'processing'} />
                                    <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{r.expert_name}</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>({r.task_id})</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                      {r.output_tokens} tokens · {r.execution_time_sec.toFixed(1)}s
                                    </Text>
                                  </Space>
                                  {r.result && (
                                    <Paragraph
                                      style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}
                                      ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                                    >
                                      {r.result}
                                    </Paragraph>
                                  )}
                                  {r.error && (
                                    <Text type="danger" style={{ fontSize: 11 }}>❌ {r.error}</Text>
                                  )}
                                </Space>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: 40, textAlign: 'center' }}>
                            <Text type="secondary">点击「执行」按钮运行任务</Text>
                          </div>
                        )
                      }
                    ]}
                  />
                </Card>
              )}
            </Space>
          </Col>

          {/* Right: Active Experts + Quick Stats */}
          <Col span={6}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {/* Active Experts */}
              <Card
                title={<Space><UserSwitchOutlined /> 专家状态</Space>}
                style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
                bodyStyle={{ padding: 12, maxHeight: 300, overflow: 'auto' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeExperts.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>暂无活跃任务</Text>
                  ) : activeExperts.slice(0, 10).map(expert => (
                    <Card
                      key={expert.expert_id}
                      size="small"
                      style={{ background: '#0D0D0F', border: '1px solid #2C2C31', borderRadius: 6 }}
                      bodyStyle={{ padding: '6px 8px' }}
                    >
                      <Space>
                        <Badge
                          status={expert.status === 'busy' ? 'processing' : expert.status === 'idle' ? 'success' : 'error'}
                          text={expert.name}
                        />
                      </Space>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {expert.current_task ? `📋 ${expert.current_task.slice(0, 30)}...` : '🟢 空闲'}
                        </Text>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* Strategy Guide */}
              <Card
                title={<Space><ThunderboltOutlined /> 执行策略</Space>}
                style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
                bodyStyle={{ padding: 12 }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {[
                    { key: 'single_expert', icon: '🎯', label: '单专家', desc: '简单任务，一个专家完成', color: '#6b7280' },
                    { key: 'parallel_experts', icon: '🔄', label: '并行专家', desc: '多个独立任务同时执行', color: '#10b981' },
                    { key: 'sequential_chain', icon: '⏳', label: '顺序链', desc: '任务有依赖，按序执行', color: '#3b82f6' },
                    { key: 'hierarchical', icon: '🏗️', label: '层级编排', desc: '主规划者+多子专家', color: '#f59e0b' },
                  ].map(s => (
                    <Card
                      key={s.key}
                      size="small"
                      style={{
                        background: executionPlan?.strategy === s.key ? `${s.color}15` : '#0D0D0F',
                        border: executionPlan?.strategy === s.key ? `1px solid ${s.color}` : '1px solid #2C2C31',
                        borderRadius: 6
                      }}
                      bodyStyle={{ padding: '6px 8px' }}
                    >
                      <Space>
                        <Text style={{ fontSize: 14 }}>{s.icon}</Text>
                        <Text strong style={{ color: s.color, fontSize: 11 }}>{s.label}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginLeft: 24 }}>
                        {s.desc}
                      </Text>
                    </Card>
                  ))}
                </Space>
              </Card>

              {/* Quick Stats */}
              <Card
                title={<Space><BarChartOutlined /> 平台统计</Space>}
                style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
                bodyStyle={{ padding: 12 }}
              >
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                      <Statistic
                        title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>专家总数</Text>}
                        value={100}
                        valueStyle={{ color: '#7065F3', fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                      <Statistic
                        title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>领域数</Text>}
                        value={10}
                        valueStyle={{ color: '#3b82f6', fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                      <Statistic
                        title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>活跃任务</Text>}
                        value={activeExperts.filter(e => e.status === 'busy').length}
                        valueStyle={{ color: '#10b981', fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
                      <Statistic
                        title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>平均成功率</Text>}
                        value="91%"
                        valueStyle={{ color: '#f59e0b', fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  )
}
