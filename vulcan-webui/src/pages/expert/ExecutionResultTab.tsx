import React from 'react'
import { Card, Row, Col, Alert, Statistic, Badge, Space, Typography } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import type { ExecutionResult } from './types'

const { Text, Paragraph } = Typography

export interface ExecutionResultTabProps {
  executionResult: ExecutionResult | null
}

export function ExecutionResultTab({ executionResult }: ExecutionResultTabProps) {
  if (!executionResult) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Text type="secondary">点击「执行」按钮运行任务</Text>
      </div>
    )
  }

  return (
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
  )
}
