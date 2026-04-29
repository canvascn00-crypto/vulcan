import React from 'react'
import { Card, Row, Col, Tag, Space, Divider, Spin, Typography } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import type { IntentResult } from './types'
import { DOMAINS, TierTag, STRATEGY_COLORS, COMPLEXITY_COLORS } from './constants'

const { Text } = Typography

export interface IntentTabProps {
  intentResult: IntentResult | null
}

export function IntentTab({ intentResult }: IntentTabProps) {
  if (!intentResult) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Language + Intent */}
      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
            <Text type="secondary" style={{ fontSize: 10 }}>语言检测</Text>
            <div>
              <Tag color={intentResult.language === 'zh' ? '#3b82f6' : intentResult.language === 'en' ? '#10b981' : '#f59e0b'}>
                {intentResult.language === 'zh' ? '🇨🇳 中文' : intentResult.language === 'en' ? '🇺🇸 English' : '🇨🇳🇺🇸 混合'}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
            <Text type="secondary" style={{ fontSize: 10 }}>任务复杂度</Text>
            <Tag color={COMPLEXITY_COLORS[intentResult.task_complexity]}>
              {intentResult.task_complexity === 'very_complex' ? '极复杂' :
               intentResult.task_complexity === 'complex' ? '复杂' :
               intentResult.task_complexity === 'moderate' ? '中等' : '简单'}
            </Tag>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
            <Text type="secondary" style={{ fontSize: 10 }}>执行策略</Text>
            <Tag color={STRATEGY_COLORS[intentResult.suggested_strategy]}>
              {intentResult.suggested_strategy === 'single_expert' ? '单专家' :
               intentResult.suggested_strategy === 'parallel_experts' ? '并行专家' :
               intentResult.suggested_strategy === 'sequential_chain' ? '顺序链' : '层级'}
            </Tag>
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0', borderColor: '#2C2C31' }} />

      {/* Primary Intent */}
      <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31' }} bodyStyle={{ padding: 10 }}>
        <Text type="secondary" style={{ fontSize: 10 }}>主意图</Text>
        <div style={{ marginTop: 4 }}>
          <Tag color="#7065F3" style={{ fontSize: 13 }}>{intentResult.primary_intent}</Tag>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
            置信度: {(intentResult.confidence * 100).toFixed(0)}%
          </Text>
        </div>
      </Card>

      {/* Secondary Intents */}
      {intentResult.secondary_intents.length > 0 && (
        <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>辅助意图</Text>
          <div style={{ marginTop: 4 }}>
            {intentResult.secondary_intents.map((i, idx) => (
              <Tag key={idx} style={{ marginBottom: 4 }}>{i}</Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Keywords */}
      <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
        <Text type="secondary" style={{ fontSize: 10 }}>关键词</Text>
        <div style={{ marginTop: 4 }}>
          {intentResult.intent_keywords.slice(0, 15).map((kw, idx) => (
            <Tag key={idx} color="default" style={{ marginBottom: 2 }}>{kw}</Tag>
          ))}
        </div>
      </Card>

      {/* Recommended Experts */}
      <Card size="small" style={{ background: '#0D0D0F', border: '1px solid #2C2C31', marginTop: 8 }} bodyStyle={{ padding: 10 }}>
        <Text type="secondary" style={{ fontSize: 10 }}>推荐专家 (Top 5)</Text>
        <div style={{ marginTop: 6 }}>
          {intentResult.suggested_experts.map((exp, idx) => (
            <Card
              key={exp.expert_id}
              size="small"
              style={{
                background: '#18181B',
                border: '1px solid #2C2C31',
                marginBottom: 4,
                borderRadius: 6
              }}
              bodyStyle={{ padding: '6px 8px' }}
            >
              <Space>
                <Text style={{ color: '#7065F3', fontSize: 12 }}>{idx + 1}</Text>
                <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{exp.name}</Text>
                <TierTag tier={exp.tier} />
                <Tag color={DOMAINS[exp.domain]?.color}>{exp.domain}</Tag>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {(exp.match_score * 100).toFixed(0)}% 匹配
                </Text>
              </Space>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}
