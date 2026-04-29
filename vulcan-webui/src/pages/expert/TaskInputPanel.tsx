import React from 'react'
import { Card, Space, Button, Input, Typography } from 'antd'
import { AimOutlined, PlayCircleOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

export interface TaskInputPanelProps {
  taskInput: string
  loading: boolean
  onTaskInputChange: (value: string) => void
  onClassify: () => void
  onExecute: () => void
  onClear: () => void
}

export function TaskInputPanel({
  taskInput,
  loading,
  onTaskInputChange,
  onClassify,
  onExecute,
  onClear,
}: TaskInputPanelProps) {
  return (
    <Card
      style={{ background: '#18181B', border: '1px solid #2C2C31', borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong style={{ color: '#FAFAFA' }}>📋 输入任务</Text>
        <TextArea
          placeholder="描述你的任务，例如：帮我分析一下最近的量子计算进展，并生成一份技术报告..."
          value={taskInput}
          onChange={e => onTaskInputChange(e.target.value)}
          rows={3}
          style={{
            background: '#0D0D0F',
            border: '1px solid #2C2C31',
            color: '#FAFAFA',
            borderRadius: 8
          }}
        />
        <Space>
          <Button
            type="primary"
            icon={<AimOutlined />}
            onClick={onClassify}
            loading={loading}
            style={{ background: '#7065F3', borderColor: '#7065F3' }}
          >
            分析任务
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onExecute}
            loading={loading}
            style={{ background: '#10b981', borderColor: '#10b981' }}
          >
            执行
          </Button>
          <Button onClick={onClear}>
            清空
          </Button>
        </Space>
      </Space>
    </Card>
  )
}
