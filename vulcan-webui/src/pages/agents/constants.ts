import type { Agent } from './types'

export const DEMO_AGENTS: Agent[] = [
  {
    id: 'planner-1',
    name: 'Planner-α',
    role: 'planner',
    description: '任务规划者 — 分析用户目标，拆解执行步骤，协调其他 Agent',
    status: 'active',
    tasksCompleted: 127,
    model: 'claude-sonnet-4',
    tools: ['task_decompose', 'reasoning'],
  },
  {
    id: 'executor-1',
    name: 'Executor-β',
    role: 'executor',
    description: '执行者 — 调用工具，完成具体任务，处理错误和异常',
    status: 'active',
    tasksCompleted: 341,
    model: 'claude-sonnet-4',
    tools: ['*'],
  },
  {
    id: 'researcher-1',
    name: 'Researcher-γ',
    role: 'specialist',
    description: '研究专家 — 搜索、阅读、总结外部知识源',
    status: 'idle',
    tasksCompleted: 58,
    model: 'gpt-4o',
    tools: ['web_search', 'arxiv', 'blogwatcher'],
  },
  {
    id: 'coordinator-1',
    name: 'Coordinator-δ',
    role: 'coordinator',
    description: '协调者 — 多 Agent 之间的消息路由、投票、冲突仲裁',
    status: 'idle',
    tasksCompleted: 23,
    model: 'claude-sonnet-4',
    tools: ['a2a_bus', 'vote'],
  },
]

export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  planner: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  executor: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  coordinator: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
  specialist: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' },
}

export const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  active: { dot: '#22C55E', text: '#22C55E' },
  idle: { dot: '#A1A1AA', text: '#A1A1AA' },
  error: { dot: '#EF4444', text: '#EF4444' },
}

export const CHANNEL_OPTIONS = [
  { value: 'a2a', label: 'A2A Bus' },
  { value: 'http', label: 'HTTP' },
  { value: 'websocket', label: 'WebSocket' },
]

export const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4', label: 'Claude Opus 4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'llama3.2', label: 'LLaMA 3.2 (本地)' },
]

export const CAPABILITY_OPTIONS = [
  { value: 'task_decompose', label: '任务分解' },
  { value: 'reasoning', label: '推理分析' },
  { value: 'web_search', label: '网络搜索' },
  { value: 'code_execute', label: '代码执行' },
  { value: 'file_read', label: '文件读取' },
  { value: 'a2a_bus', label: 'A2A 通信' },
  { value: 'vote', label: '投票仲裁' },
]
