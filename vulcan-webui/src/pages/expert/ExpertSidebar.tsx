import React from 'react'
import { Card, Row, Col, Statistic, Badge, Space, Typography } from 'antd'
import {
  UserSwitchOutlined, ThunderboltOutlined, BarChartOutlined
} from '@ant-design/icons'
import type { ExpertProfile, ExecutionPlan } from './types'

const { Text } = Typography

export interface ExpertSidebarProps {
  activeExperts: ExpertProfile[]
  executionPlan: ExecutionPlan | null
}

export function ExpertSidebar({ activeExperts, executionPlan }: ExpertSidebarProps) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {/* Active Experts */}
      <Card
        title={<Space><UserSwitchOutlined /> 专家状态</Space>}
        style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
        bodyStyle={{ padding: 12, maxHeight: 300, overflow: 'auto' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activeExperts.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>暂无活跃任务</Text>
          ) : activeExperts.slice(0, 10).map(expert => (
            <Card
              key={expert.expert_id}
              size="small"
              style={{ background: '#0D0D0F', border: '1px solid #2C2C31', borderRadius: 6 }}
              bodyStyle={{ padding: '6px 8px' }}
            >
              <Space>
                <Badge
                  status={expert.status === 'busy' ? 'processing' : expert.status === 'idle' ? 'success' : 'error'}
                  text={expert.name}
                />
              </Space>
              <div style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {expert.current_task ? `📋 ${expert.current_task.slice(0, 30)}...` : '🟢 空闲'}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Strategy Guide */}
      <Card
        title={<Space><ThunderboltOutlined /> 执行策略</Space>}
        style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {[
            { key: 'single_expert', icon: '🎯', label: '单专家', desc: '简单任务，一个专家完成', color: '#6b7280' },
            { key: 'parallel_experts', icon: '🔄', label: '并行专家', desc: '多个独立任务同时执行', color: '#10b981' },
            { key: 'sequential_chain', icon: '⏳', label: '顺序链', desc: '任务有依赖，按序执行', color: '#3b82f6' },
            { key: 'hierarchical', icon: '🏗️', label: '层级编排', desc: '主规划者+多子专家', color: '#f59e0b' },
          ].map(s => (
            <Card
              key={s.key}
              size="small"
              style={{
                background: executionPlan?.strategy === s.key ? `${s.color}15` : '#0D0D0F',
                border: executionPlan?.strategy === s.key ? `1px solid ${s.color}` : '1px solid #2C2C31',
                borderRadius: 6
              }}
              bodyStyle={{ padding: '6px 8px' }}
            >
              <Space>
                <Text style={{ fontSize: 14 }}>{s.icon}</Text>
                <Text strong style={{ color: s.color, fontSize: 11 }}>{s.label}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginLeft: 24 }}>
                {s.desc}
              </Text>
            </Card>
          ))}
        </Space>
      </Card>

      {/* Quick Stats */}
      <Card
        title={<Space><BarChartOutlined /> 平台统计</Space>}
        style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
              <Statistic
                title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>专家总数</Text>}
                value={100}
                valueStyle={{ color: '#7065F3', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
              <Statistic
                title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>领域数</Text>}
                value={10}
                valueStyle={{ color: '#3b82f6', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
              <Statistic
                title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>活跃任务</Text>}
                value={activeExperts.filter(e => e.status === 'busy').length}
                valueStyle={{ color: '#10b981', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', textAlign: 'center' }} bodyStyle={{ padding: 8 }}>
              <Statistic
                title={<Text style={{ color: '#9ca3af', fontSize: 10 }}>平均成功率</Text>}
                value="91%"
                valueStyle={{ color: '#f59e0b', fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  )
}
