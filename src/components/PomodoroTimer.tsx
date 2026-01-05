import { useState, useEffect } from 'react'
import { Button, Space, Typography, Tooltip, Badge } from 'antd'
import { ClockCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    } else if (timeLeft === 0) {
      setIsActive(false)
      new Notification('专注结束', { body: '恭喜完成一个番茄钟！喝杯水休息一下吧。' })
    }
    return () => clearInterval(timer)
  }, [isActive, timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Space className="glass-effect" style={{ padding: '2px 12px', borderRadius: 20 }}>
      <ClockCircleOutlined style={{ color: isActive ? '#f5222d' : '#bfbfbf' }} />
      <Text strong style={{ width: 40, textAlign: 'center', fontSize: 13 }}>{formatTime(timeLeft)}</Text>
      <Button 
        size="small" 
        type="text" 
        icon={isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
        onClick={() => setIsActive(!isActive)} 
      />
      <Button 
        size="small" 
        type="text" 
        icon={<ReloadOutlined />} 
        onClick={() => { setIsActive(false); setTimeLeft(25 * 60); }} 
      />
    </Space>
  )
}
