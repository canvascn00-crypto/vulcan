// ─── Design Tokens ──────────────────────────────────────────────────────────

export const colors = {
  bg: '#0D0D0F',
  surface: '#18181B',
  border: '#2C2C31',
  hover: '#27272A',
  accent: '#7065F3',
  accentHover: '#7C74F5',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  categories: {
    system: '#6366F1',
    ai: '#8B5CF6',
    search: '#06B6D4',
    media: '#EC4899',
    code: '#10B981',
    agent: '#F59E0B',
    skill: '#3B82F6',
    memory: '#8B5CF6',
    utility: '#6B7280',
  } as Record<string, string>,
}

export const categoryIcons: Record<string, React.ReactNode> = {
  system: 'ℹ️',
  ai: '🤖',
  search: '🔍',
  media: '🎙️',
  code: '💻',
  agent: '👥',
  skill: '🛠️',
  memory: '💾',
  utility: '🧪',
}

export const categoryLabels: Record<string, string> = {
  system: '系统',
  ai: 'AI 对话',
  search: '搜索',
  media: '媒体',
  code: '代码',
  agent: 'Agent',
  skill: '技能',
  memory: '记忆',
  utility: '工具',
}

export const categoryOrder = ['system', 'ai', 'search', 'media', 'code', 'agent', 'skill', 'memory', 'utility']

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CommandInfo {
  name: string
  description: string
  syntax: string
  category: string
  triggers: string[]
  requires_auth: boolean
  channel_scope: string[]
}

export interface CommandExecResult {
  command: string
  args: Record<string, unknown>
  result: unknown
  success: boolean
  error: string | null
  timestamp: string
}

export interface HistoryEntry {
  command: string
  args: Record<string, unknown>
  result: string
  timestamp: string
}
