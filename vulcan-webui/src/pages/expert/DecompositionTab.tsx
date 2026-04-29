import React from 'react'
import { Card, Row, Col, Alert, Statistic, Timeline, Tag, Space, Spin, Typography } from 'antd'
import { ClusterOutlined, FireOutlined } from '@ant-design/icons'
import type { DecompositionResult } from './types'
import { STRATEGY_COLORS } from './constants'

const { Text } = Typography

export interface DecompositionTabProps {
  decomposition: DecompositionResult | null
}

export function DecompositionTab({ decomposition }: DecompositionTabProps) {
  if (!decomposition) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Summary */}
      <Alert
        message={decomposition.summary}
        type="info"
        style={{ background: '#1e1e3f', border: '1px solid #7065F3', marginBottom: 12 }}
        icon={<ClusterOutlined />}
      />

      {/* Stats */}
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={6}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
            <Statistic
              title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>子任务</Text>}
              value={decomposition.sub_tasks.length}
              valueStyle={{ color: '#7065F3', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
            <Statistic
              title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>所需专家</Text>}
              value={decomposition.total_experts_needed}
              valueStyle={{ color: '#3b82f6', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
            <Statistic
              title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>预估Token</Text>}
              value={decomposition.estimated_total_tokens}
              valueStyle={{ color: '#10b981', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
            <Statistic
              title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>策略</Text>}
              value={decomposition.execution_strategy === 'parallel' ? '并行' :
                     decomposition.execution_strategy === 'sequential' ? '顺序' : '混合'}
              valueStyle={{ color: STRATEGY_COLORS[decomposition.execution_strategy] ? '#10b981' : '#f59e0b', fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Subtasks Timeline */}
      <Text strong style={{ color: '#FAFAFA', fontSize: 12 }}>任务分解:</Text>
      <Timeline style={{ marginTop: 8, paddingLeft: 8 }}>
        {decomposition.sub_tasks.map((task, idx) => (
          <Timeline.Item
            key={task.id}
            color={task.status === 'pending' ? '#6b7280' : task.status === 'completed' ? '#10b981' : '#7065F3'}
            dot={task.priority >= 4 ? <FireOutlined /> : undefined}
          >
            <Card
              size="small"
              style={{
                background: '#0D0D0F',
                border: `1px solid ${task.priority >= 4 ? '#f97316' : '#2C2C31'}`,
                borderRadius: 6,
                marginLeft: 4
              }}
              bodyStyle={{ padding: '6px 10px' }}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space>
                  <Tag color={task.priority >= 4 ? '#f97316' : '#6b7280'}>P{task.priority}</Tag>
                  <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{task.description}</Text>
                </Space>
                {task.assigned_expert_name && (
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    👤 {task.assigned_expert_name}
                    {task.dependencies.length > 0 && ` ← 依赖: ${task.dependencies.join(', ')}`}
                  </Text>
                )}
              </Space>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  )
}
