import { useState, useEffect } from 'react'
import { Card, Space, Typography, List, Progress, Statistic, Row, Col, Empty, Spin } from 'antd'
import { BarChartOutlined, PieChartOutlined, LineChartOutlined, ExperimentOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface ContentAnalysisPanelProps {
  content: string
  characterNames: string[]
}

export default function ContentAnalysisPanel({ content, characterNames }: ContentAnalysisPanelProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!content || content.length < 100) return
    const analyze = async () => {
      setLoading(true)
      const res = await window.electronAPI.ai.analyzeTextStructure({ content, charNames: characterNames })
      if (res.success) setData(res.data)
      setLoading(false)
    }
    analyze()
  }, [content])

  if (!content) return <Empty description="输入更多内容以开始分析" />
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin tip="AI 正在深度解构文本..." /></div>
  if (!data) return <div style={{ padding: 20 }}>暂无分析数据</div>

  return (
    <div style={{ padding: 16 }}>
      <Title level={5}><ExperimentOutlined /> 文本深度解构</Title>
      
      <Card size="small" title="剧情节奏波形" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 60, gap: 4 }}>
          {data.pacing.map((p: any, i: number) => (
            <Tooltip title={`${p.label}: ${p.score}`} key={i}>
              <div style={{ 
                flex: 1, 
                background: 'var(--paper-accent)', 
                height: `${p.score * 10}%`,
                borderRadius: '2px 2px 0 0',
                opacity: 0.6 + (p.score / 25)
              }} />
            </Tooltip>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>开篇</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>结尾</Text>
        </div>
      </Card>

      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="风格指数">
            <Statistic title="易读性" value={data.style.readability} suffix="/ 100" valueStyle={{ fontSize: 18 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>语调: {data.style.tone}</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="角色占比">
            {data.characterStats.map((c: any) => (
              <div key={c.name} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 11 }}>{c.name}</Text>
                <Progress percent={(c.count / 20) * 100} size="small" showInfo={false} />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

import { Tooltip } from 'antd'
