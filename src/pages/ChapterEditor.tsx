import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  App as AntdApp, Button, Layout, Input, Space, Typography, Spin, Card, Tag, 
  Tooltip, Modal, Select, List, Collapse, Empty, Tabs, Divider, Switch
} from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import {
  ArrowLeftOutlined, SaveOutlined, RobotOutlined, ThunderboltOutlined,
  SettingOutlined, FullscreenOutlined, FullscreenExitOutlined, CopyOutlined,
  ReadOutlined, BarChartOutlined, CheckOutlined, FileAddOutlined, QuestionCircleOutlined,
  HighlightOutlined, BulbOutlined, EditOutlined, SearchOutlined, HistoryOutlined,
  BoldOutlined, ItalicOutlined, CodeOutlined, UnorderedListOutlined, EyeOutlined, FormOutlined
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AISettingsModal from '../components/AISettingsModal'
import AIPromptPanel from '../components/AIPromptPanel'
import MaterialsPanel from '../components/MaterialsPanel'
import GlobalSearchModal from '../components/GlobalSearchModal'
import LocalSearchModal from '../components/LocalSearchModal'
import AtmospherePlayer from '../components/AtmospherePlayer'
import PomodoroTimer from '../components/PomodoroTimer'
import ShortcutHelper from '../components/ShortcutHelper'
import ManualModal from '../components/ManualModal'
import ContentAnalysisPanel from '../components/ContentAnalysisPanel'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import { shallow } from 'zustand/shallow'
import type { Character, Chapter, ChapterVersion } from '../types'
import { diffLines } from '../utils/lineDiff'

const { Header, Content, Sider } = Layout
const { Text } = Typography
const { TextArea } = Input

function ChapterEditor() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>()
  const navigate = useNavigate()
  const { currentChapter, setCurrentChapter } = useAppStore(state => ({ currentChapter: state.currentChapter, setCurrentChapter: state.setCurrentChapter }), shallow)
  const ipc = useElectronIPC()
  const { message } = AntdApp.useApp()
  
  const [loading, setLoading] = useState(true)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [siderVisible, setSiderVisible] = useState(true)
  const [rightSiderMode, setRightSiderMode] = useState<'materials' | 'ai' | 'analysis'>('materials')
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutOpen, setShortcutOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 })
  const [aiSelection, setAiSelection] = useState('')

  const [characters, setCharacters] = useState<Character[]>([])
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [todayWords, setTodayWords] = useState(0)
  const [emotionAnalysis, setEmotionAnalysis] = useState<any>(null)
  const [analyzingEmotion, setAnalyzingEmotion] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [plotSuggestions, setPlotSuggestions] = useState<string[]>([])
  const [plotModalVisible, setPlotModalVisible] = useState(false)
  const [aiDataRefreshTrigger, setAiDataRefreshTrigger] = useState(0)
  const [localSearchOpen, setLocalSearchOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versions, setVersions] = useState<ChapterVersion[]>([])
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffSummary, setDiffSummary] = useState('')
  const [diffTags, setDiffTags] = useState<string[]>([])
  const [showUnchangedDiffLines, setShowUnchangedDiffLines] = useState(false)

  const lineDiffData = useMemo(() => {
    const idx = versions.findIndex((v) => v.id === activeVersionId)
    if (idx < 0) return null
    const curr = versions[idx]
    const prev = idx + 1 < versions.length ? versions[idx + 1] : null
    const ops = prev ? diffLines(prev.content || '', curr.content || '') : []

    let added = 0
    let removed = 0
    for (const op of ops) {
      if (op.type === 'insert') added++
      if (op.type === 'delete') removed++
    }

    return { curr, prev, ops, added, removed }
  }, [versions, activeVersionId])

  const lineDiffRows = useMemo(() => {
    if (!lineDiffData?.prev) return []
    let oldNo = 1
    let newNo = 1
    const rows: Array<{ type: 'equal' | 'insert' | 'delete'; oldNo: number | null; newNo: number | null; text: string }> = []

    for (const op of lineDiffData.ops) {
      const row = {
        type: op.type,
        oldNo: op.type === 'insert' ? null : oldNo,
        newNo: op.type === 'delete' ? null : newNo,
        text: op.line
      }

      if (showUnchangedDiffLines || op.type !== 'equal') rows.push(row)

      if (op.type === 'equal') {
        oldNo++
        newNo++
      } else if (op.type === 'delete') {
        oldNo++
      } else {
        newNo++
      }
    }

    return rows
  }, [lineDiffData, showUnchangedDiffLines])

  const textareaRef = useRef<TextAreaRef | null>(null)
  // 核心：选区记忆 Ref
  const selectionRef = useRef({ start: 0, end: 0 })
  const forceVersionNextSaveRef = useRef(false)

  useEffect(() => {
    if (theme === 'dark') document.body.setAttribute('data-theme', 'dark')
    else document.body.removeAttribute('data-theme')
  }, [theme])

  // 同步选区状态
  const syncSelection = (e: any) => {
    const target = e.target as HTMLTextAreaElement
    selectionRef.current = { start: target.selectionStart, end: target.selectionEnd }
  }

  // 统一处理 TextArea 的各类光标事件
  const handleTextAreaEvent = (e: any) => {
    if (e.type !== 'blur') {
      syncSelection(e)
    }
    if (e.type === 'mouseup' || e.type === 'select' || e.type === 'keyup') {
      handleTextSelect() // 原有的选中文本逻辑
    }
  }

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (el) {
      // 使用记忆的选区，而不是实时的（因为点击按钮时焦点可能已丢失）
      const { start, end } = selectionRef.current
      const text = content // 使用 state 中的 content 保证最新
      const before = text.substring(0, start)
      const selected = text.substring(start, end)
      const after = text.substring(end)
      const newText = before + prefix + selected + suffix + after
      setContent(newText)
      
      // 恢复焦点并更新光标位置
      setTimeout(() => {
        el.focus()
        const newCursorPos = start + prefix.length
        el.setSelectionRange(newCursorPos, end + prefix.length)
        // 更新 Ref
        selectionRef.current = { start: newCursorPos, end: end + prefix.length }
      }, 0)
    }
  }
  
  const handleLocalSearchNavigate = (index: number, length: number) => {
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (el) {
      el.focus()
      el.setSelectionRange(index, index + length)
      selectionRef.current = { start: index, end: index + length }
      // Attempt to scroll into view by blur/focus hack or calculating lines
      const value = el.value
      const lineNo = value.substr(0, index).split(/\r\n|\r|\n/).length
      // Estimate line height ~ 30px (from CSS line-height 1.8 * 16px)
      const lineHeight = 34 
      el.scrollTop = (lineNo - 5) * lineHeight // Scroll to show match with some context
    }
  }

  const handleLocalSearchReplace = (oldText: string, newText: string, replaceAll?: boolean) => {
    if (replaceAll) {
      // Case insensitive global replace
      const regex = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      setContent(c => c.replace(regex, newText))
      message.success('全部替换完成')
    } else {
      const el = textareaRef.current?.resizableTextArea?.textArea
      if (el) {
        // 使用记忆选区优先，或者尝试当前选区
        let { start, end } = selectionRef.current
        // 如果记忆选区长度不对（比如仅仅是光标），尝试重新获取（针对 Ctrl+F 这种保持焦点的操作）
        if (start === end) {
           start = el.selectionStart
           end = el.selectionEnd
        }

        const selected = content.substring(start, end)
        if (selected.toLowerCase() === oldText.toLowerCase()) {
           setContent(c => c.substring(0, start) + newText + c.substring(end))
           // Keep cursor after replacement
           setTimeout(() => {
             const newEnd = start + newText.length
             el.setSelectionRange(start, newEnd)
             selectionRef.current = { start, end: newEnd }
             el.focus()
           }, 0)
        } else {
          message.warning('当前选中内容不匹配')
        }
      }
    }
  }

  const handleContinueWriting = async () => {
    if (!id) return
    setAiLoading(true)
    try {
      // 续写通常基于光标位置或末尾
      let contextContent = content
      const { start, end } = selectionRef.current
      // 如果有选区，或者光标不在末尾，可能只截取光标前的内容作为上下文？
      // 目前逻辑是发全文给 AI，AI 决定。
      // 咱们保持传 content。
      
      const res = await ipc.continueWriting(Number(id), { content })
      if (res.success && res.data?.suggestion) {
        const suggestion = res.data.suggestion
        const el = textareaRef.current?.resizableTextArea?.textArea
        if (el) {
          // 插入到光标位置（记忆位置）
          const insertPos = Math.max(start, end) // 确保在选区后或光标处
          const newContent = content.substring(0, insertPos) + suggestion + content.substring(insertPos)
          setContent(newContent)
          message.success('已续写')
          // 更新光标
          setTimeout(() => {
             const newCursor = insertPos + suggestion.length
             el.setSelectionRange(newCursor, newCursor)
             selectionRef.current = { start: newCursor, end: newCursor }
             el.focus()
          }, 0)
        } else {
          setContent(c => c + '\n' + suggestion)
          message.success('已续写到末尾')
        }
      } else {
        message.error(res.error || '续写失败')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAIResult = (text: string) => {
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (!el) return
    // 使用记忆选区
    const { start, end } = selectionRef.current
    forceVersionNextSaveRef.current = true
    setContent(content.substring(0, start) + text + content.substring(end))
    message.success('已应用 AI 建议')
    // 恢复焦点到插入文本后
    setTimeout(() => {
        const newCursor = start + text.length
        el.setSelectionRange(newCursor, newCursor)
        selectionRef.current = { start: newCursor, end: newCursor }
        el.focus()
    }, 0)
  }

  const handleInsertMaterial = (text: string) => {
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (!el) return
    const insertPos = Math.min(selectionRef.current.end, content.length)
    forceVersionNextSaveRef.current = true
    setContent(content.substring(0, insertPos) + text + content.substring(insertPos))
    setTimeout(() => {
      const newCursor = insertPos + text.length
      el.setSelectionRange(newCursor, newCursor)
      selectionRef.current = { start: newCursor, end: newCursor }
      el.focus()
    }, 0)
  }

  const handleImproveText = async () => {
    if (!id || !aiSelection) return
    setAiLoading(true)
    try {
      const res = await ipc.improveText(Number(id), aiSelection)
      if (res.success && res.data?.improved) {
        handleApplyAIResult(res.data.improved)
      } else {
        message.error(res.error || '润色失败')
      }
    } finally {
      setAiLoading(false)
      setPopoverVisible(false)
    }
  }

  // ... (SuggestPlot and others remain mostly same)

  // Prevent default onMouseDown to keep focus on editor
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const handleOutsideMouseDown = (e: React.MouseEvent) => {
    const { start, end } = selectionRef.current
    if (start === end) return
    const target = e.target as HTMLElement | null
    if (!target) return
    if (target.closest('textarea')) return
    if (target.closest('input, textarea, select, [contenteditable=\"true\"], .ant-select-selector, .ant-select-selection-search-input')) return
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (!el) return
    e.preventDefault()
    el.focus()
    el.setSelectionRange(start, end)
  }

  const handleSuggestPlot = async () => {
    if (!projectId) return
    setAiLoading(true)
    try {
      const res = await ipc.suggestPlot(Number(projectId), { existingChapters: allChapters.map(c => c.summary || '').filter(Boolean) })
      if (res.success && res.data?.suggestions) {
        setPlotSuggestions(res.data.suggestions)
        setPlotModalVisible(true)
      } else {
        message.error(res.error || '生成建议失败')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleSettingsClose = () => {
    setAiSettingsOpen(false)
    setAiDataRefreshTrigger(n => n + 1)
  }

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === '?') { if ((e.target as HTMLElement).tagName !== 'TEXTAREA') setShortcutOpen(true) }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') { 
        e.preventDefault(); setGlobalSearchOpen(true) 
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault(); setLocalSearchOpen(v => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handleKeys); return () => window.removeEventListener('keydown', handleKeys)
  }, [content, title])

  useEffect(() => {
    if (!id || !projectId) return
    const load = async () => {
      setLoading(true)
      const [chapter, charRes, allRes, statsRes] = await Promise.all([
        ipc.loadChapter(Number(id)),
        window.electronAPI.character.getAll(Number(projectId)),
        window.electronAPI.project.getChapters(Number(projectId)),
        window.electronAPI.stats.getAll(Number(projectId))
      ])
      if (chapter) {
        setCurrentChapter(chapter); setTitle(chapter.title || ''); setContent(chapter.content || ''); setLastSavedAt(chapter.updated_at)
      }
      if (charRes.success) setCharacters(charRes.data ?? [])
      if (allRes.success) setAllChapters(allRes.data ?? [])
      if (statsRes.success) setTodayWords(statsRes.data?.today ?? 0)
      setLoading(false)
    }
    load()
  }, [id, projectId])

  const handleTextSelect = () => {
    const el = textareaRef.current?.resizableTextArea?.textArea
    if (!el) return
    const selected = el.value.substring(el.selectionStart, el.selectionEnd).trim()
    if (selected.length > 0) {
      const rect = el.getBoundingClientRect()
      setPopoverPos({ x: rect.left + 50, y: rect.top + 50 }); setPopoverVisible(true); setAiSelection(selected)
    } else { setPopoverVisible(false) }
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    const payload: any = { title: title.trim(), content }
    if (forceVersionNextSaveRef.current) payload.__forceVersion = true
    const updated = await ipc.updateChapter(Number(id), payload)
    if (updated) { setLastSavedAt(updated.updated_at); forceVersionNextSaveRef.current = false; message.success('保存成功') }
    setSaving(false)
  }

  const loadVersions = async () => {
    if (!id) return
    setVersionsLoading(true)
    try {
      const list = await ipc.loadChapterVersions(Number(id), 50)
      setVersions(list)
      setActiveVersionId((prev) => prev ?? (list[0]?.id ?? null))
    } finally {
      setVersionsLoading(false)
    }
  }

  const openVersions = async () => {
    setVersionsOpen(true)
    setDiffSummary('')
    setDiffTags([])
    await loadVersions()
  }

  const handleCreateSnapshot = async () => {
    if (!id) return
    await ipc.createChapterSnapshot(Number(id))
    await loadVersions()
  }

  const handleRestoreVersion = async (versionId: number) => {
    if (!id) return
    Modal.confirm({
      title: '恢复到该版本？',
      content: '恢复后会覆盖当前编辑内容（建议先手动保存或创建快照）。',
      okText: '恢复',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        const restored = await ipc.restoreChapterVersion(Number(id), versionId)
        if (restored) {
          setTitle(restored.title || '')
          setContent(restored.content || '')
          setLastSavedAt(restored.updated_at)
          message.success('已恢复到该版本')
          setVersionsOpen(false)
        }
      }
    })
  }

  const handleAnalyzeDiff = async (versionId: number) => {
    setDiffLoading(true)
    try {
      const idx = versions.findIndex((v) => v.id === versionId)
      const previousVersionId = idx >= 0 && idx + 1 < versions.length ? versions[idx + 1].id : undefined
      const res = await ipc.analyzeVersionDiff(versionId, previousVersionId)
      if (res.success && res.data) {
        setDiffSummary(res.data.summary || '')
        setDiffTags(res.data.tags || [])
        await loadVersions()
      } else {
        message.error(res.error || '差异分析失败')
      }
    } finally {
      setDiffLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget; const { selectionStart, value } = el
    if (e.key === 'Enter') {
      const line = value.substring(0, selectionStart).split('\n').pop() || ''
      const match = line.match(/^\s+/)
      if (match) {
        e.preventDefault(); const indent = '\n' + match[0]
        setContent(value.substring(0, selectionStart) + indent + value.substring(selectionStart))
        setTimeout(() => el.selectionStart = el.selectionEnd = selectionStart + indent.length, 0)
      }
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>

  return (
    <Layout style={{ backgroundColor: 'var(--paper-bg)', height: '100vh', overflow: 'hidden', transition: 'var(--transition-smooth)' }}>
      {!zenMode && (
        <Header className="glass-effect" style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, height: 64, flexShrink: 0 }}>
          <Space size="large">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/project/${projectId}`)} />
            <Select variant="borderless" value={Number(id)} style={{ minWidth: 160, fontWeight: 600 }} onChange={v => navigate(`/project/${projectId}/chapter/${v}`)} options={allChapters.map(c => ({ label: `第${c.chapter_number}章: ${c.title}`, value: c.id }))} />
          </Space>
          <Space>
            <PomodoroTimer />
            <Divider type="vertical" />
            <AtmospherePlayer />
            <Select
              size="small"
              value={theme}
              onChange={setTheme}
              variant="borderless"
              options={[
                { value: 'light', label: '日间' },
                { value: 'dark', label: '夜间' }
              ]}
            />
            <Divider type="vertical" />
            <Tooltip title="AI 续写"><Button type="text" icon={<ThunderboltOutlined />} onClick={handleContinueWriting} loading={aiLoading} /></Tooltip>
            <Tooltip title="情节建议"><Button type="text" icon={<BulbOutlined />} onClick={handleSuggestPlot} loading={aiLoading} /></Tooltip>
            <Divider type="vertical" />
            <Tooltip title="版本历史 / Diff"><Button type="text" icon={<HistoryOutlined />} onClick={openVersions} /></Tooltip>
            <Tooltip title="说明书"><Button type="text" icon={<QuestionCircleOutlined />} onClick={() => setManualOpen(true)} /></Tooltip>
            <Button type="text" icon={<SettingOutlined />} onClick={() => setAiSettingsOpen(true)} />
            <Button type="text" icon={<FullscreenOutlined />} onClick={() => setZenMode(true)} />
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存</Button>
          </Space>
        </Header>
      )}

      <Layout style={{ background: 'transparent', height: '100%', overflow: 'hidden' }} onMouseDownCapture={handleOutsideMouseDown}>
        <Content style={{ padding: zenMode ? '0' : '0 24px', position: 'relative', flex: 1, overflowY: 'auto', height: '100%' }}>
          {popoverVisible && !zenMode && (
            <div className="selection-popover glass-effect" style={{ position: 'fixed', left: popoverPos.x, top: popoverPos.y, zIndex: 1000, padding: '6px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
              <Tooltip title="AI 润色"><Button size="small" type="text" icon={<HighlightOutlined />} onClick={handleImproveText} loading={aiLoading} onMouseDown={preventFocusLoss}>润色</Button></Tooltip>
              <Tooltip title="AI 续写"><Button size="small" type="text" icon={<ThunderboltOutlined />} onClick={() => { handleContinueWriting(); setPopoverVisible(false); }} loading={aiLoading} onMouseDown={preventFocusLoss}>续写</Button></Tooltip>
              <Button size="small" type="text" icon={<RobotOutlined />} onClick={() => { setRightSiderMode('ai'); setSiderVisible(true); setPopoverVisible(false); }} onMouseDown={preventFocusLoss}>AI 处理</Button>
              <Divider type="vertical" style={{ height: 20 }} />
              <Tooltip title="复制"><Button size="small" type="text" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(aiSelection); setPopoverVisible(false); message.success('已复制'); }} onMouseDown={preventFocusLoss} /></Tooltip>
            </div>
          )}
          {zenMode && <Button type="text" icon={<FullscreenExitOutlined />} style={{ position: 'fixed', top: 24, right: 24, zIndex: 1001, color: 'var(--paper-text-muted)' }} onClick={() => setZenMode(false)} />} 
          <div style={{ maxWidth: '850px', margin: zenMode ? '0 auto' : '40px auto', background: zenMode ? 'transparent' : 'var(--paper-surface)', minHeight: '85vh', padding: zenMode ? '60px 40px' : '80px 100px', borderRadius: '16px', boxShadow: zenMode ? 'none' : '0 20px 50px rgba(0,0,0,0.03)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, right: 40, display: 'flex', gap: 8 }}>
              {viewMode === 'edit' && (
                <Space>
                  <Tooltip title="加粗"><Button size="small" type="text" icon={<BoldOutlined />} onClick={() => insertMarkdown('**', '**')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Tooltip title="斜体"><Button size="small" type="text" icon={<ItalicOutlined />} onClick={() => insertMarkdown('*', '*')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Tooltip title="标题"><Button size="small" type="text" icon={<span style={{ fontWeight: 'bold' }}>H</span>} onClick={() => insertMarkdown('## ')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Tooltip title="引用"><Button size="small" type="text" icon={<span style={{ fontFamily: 'monospace' }}>&gt;</span>} onClick={() => insertMarkdown('> ')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Tooltip title="代码"><Button size="small" type="text" icon={<CodeOutlined />} onClick={() => insertMarkdown('`', '`')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Tooltip title="列表"><Button size="small" type="text" icon={<UnorderedListOutlined />} onClick={() => insertMarkdown('- ')} onMouseDown={preventFocusLoss} /></Tooltip>
                  <Divider type="vertical" />
                </Space>
              )}
              <Tooltip title={viewMode === 'edit' ? '预览模式' : '编辑模式'}>
                <Button 
                  type={viewMode === 'preview' ? 'primary' : 'default'} 
                  icon={viewMode === 'edit' ? <EyeOutlined /> : <FormOutlined />} 
                  onClick={() => setViewMode(v => v === 'edit' ? 'preview' : 'edit')}
                  onMouseDown={preventFocusLoss}
                >
                  {viewMode === 'edit' ? '预览' : '编辑'}
                </Button>
              </Tooltip>
            </div>

            <Input placeholder="标题" value={title} onChange={e => setTitle(e.target.value)} variant="borderless" style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: 40, marginTop: 20 }} />
            
            {viewMode === 'edit' ? (
              <TextArea 
                ref={textareaRef} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                onKeyDown={handleKeyDown} 
                onSelect={handleTextAreaEvent}
                onClick={handleTextAreaEvent}
                onKeyUp={handleTextAreaEvent}
                onMouseUp={handleTextAreaEvent}
                onBlur={handleTextAreaEvent}
                variant="borderless" 
                className="editor-paper" 
                autoSize={{ minRows: 20 }} 
                style={{ ...textAreaStyle }} 
                spellCheck={false} 
              />
            ) : (
              <div className="editor-paper markdown-body" style={{ padding: '0 11px', lineHeight: '2.2', fontSize: '19px', minHeight: '400px' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            )}
          </div>
          {!zenMode && (
            <div style={{ position: 'fixed', bottom: 24, right: siderVisible ? 410 : 24, opacity: 0.6, fontSize: 12, textAlign: 'right' }}>
              <Space direction="vertical" align="end" size={0}>
                <Text type="secondary">{content.length} 字 | {lastSavedAt ? `保存于 ${lastSavedAt.split(' ')[1]}` : '未保存'}</Text>
                <div style={{ width: 120, height: 3, background: 'var(--paper-border)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (todayWords/3000)*100)}%`, height: '100%', background: 'var(--paper-accent)' }} />
                </div>
              </Space>
            </div>
          )}
        </Content>

        {!zenMode && (
          <Sider width={380} className="glass-effect" collapsed={!siderVisible} collapsedWidth={0} trigger={null} style={{ height: '100%', borderLeft: '1px solid var(--paper-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '0 16px', borderBottom: '1px solid var(--paper-border)', flexShrink: 0 }}>
                <Tabs activeKey={rightSiderMode} onChange={k => setRightSiderMode(k as any)} items={[{ key: 'materials', label: <Space><ReadOutlined />资料</Space> }, { key: 'analysis', label: <Space><BarChartOutlined />分析</Space> }, { key: 'ai', label: <Space><RobotOutlined />AI</Space> }]} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {rightSiderMode === 'ai'
                  ? <AIPromptPanel projectId={Number(projectId)} chapterId={currentChapter?.id} chapterNumber={currentChapter?.chapter_number || 1} selection={aiSelection} onApply={handleApplyAIResult} onClose={() => setSiderVisible(false)} refreshTrigger={aiDataRefreshTrigger} />
                  : rightSiderMode === 'analysis'
                    ? <ContentAnalysisPanel content={content} characterNames={characters.map(c => c.name)} />
                    : <MaterialsPanel projectId={Number(projectId)} currentChapterId={currentChapter?.id} onInsert={handleInsertMaterial} />}
              </div>
            </div>
          </Sider>
        )}
      </Layout>
      <LocalSearchModal open={localSearchOpen} onClose={() => setLocalSearchOpen(false)} content={content} onNavigate={handleLocalSearchNavigate} onReplace={handleLocalSearchReplace} />
      <ShortcutHelper open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
      <AISettingsModal open={aiSettingsOpen} onClose={handleSettingsClose} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <GlobalSearchModal projectId={Number(projectId)} open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <Modal
        title="版本历史（Time Machine）"
        open={versionsOpen}
        onCancel={() => setVersionsOpen(false)}
        footer={null}
        width={980}
      >
        <div style={{ display: 'flex', gap: 12, height: 560 }}>
          <div style={{ width: 340, borderRight: '1px solid var(--paper-border)', paddingRight: 12, overflowY: 'auto' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
              <Button onClick={loadVersions} loading={versionsLoading}>刷新</Button>
              <Button type="primary" onClick={handleCreateSnapshot}>创建快照</Button>
            </Space>
            <List
              loading={versionsLoading}
              dataSource={versions}
              renderItem={(v) => {
                const selected = v.id === activeVersionId
                return (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: selected ? 'rgba(79,70,229,0.08)' : 'transparent'
                    }}
                    onClick={() => {
                      setActiveVersionId(v.id)
                      setDiffSummary('')
                      setDiffTags([])
                    }}
                    actions={[
                      <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); handleRestoreVersion(v.id) }}>
                        恢复
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text strong>{new Date(v.created_at).toLocaleString()}</Text>}
                      description={<Text type="secondary">{v.word_count} 字</Text>}
                    />
                  </List.Item>
                )
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {(() => {
              const v = versions.find((x) => x.id === activeVersionId)
              if (!v) return <Empty description="请选择一个版本" />
              return (
                <Tabs
                  defaultActiveKey="content"
                  items={[
                    {
                      key: 'content',
                      label: '内容预览',
                      children: (
                        <div style={{ height: 500, overflowY: 'auto', paddingRight: 8 }}>
                          <Card size="small" style={{ marginBottom: 10 }}>
                            <Text type="secondary">标题：</Text> <Text strong>{v.title}</Text>
                          </Card>
                          <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'inherit' }}>{v.content || ''}</pre>
                        </div>
                      )
                    },
                    {
                      key: 'diff',
                      label: 'AI Diff（摘要）',
                      children: (
                        <div style={{ height: 500, overflowY: 'auto' }}>
                          <Space style={{ marginBottom: 10 }}>
                            <Button loading={diffLoading} onClick={() => handleAnalyzeDiff(v.id)}>
                              生成差异摘要
                            </Button>
                          </Space>
                          {diffTags.length > 0 ? (
                            <div style={{ marginBottom: 10 }}>
                              <Space wrap>
                                {diffTags.map((t) => (
                                  <Tag key={t}>{t}</Tag>
                                ))}
                              </Space>
                            </div>
                          ) : null}
                          <Card size="small">
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'inherit' }}>
                              {diffSummary || '点击“生成差异摘要”查看本版本相对上一版本的变化概览。'}
                            </pre>
                          </Card>
                        </div>
                      )
                    },
                    {
                      key: 'line',
                      label: '行级对比（Git 风格）',
                      children: (
                        <div style={{ height: 500, overflowY: 'auto' }}>
                          {!lineDiffData?.prev ? (
                            <Empty description="没有上一版本可对比（这是第一条版本）" />
                          ) : (
                            <div>
                              <Space style={{ marginBottom: 10 }} wrap>
                                <Text type="secondary">
                                  对比：{new Date(lineDiffData.prev.created_at).toLocaleString()} → {new Date(lineDiffData.curr.created_at).toLocaleString()}
                                </Text>
                                <Tag color="green">+{lineDiffData.added} 行</Tag>
                                <Tag color="red">-{lineDiffData.removed} 行</Tag>
                                <Space>
                                  <Switch checked={showUnchangedDiffLines} onChange={setShowUnchangedDiffLines} />
                                  <Text type="secondary">显示未改动</Text>
                                </Space>
                              </Space>

                              <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                                {lineDiffRows.length === 0 ? (
                                  <div style={{ padding: 12 }}>
                                    <Text type="secondary">没有差异</Text>
                                  </div>
                                ) : (
                                  lineDiffRows.map((row, idx2) => {
                                    const bg =
                                      row.type === 'insert'
                                        ? 'rgba(34,197,94,0.12)'
                                        : row.type === 'delete'
                                          ? 'rgba(239,68,68,0.12)'
                                          : 'transparent'
                                    const prefix = row.type === 'insert' ? '+' : row.type === 'delete' ? '-' : ' '
                                    const textColor = row.type === 'insert' ? '#16a34a' : row.type === 'delete' ? '#dc2626' : 'inherit'

                                    return (
                                      <div
                                        key={idx2}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '44px 44px 18px 1fr',
                                          gap: 8,
                                          padding: '2px 10px',
                                          background: bg,
                                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                          fontSize: 12,
                                          lineHeight: 1.8
                                        }}
                                      >
                                        <div style={{ textAlign: 'right', color: '#94a3b8' }}>{row.oldNo ?? ''}</div>
                                        <div style={{ textAlign: 'right', color: '#94a3b8' }}>{row.newNo ?? ''}</div>
                                        <div style={{ color: textColor }}>{prefix}</div>
                                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.text}</div>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  ]}
                />
              )
            })()}
          </div>
        </div>
      </Modal>
      <Modal title="情节建议" open={plotModalVisible} onCancel={() => setPlotModalVisible(false)} footer={null}>
        <List dataSource={plotSuggestions} renderItem={(item, i) => (
          <List.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>方案 {i + 1}</Text>
              <div>{item}</div>
              <Button size="small" onClick={() => { setContent(c => c + '\n\n【建议思路】' + item); setPlotModalVisible(false); message.success('已采纳'); }}>采纳</Button>
            </Space>
          </List.Item>
        )} />
      </Modal>
    </Layout>
  )
}

const textAreaStyle = { resize: 'none', padding: 0, background: 'transparent', caretColor: 'var(--paper-accent)', outline: 'none' } as const
export default ChapterEditor
