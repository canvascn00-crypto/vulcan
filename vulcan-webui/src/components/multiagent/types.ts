// Shared types for MultiAgent components

export interface AgentInfo {
  id: string
  name: string
  version: string
  status: 'idle' | 'busy' | 'streaming' | 'offline'
  role: string
  roleLabel: string
  capabilities: string[]
  tools: string[]
  description: string
  endpoint?: string
  tags: string[]
  maxConcurrentTasks: number
  last_seen: string
  avatar?: string
  model: string
  channel: string
  currentTask?: string
  uptimeSeconds?: number
  tokenUsage?: { input: number; output: number }
  trustLevel: 'builtin' | 'trusted' | 'community'
}

export interface PoolStats {
  total_agents: number
  idle: number
  busy: number
  streaming: number
  total_delegated_tasks: number
  active_delegated: number
  agents: AgentInfo[]
}

export interface DelegatedTask {
  task_id: string
  thread_id: string
  goal: string
  proposer: string
  assignee: string
  status: 'proposed' | 'in_progress' | 'completed' | 'failed'
  priority: number
  created_at: string
  progress_steps: string[]
}

export interface ActivityEvent {
  id: string
  type: 'start' | 'stop' | 'delegate' | 'complete' | 'error' | 'config_change'
  description: string
  detail?: string
  timestamp: string
}

export const AVAILABLE_MODELS = [
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1-5-pro' },
  { label: 'Deepseek V2', value: 'deepseek-v2' },
]

export const AVAILABLE_CHANNELS = [
  { label: '💬 微信 (WeChat)', value: 'wechat' },
  { label: '✈️ Telegram', value: 'telegram' },
  { label: '🎮 Discord', value: 'discord' },
  { label: '🌐 Web', value: 'web' },
  { label: '📱 Slack', value: 'slack' },
  { label: '📧 Email', value: 'email' },
]

export const STATUS_COLORS: Record<string, string> = {
  idle: '#52c41a',
  busy: '#f59e0b',
  streaming: '#3b82f6',
  offline: '#6b7280',
}

export const STATUS_LABEL: Record<string, string> = {
  idle: '空闲',
  busy: '忙碌',
  streaming: '流式',
  offline: '离线',
}

export const PRIORITY_LABEL: Record<number, string> = {
  0: '低',
  1: '普通',
  2: '高',
  3: '紧急',
}

export const PRIORITY_COLOR: Record<number, string> = {
  0: '#52c41a',
  1: '#3b82f6',
  2: '#f59e0b',
  3: '#ef4444',
}

export const TRUST_COLOR: Record<string, string> = {
  builtin: '#a78bfa',
  trusted: '#52c41a',
  community: '#6b7280',
}
