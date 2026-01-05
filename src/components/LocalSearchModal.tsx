import { useState, useEffect, useRef } from 'react'
import { Modal, Input, Button, Space, Typography, Badge } from 'antd'
import { SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, SwapOutlined } from '@ant-design/icons'

interface LocalSearchModalProps {
  open: boolean
  onClose: () => void
  content: string
  onNavigate: (index: number, length: number) => void
  onReplace: (oldText: string, newText: string, replaceAll?: boolean) => void
}

export default function LocalSearchModal({ open, onClose, content, onNavigate, onReplace }: LocalSearchModalProps) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matches, setMatches] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0) // 0-based index in matches array
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      findAll(findText)
    }
  }, [open, content]) // Re-run if content changes while open

  const findAll = (text: string) => {
    if (!text) {
      setMatches([])
      return
    }
    // Simple case-insensitive search
    const indices: number[] = []
    let pos = content.toLowerCase().indexOf(text.toLowerCase())
    while (pos !== -1) {
      indices.push(pos)
      pos = content.toLowerCase().indexOf(text.toLowerCase(), pos + 1)
    }
    setMatches(indices)
    // If we had a selection, try to keep it, otherwise reset
    if (indices.length > 0) {
      // Find nearest match to current cursor? Complex. Just go to first for now.
      setCurrentIndex(0)
      onNavigate(indices[0], text.length)
    }
  }

  const handleFindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFindText(val)
    findAll(val)
  }

  const handleNext = () => {
    if (matches.length === 0) return
    const next = (currentIndex + 1) % matches.length
    setCurrentIndex(next)
    onNavigate(matches[next], findText.length)
  }

  const handlePrev = () => {
    if (matches.length === 0) return
    const prev = (currentIndex - 1 + matches.length) % matches.length
    setCurrentIndex(prev)
    onNavigate(matches[prev], findText.length)
  }

  const handleReplace = () => {
    if (matches.length === 0) return
    // Replace current instance
    // We rely on parent to handle actual content update
    // But we need to pass strict context to avoid race conditions?
    // Parent just needs "replace matched text at current index"
    // Actually, passing old/new text is safer if we just do "replace current selection" logic in parent
    // But here we know the index.
    // Let's pass the specific change to parent?
    // No, standard Replace usually works on "Current Selection".
    // Let's assume onReplace handles "Replace currently selected text".
    onReplace(findText, replaceText, false)
    // Refresh matches happens via useEffect [content]
  }

  const handleReplaceAll = () => {
    if (!findText) return
    onReplace(findText, replaceText, true)
  }

  if (!open) return null

  // We use a small draggable-like absolute div instead of a heavy Modal?
  // Or a simple Modal with minimal styling.
  // AntD Modal with `mask={false}` allows interacting with editor?
  // No, `mask={false}` still captures focus often.
  // Let's use a fixed positioned Card.
  
  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 40,
      zIndex: 1000,
      background: 'var(--paper-surface)',
      padding: 12,
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '1px solid var(--paper-border)',
      width: 320,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input 
          ref={inputRef}
          prefix={<SearchOutlined style={{ color: '#ccc' }} />} 
          placeholder="查找..." 
          value={findText} 
          onChange={handleFindChange}
          onPressEnter={handleNext}
          suffix={<Badge count={matches.length} showZero color={matches.length > 0 ? '#52c41a' : '#d9d9d9'} />}
        />
        <Button icon={<ArrowUpOutlined />} onClick={handlePrev} />
        <Button icon={<ArrowDownOutlined />} onClick={handleNext} />
        <Button icon={<CloseOutlined />} type="text" onClick={onClose} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input 
          prefix={<SwapOutlined style={{ color: '#ccc' }} />}
          placeholder="替换为..." 
          value={replaceText} 
          onChange={e => setReplaceText(e.target.value)}
        />
        <Button onClick={handleReplace}>替换</Button>
        <Button onClick={handleReplaceAll}>全部</Button>
      </div>
    </div>
  )
}
