/**
 * Vulcan API Client — typed service layer for all backend endpoints
 */

const BASE = '/api'

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
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

// ─── API Methods ─────────────────────────────────────────────────────────────

export const api = {
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

  // Dashboard stats (aggregated from multiple endpoints)
  async dashboardStats(): Promise<DashboardStats> {
    const [tasks, tools] = await Promise.all([this.listTasks(), this.listTools()])
    const running = tasks.filter((t) => t.status === 'running').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    return {
      active_agents: running + 1,
      conversations_today: completed + running,
      tool_calls: tools.tools.length,
      avg_latency_ms: 0, // populated by WebSocket latency tracking
      uptime_seconds: 0,
    }
  },
}
