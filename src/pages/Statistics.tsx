import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Button, Typography, Card, Statistic, Row, Col, Tooltip, Empty, Spin } from 'antd'
import { ArrowLeftOutlined, FireOutlined, LineChartOutlined, CalendarOutlined } from '@ant-design/icons'
import { useElectronIPC } from '../hooks/useElectronIPC'

const { Header, Content } = Layout
const { Title, Text } = Typography

interface DailyStat {
  id: number
  project_id: number
  date: string
  word_count_change: number
  ai_usage_count: number
  updated_at: string
}

function Statistics() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const ipc = useElectronIPC()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DailyStat[]>([])
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await ipc.getStats(Number(projectId))
        if (data) {
          setStats(data.history || [])
          setTodayCount(data.today || 0)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId, ipc])

  // 生成热力图数据 (过去 365 天)
  const heatmapData = useMemo(() => {
    const today = new Date()
    const data: { date: string; count: number; level: number }[] = []
    const map = new Map<string, number>()
    
    stats.forEach(s => map.set(s.date, s.word_count_change))

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = map.get(dateStr) || 0
      
      let level = 0
      if (count > 0) {
        if (count < 500) level = 1
        else if (count < 1000) level = 2
        else if (count < 3000) level = 3
        else level = 4
      }

      data.push({ date: dateStr, count, level })
    }
    return data
  }, [stats])

  // 生成 AI 热力图数据
  const aiHeatmapData = useMemo(() => {
    const today = new Date()
    const data: { date: string; count: number; level: number }[] = []
    const map = new Map<string, number>()
    
    stats.forEach(s => map.set(s.date, s.ai_usage_count || 0))

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = map.get(dateStr) || 0
      
      let level = 0
      if (count > 0) {
        if (count < 5) level = 1
        else if (count < 15) level = 2
        else if (count < 30) level = 3
        else level = 4
      }

      data.push({ date: dateStr, count, level })
    }
    return data
  }, [stats])

  // 计算连载天数 (Streak)
  const streak = useMemo(() => {
    // 简单计算：从昨天开始往前推
    let current = 0
    const map = new Map<string, number>()
    stats.forEach(s => map.set(s.date, s.word_count_change))
    
    // 检查今天
    const todayStr = new Date().toISOString().split('T')[0]
    if ((map.get(todayStr) || 0) > 0) {
      current++
    }

    // 检查昨天及之前
    let i = 1
    while (true) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if ((map.get(dateStr) || 0) > 0) {
        current++
        i++
      } else {
        break
      }
    }
    return current
  }, [stats])

  const getColor = (level: number, type: 'green' | 'blue' = 'green') => {
    if (type === 'green') {
      switch (level) {
        case 1: return '#9be9a8'
        case 2: return '#40c463'
        case 3: return '#30a14e'
        case 4: return '#216e39'
        default: return '#ebedf0'
      }
    } else {
      switch (level) {
        case 1: return '#93c5fd'
        case 2: return '#60a5fa'
        case 3: return '#3b82f6'
        case 4: return '#1d4ed8'
        default: return '#ebedf0'
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--paper-bg)' }}>
      <Header style={{ background: 'var(--paper-surface)', padding: '0 24px', borderBottom: '1px solid var(--paper-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/project/${projectId}`)}
            style={{ marginRight: 16 }}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>创作数据中心</Title>
        </div>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="今日码字"
                value={todayCount}
                prefix={<FireOutlined style={{ color: '#fa541c' }} />}
                suffix="字"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="连续创作"
                value={streak}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                suffix="天"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="总贡献度"
                value={stats.reduce((acc, cur) => acc + (cur.word_count_change > 0 ? cur.word_count_change : 0), 0)}
                prefix={<LineChartOutlined style={{ color: '#52c41a' }} />}
                suffix="字"
              />
            </Card>
          </Col>
        </Row>

        <Card title="创作热力图 (码字量)" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
             {heatmapData.map((d) => (
               <Tooltip key={d.date} title={`${d.date}: ${d.count} 字`}>
                 <div
                   style={{
                     width: 12,
                     height: 12,
                     background: getColor(d.level, 'green'),
                     borderRadius: 2
                   }}
                 />
               </Tooltip>
             ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--paper-text-muted)' }}>
            <span style={{ marginRight: 4 }}>Less</span>
            <div style={{ width: 10, height: 10, background: '#ebedf0', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#9be9a8', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#40c463', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#30a14e', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#216e39', marginRight: 4 }}></div>
            <span>More</span>
          </div>
        </Card>

        <Card title="AI 辅助热力图 (调用次数)" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
             {aiHeatmapData.map((d) => (
               <Tooltip key={d.date} title={`${d.date}: ${d.count} 次`}>
                 <div
                   style={{
                     width: 12,
                     height: 12,
                     background: getColor(d.level, 'blue'),
                     borderRadius: 2
                   }}
                 />
               </Tooltip>
             ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--paper-text-muted)' }}>
            <span style={{ marginRight: 4 }}>Less</span>
            <div style={{ width: 10, height: 10, background: '#ebedf0', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#93c5fd', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#60a5fa', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#3b82f6', marginRight: 2 }}></div>
            <div style={{ width: 10, height: 10, background: '#1d4ed8', marginRight: 4 }}></div>
            <span>More</span>
          </div>
        </Card>

        {stats.length === 0 && (
           <Empty description="加油！开始写作后这里会有数据。" />
        )}
      </Content>
    </Layout>
  )
}

export default Statistics
