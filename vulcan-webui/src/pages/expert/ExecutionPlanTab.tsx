import React from 'react'
import { Card, Row, Col, Alert, Badge, Space, Spin, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import type { ExecutionPlan } from './types'

const { Text } = Typography

export interface ExecutionPlanTabProps {
  executionPlan: ExecutionPlan | null
}

export function ExecutionPlanTab({ executionPlan }: ExecutionPlanTabProps) {
  if (!executionPlan) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
  }

  return (
    <div style={{ padding: 12 }}>
      <Alert
        message={`策略: ${executionPlan.strategy} | 预计耗时: ${executionPlan.estimated_duration_sec}秒 | 预计Token: ${executionPlan.estimated_tokens}`}
        type="success"
        style={{ background: '#0d2618', border: '1px solid #10b981', marginBottom: 12 }}
      />
      <Row gutter={[8, 8]}>
        {executionPlan.stages.map((stage, idx) => (
          <Col span={24} key={stage.stage_id}>
            <Card
              size="small"
              style={{
                background: '#0D0D0F',
                border: `1px solid ${stage.can_parallel ? '#10b981' : '#f59e0b'}`,
                borderRadius: 8,
                marginBottom: 6
              }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <Space>
                <Badge count={idx + 1} style={{ backgroundColor: '#7065F3' }} />
                <Text strong style={{ color: '#FAFAFA' }}>
                  阶段 {idx + 1}: {stage.can_parallel ? '🔄 可并行' : '⏳ 顺序执行'}
                </Text>
              </Space>
              <div style={{ marginTop: 6, marginLeft: 32 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  专家: {stage.expert_ids.join(', ')} | 任务: {stage.subtask_ids.join(', ')}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
