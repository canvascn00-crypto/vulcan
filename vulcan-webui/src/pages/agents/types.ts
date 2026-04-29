export interface Agent {
  id: string
  name: string
  role: 'planner' | 'executor' | 'coordinator' | 'specialist'
  description: string
  status: 'active' | 'idle' | 'error'
  tasksCompleted: number
  model?: string
  tools: string[]
}

export interface AgentMessage {
  id: string
  from: string
  to: string
  content: string
  timestamp: string
}
