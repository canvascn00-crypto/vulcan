import { useState } from 'react'
import { Typography, Input, Button, Modal, Tag } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { api } from '@/services/api'
import { colors } from './constants'
import type { CommandInfo, CommandExecResult } from './constants'

const { Text } = Typography

export function ExecutionModal({
  cmd,
  open,
  onClose,
}: {
  cmd: CommandInfo
  open: boolean
  onClose: () => void
  onExecute: (args: Record<string, string>) => void
}) {
  const [argsText, setArgsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandExecResult | null>(null)

  const syntaxParts = cmd.syntax.replace('/' + cmd.name, '').trim()

  const handleExecute = async () => {
    setLoading(true)
    setResult(null)
    try {
      const parsedArgs: Record<string, string> = {}
      if (argsText.trim()) {
        const simplePromptCmds = ['image', 'ask', 'search', 'translate', 'remember', 'shorten', 'expand', 'lookup', 'expert', 'echo', 'tts']
        const valueCmds = ['model', 'temperature', 'eval', 'script']

        if (simplePromptCmds.includes(cmd.name)) {
          parsedArgs['prompt'] = argsText
        } else if (valueCmds.includes(cmd.name)) {
          parsedArgs['value'] = argsText
        } else if (cmd.name === 'code') {
          const parts = argsText.split('\n', 1)
          parsedArgs['language'] = parts[0]
          parsedArgs['code'] = parts[1] || ''
        } else if (cmd.name === 'forget') {
          parsedArgs['keyword'] = argsText
        } else if (cmd.name === 'config') {
          const parts = argsText.split(' ', 2)
          parsedArgs['action'] = parts[0] || ''
          parsedArgs['key'] = parts[1] || ''
        } else if (cmd.name === 'cron' || cmd.name === 'notify') {
          const parts = argsText.split(' ', 1)
          parsedArgs[cmd.name === 'notify' ? 'channel' : 'action'] = parts[0] || ''
        } else if (cmd.name === 'skill' || cmd.name === 'memory') {
          parsedArgs['action'] = argsText.split(' ', 1)[0] || ''
        } else if (cmd.name === 'export') {
          parsedArgs['format'] = argsText || 'json'
        } else if (cmd.name === 'agent') {
          parsedArgs['agent_name'] = argsText.split(' ', 1)[0] || ''
        }
      }

      const res = await api.post<CommandExecResult>('/commands/execute', {
        command: cmd.name,
        args: parsedArgs,
      })
      setResult(res as CommandExecResult)
    } catch (err: unknown) {
      setResult({
        command: cmd.name,
        args: {},
        result: null,
        success: false,
        error: String(err),
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const noArgsCmds = ['ping', 'time', 'version', 'status', 'clear', 'reset', 'retry', 'summarize', 'agents', 'skills', 'transcribe']

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span style={{ color: colors.textPrimary }}>
          执行指令 <span style={{ color: colors.accent, fontFamily: 'monospace' }}>/{cmd.name}</span>
        </span>
      }
      footer={[
        <Button key="cancel" onClick={onClose} style={{ borderColor: colors.border }}>
          关闭
        </Button>,
        <Button
          key="execute"
          type="primary"
          loading={loading}
          onClick={handleExecute}
          style={{ background: colors.accent, borderColor: colors.accent }}
        >
          <PlayCircleOutlined /> 执行
        </Button>,
      ]}
      style={{ top: 80 }}
      bodyStyle={{ background: colors.bg }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>语法</Text>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: colors.textPrimary,
            background: colors.surface,
            padding: '8px 12px',
            borderRadius: 6,
            marginTop: 4,
            border: `1px solid ${colors.border}`,
          }}
        >
          {cmd.syntax}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {cmd.triggers.length > 0 ? '触发词' : '说明'}
        </Text>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {cmd.triggers.length > 0
            ? cmd.triggers.map(t => (
                <Tag key={t} style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                  {t}
                </Tag>
              ))
            : <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{cmd.description}</Text>
          }
        </div>
      </div>

      {!noArgsCmds.includes(cmd.name) && (
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {['image', 'ask', 'search'].includes(cmd.name) ? '输入内容' : '参数'}
          </Text>
          <Input.TextArea
            value={argsText}
            onChange={e => setArgsText(e.target.value)}
            placeholder={syntaxParts || '输入参数...'}
            style={{
              marginTop: 4,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontFamily: 'monospace',
            }}
            rows={3}
          />
        </div>
      )}

      {result && (
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${result.success ? colors.success : colors.error}40`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {result.success
              ? <CheckCircleOutlined style={{ color: colors.success }} />
              : <CloseCircleOutlined style={{ color: colors.error }} />}
            <Text style={{ color: result.success ? colors.success : colors.error, fontSize: 12 }}>
              {result.success ? '执行成功' : '执行失败'}
            </Text>
          </div>
          <pre
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {typeof result.result === 'object'
              ? JSON.stringify(result.result, null, 2)
              : String(result.result ?? result.error ?? '')}
          </pre>
        </div>
      )}
    </Modal>
  )
}
