/**
 * Vulcan API Client — typed service layer for all backend endpoints
 */

const BASE = ''

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(err.detail || `HTTP ${res.status}`), { response: res, data: err })
  }
  return res.json()
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string
  session_id?: string
  model?: string
}

export interface ChatResponse {
  task_id: string
  reply: string
  trace_id: string
}

export interface TaskInfo {
  id: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  goal: string
  result?: string
  steps?: TaskStep[]
  created_at: string
  updated_at: string
}

export interface TaskStep {
  id: string
  status: string
  description: string
  result?: string
  error?: string
}

export interface ToolInfo {
  name: string
  description: string
  category: string
  parameters?: Record<string, unknown>
}

export interface ToolsResponse {
  tools: ToolInfo[]
  toolsets: string[]
}

export interface PlatformStatus {
  running: boolean
  platforms: string[]
}

export interface HomeChannel {
  platform: string
  chat_id: string
}

export interface HealthResponse {
  status: 'ok' | 'error' | 'degraded'
  service: string
  version: string
  gateway: boolean
  ws_connected?: boolean
  gateway_active?: boolean
  uptime_seconds?: number
}

export interface DashboardStats {
  active_agents: number
  conversations_today: number
  tool_calls: number
  avg_latency_ms: number
  uptime_seconds: number
}

// ─── Multi-Agent Types (mirrored from components/multiagent/types) ─────────────

export interface PoolStats {
  total_agents: number
  idle: number
  busy: number
  streaming: number
  total_delegated_tasks: number
  active_delegated: number
  agents: AgentInfo[]
}

export interface AgentInfo {
  id: string; name: string; version: string
  status: 'idle' | 'busy' | 'streaming' | 'offline'
  role: string; roleLabel: string; capabilities: string[]; tools: string[]
  description: string; endpoint?: string; tags: string[]
  maxConcurrentTasks: number; last_seen: string; avatar?: string
  model: string; channel: string; currentTask?: string
  uptimeSeconds?: number; tokenUsage?: { input: number; output: number }
  trustLevel: 'builtin' | 'trusted' | 'community'
}

export interface DelegatedTask {
  task_id: string; thread_id: string; goal: string
  proposer: string; assignee: string
  status: 'proposed' | 'in_progress' | 'completed' | 'failed'
  priority: number; created_at: string; progress_steps: string[]
}

// ─── API Methods ─────────────────────────────────────────────────────────────

export const api = {
  // Direct HTTP helpers (generic)
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: Record<string, unknown>) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: Record<string, unknown>) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // Health
  health: () => request<HealthResponse>('/health'),

  // Chat (REST polling)
  chat: (req: ChatRequest) =>
    request<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(req) }),

  // Tasks
  listTasks: () => request<TaskInfo[]>('/tasks'),
  getTask: (id: string) => request<TaskInfo>(`/tasks/${id}`),
  cancelTask: (id: string) => request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  // Tools
  listTools: () => request<ToolsResponse>('/tools'),

  // Gateway
  gatewayStatus: () => request<PlatformStatus>('/gateway/status'),
  gatewaySend: (req: ChatRequest) =>
    request<{ ok: boolean; platform: string; chat_id: string }>('/gateway/send', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  listHomeChannels: () => request<HomeChannel[]>('/gateway/home-channels'),

  // Dashboard stats
  async dashboardStats(): Promise<DashboardStats> {
    const [tasks, tools] = await Promise.all([this.listTasks(), this.listTools()])
    const running = tasks.filter((t) => t.status === 'running').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    return {
      active_agents: running + 1,
      conversations_today: completed + running,
      tool_calls: tools.tools.length,
      avg_latency_ms: 0,
      uptime_seconds: 0,
    }
  },

  // A2A Multi-Agent
  a2aStatus: () => request<PoolStats>('/a2a/status'),
  a2aDelegate: (body: {
    goal: string
    assignee?: string
    role?: string
    priority?: number
    description?: string
    tools?: string[]
    timeout_seconds?: number
    proposer?: string
    thread_id?: string
  }) => request<{ task_id: string }>('/a2a/tasks/delegate', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  a2aDelegatedTasks: () => request<{ tasks: DelegatedTask[] }>('/a2a/tasks/delegated'),
  a2aCancelTask: (taskId: string) =>
    request<{ ok: boolean }>(`/a2a/tasks/delegated/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ error: 'Cancelled by orchestrator' }),
    }),
}
