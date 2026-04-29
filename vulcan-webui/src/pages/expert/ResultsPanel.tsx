import React from 'react'
import { Card, Tabs, Space } from 'antd'
import {
  BulbOutlined, NodeIndexOutlined, ArrowRightOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import type { IntentResult, DecompositionResult, ExecutionPlan, ExecutionResult } from './types'
import { IntentTab } from './IntentTab'
import { DecompositionTab } from './DecompositionTab'
import { ExecutionPlanTab } from './ExecutionPlanTab'
import { ExecutionResultTab } from './ExecutionResultTab'

export interface ResultsPanelProps {
  activeTab: string
  onTabChange: (key: string) => void
  intentResult: IntentResult | null
  decomposition: DecompositionResult | null
  executionPlan: ExecutionPlan | null
  executionResult: ExecutionResult | null
}

export function ResultsPanel({
  activeTab,
  onTabChange,
  intentResult,
  decomposition,
  executionPlan,
  executionResult,
}: ResultsPanelProps) {
  if (!intentResult && !decomposition && !executionResult) {
    return null
  }

  return (
    <Card
      style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
      bodyStyle={{ padding: 0 }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        style={{ padding: '0 16px' }}
        items={[
          {
            key: 'intent',
            label: <Space><BulbOutlined /> 意图识别</Space>,
            children: <IntentTab intentResult={intentResult} />,
          },
          {
            key: 'decomp',
            label: <Space><NodeIndexOutlined /> 任务拆解</Space>,
            children: <DecompositionTab decomposition={decomposition} />,
          },
          {
            key: 'plan',
            label: <Space><ArrowRightOutlined /> 执行计划</Space>,
            children: <ExecutionPlanTab executionPlan={executionPlan} />,
          },
          {
            key: 'result',
            label: <Space><CheckCircleOutlined /> 执行结果</Space>,
            children: <ExecutionResultTab executionResult={executionResult} />,
          },
        ]}
      />
    </Card>
  )
}
