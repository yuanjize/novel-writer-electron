import { useState, useRef } from 'react'
import { Button, Divider, Slider, Popover, Typography, Tooltip } from 'antd'
import { SoundOutlined, PauseCircleOutlined, PlayCircleOutlined, CustomerServiceOutlined } from '@ant-design/icons'

const { Text } = Typography

const SOUNDS = [
  { name: '窗外雨声', url: 'https://actions.google.com/sounds/v1/ambiences/rain_on_roof.ogg' },
  { name: '午后咖啡', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { name: '壁炉柴火', url: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg' },
  { name: '森林深处', url: 'https://actions.google.com/sounds/v1/ambiences/forest_morning.ogg' }
]

export default function AtmospherePlayer() {
  const [playing, setPlaying] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = (url: string) => {
    if (playing === url) {
      audioRef.current?.pause()
      setPlaying(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.volume = volume
        audioRef.current.play()
        setPlaying(url)
      }
    }
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const content = (
    <div style={{ width: 220, padding: 8 }}>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>沉浸式氛围音</Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SOUNDS.map(s => (
          <div key={s.url} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>{s.name}</Text>
            <Button 
              size="small" 
              type={playing === s.url ? 'primary' : 'text'} 
              icon={playing === s.url ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
              onClick={() => togglePlay(s.url)}
            />
          </div>
        ))}
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SoundOutlined />
        <Slider style={{ flex: 1 }} min={0} max={1} step={0.1} value={volume} onChange={handleVolumeChange} />
      </div>
      <audio ref={audioRef} loop />
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Tooltip title="氛围音效">
        <Button type="text" icon={<CustomerServiceOutlined style={{ color: playing ? 'var(--paper-accent)' : 'inherit' }} />} />
      </Tooltip>
    </Popover>
  )
}
