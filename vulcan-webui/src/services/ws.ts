/**
 * Vulcan WebSocket Client — real-time streaming for chat and task updates
 */

export type WsEventType =
  | 'connected'
  | 'result'
  | 'step_update'
  | 'task_update'
  | 'error'
  | 'pong'

export interface WsMessage {
  type: WsEventType
  task_id?: string
  reply?: string
  trace_id?: string
  step?: {
    id: string
    status: string
    description: string
    result?: string
  }
  task?: {
    id: string
    status: string
    result?: string
  }
  error?: string
}

type Listener = (msg: WsMessage) => void

export class VulcanWsClient {
  private ws: WebSocket | null = null
  private clientId: string
  private listeners: Set<Listener> = new Set()
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private intentionalClose = false
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(clientId?: string) {
    this.clientId = clientId || `webui-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws/${this.clientId}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.intentionalClose = false
        this.reconnectDelay = 1000
        this.startPing()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data)
          this.listeners.forEach((l) => l(msg))
        } catch {
          // ignore parse errors
        }
      }

      this.ws.onerror = () => {
        // onerror is always followed by onclose, handle reconnect there
      }

      this.ws.onclose = () => {
        this.stopPing()
        if (!this.intentionalClose) {
          this.scheduleReconnect()
        }
      }
    })
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' } as unknown as WsMessage)
    }, 30000)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private scheduleReconnect() {
    setTimeout(() => {
      if (!this.intentionalClose) {
        this.connect().catch(() => {})
      }
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  send(msg: WsMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  sendMessage(content: string, sessionId?: string) {
    this.send({
      type: 'chat',
      reply: content, // reuse reply field for outbound
    } as WsMessage & { type: 'chat' })
    // Actually send via a chat message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message: content, session_id: sessionId }))
    }
  }

  disconnect() {
    this.intentionalClose = true
    this.stopPing()
    this.ws?.close()
    this.ws = null
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton for app-wide use
let _wsClient: VulcanWsClient | null = null

export function getWsClient(): VulcanWsClient {
  if (!_wsClient) {
    _wsClient = new VulcanWsClient()
  }
  return _wsClient
}
