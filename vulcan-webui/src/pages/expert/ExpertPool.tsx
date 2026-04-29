import React from 'react'
import { Card, Space, Row, Col, Tag, Divider, Typography } from 'antd'
import { NodeIndexOutlined } from '@ant-design/icons'
import type { ExpertMatch, DomainInfo } from './types'
import { DOMAINS, TierTag, ScoreBar } from './constants'

const { Text: AntText } = Typography

export interface ExpertCardProps {
  expert: ExpertMatch
  selected: boolean
  onSelect: () => void
}

export const ExpertCard = ({ expert, selected, onSelect }: ExpertCardProps) => (
  <Card
    size="small"
    hoverable
    onClick={onSelect}
    style={{
      border: selected ? '2px solid #7065F3' : '1px solid #2C2C31',
      background: selected ? '#1a1a2e' : '#18181B',
      cursor: 'pointer',
      borderRadius: 8,
    }}
    bodyStyle={{ padding: 10 }}
  >
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Space>
        <AntText strong style={{ color: '#FAFAFA', fontSize: 12 }}>{expert.name}</AntText>
        <TierTag tier={expert.tier} />
      </Space>
      <AntText type="secondary" style={{ fontSize: 10, color: '#9ca3af' }}>{expert.title}</AntText>
      <Space>
        <Tag color={DOMAINS[expert.domain]?.color || '#6b7280'} style={{ fontSize: 10 }}>
          {expert.domain}
        </Tag>
        <ScoreBar score={expert.match_score} />
      </Space>
    </Space>
  </Card>
)

export interface ExpertPoolProps {
  domainStats: DomainInfo[]
  domainFilter: string
  filteredExperts: ExpertMatch[]
  selectedExperts: string[]
  onSelectExpert: (expertId: string) => void
  onDomainFilterChange: (domain: string) => void
}

export function ExpertPool({
  domainStats,
  domainFilter,
  filteredExperts,
  selectedExperts,
  onSelectExpert,
  onDomainFilterChange,
}: ExpertPoolProps) {
  return (
    <Card
      title={<Space><NodeIndexOutlined /> 专家池 (100位)</Space>}
      style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
      bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}
    >
      {/* Domain Stats */}
      <div style={{ padding: '12px 12px 0' }}>
        <Row gutter={[8, 8]}>
          {domainStats.map(d => (
            <Col span={12} key={d.domain}>
              <Card
                size="small"
                style={{
                  background: '#0D0D0F',
                  border: `1px solid ${d.color}30`,
                  borderRadius: 8,
                  cursor: domainFilter === d.domain ? 'pointer' : 'default'
                }}
                bodyStyle={{ padding: '8px 6px' }}
                onClick={() => onDomainFilterChange(domainFilter === d.domain ? '全部' : d.domain)}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space>
                    <AntText style={{ color: d.color, fontSize: 14 }}>{d.icon}</AntText>
                    <AntText style={{ color: '#FAFAFA', fontSize: 11 }}>{d.domain}</AntText>
                  </Space>
                  <AntText type="secondary" style={{ fontSize: 10 }}>
                    {d.count}人 · {(d.avg_success_rate * 100).toFixed(0)}%成功率
                  </AntText>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#2C2C31' }} />

      {/* Expert List */}
      <div style={{ padding: '0 12px 12px' }}>
        <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
          <AntText type="secondary" style={{ fontSize: 11 }}>
            {filteredExperts.length} 位专家
          </AntText>
          {domainFilter !== '全部' && (
            <Tag color={DOMAINS[domainFilter]?.color}>{domainFilter}</Tag>
          )}
        </Space>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {filteredExperts.slice(0, 50).map(expert => (
            <ExpertCard
              key={expert.expert_id}
              expert={expert}
              selected={selectedExperts.includes(expert.expert_id)}
              onSelect={() => onSelectExpert(expert.expert_id)}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
