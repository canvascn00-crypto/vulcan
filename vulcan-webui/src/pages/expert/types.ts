export interface ExpertMatch {
  expert_id: string
  name: string
  title: string
  domain: string
  match_score: number
  reason: string
  tier: string
  model_preference: string
}

export interface IntentResult {
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

export interface SubTask {
  id: string
  description: string
  assigned_expert_id: string | null
  assigned_expert_name: string | null
  status: string
  priority: number
  dependencies: string[]
}

export interface DecompositionResult {
  original_goal: string
  sub_tasks: SubTask[]
  total_experts_needed: number
  estimated_total_tokens: number
  estimated_duration_sec: number
  complexity_level: string
  execution_strategy: string
  summary: string
}

export interface ExecutionStage {
  stage_id: string
  expert_ids: string[]
  subtask_ids: string[]
  can_parallel: boolean
}

export interface ExecutionPlan {
  plan_id: string
  original_goal: string
  strategy: string
  stages: ExecutionStage[]
  estimated_duration_sec: number
  estimated_tokens: number
}

export interface TaskResult {
  expert_id: string
  expert_name: string
  task_id: string
  status: string
  result: string | null
  output_tokens: number
  execution_time_sec: number
  error: string | null
}

export interface ExecutionResult {
  plan_id: string
  status: string
  results: TaskResult[]
  final_summary: string
  total_execution_time_sec: number
  total_tokens: number
}

export interface ExpertProfile {
  expert_id: string
  name: string
  status: string
  current_task: string | null
  tasks_completed: number
  success_rate: number
}

export interface DomainInfo {
  domain: string
  name: string
  count: number
  avg_success_rate: number
  icon: React.ReactNode
  color: string
}
