import { useState, useEffect, useMemo } from 'react'
import {
  Card, Space, Button, Select, Typography, Divider, Input, Tag, List,
  Empty, Collapse, Tooltip, Slider, Switch, Badge
} from 'antd'
import {
  RobotOutlined, SendOutlined, UserOutlined, GlobalOutlined,
  CheckOutlined, CopyOutlined, ThunderboltOutlined,
  SettingOutlined, ExperimentOutlined, FileAddOutlined
} from '@ant-design/icons'
import type { AIPersona, PromptTemplate, Character, WorldSetting } from '../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface AIPromptPanelProps {
  projectId: number
  chapterId?: number
  chapterNumber: number
  selection: string
  onApply: (text: string) => void
  onClose: () => void
  refreshTrigger?: number
}

export default function AIPromptPanel({ projectId, chapterId, chapterNumber, selection, onApply, onClose, refreshTrigger = 0 }: AIPromptPanelProps) {
  const [loading, setLoading] = useState(false)
  const [personas, setPersonas] = useState<AIPersona[]>([])
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [allSettings, setAllSettings] = useState<WorldSetting[]>([])

  const [isContextLocked, setIsContextLocked] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<number | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([])
  const [selectedSettingIds, setSelectedSettingIds] = useState<number[]>([])
  const [aiIntensity, setAiIntensity] = useState(0.7)
  const [useCoT, setUseCoT] = useState(false)
  
  const [userInput, setUserInput] = useState('')
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({})
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>>([])
  
  const [logicIssues, setLogicIssues] = useState<{ issue: string, suggestion: string }[]>([])
  const [checkingLogic, setCheckingLogic] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [pRes, tRes, cRes, sRes] = await Promise.all([
        window.electronAPI.ai.getPersonas(),
        window.electronAPI.ai.getPromptTemplates(),
        window.electronAPI.character.getAll(projectId),
        window.electronAPI.worldSetting.getAll(projectId)
      ])
      if (pRes.success) {
        const list = pRes.data ?? []
        setPersonas(list)
        if (list.length > 0 && !selectedPersona) setSelectedPersona(list[0].id)
      }
      if (tRes.success) setTemplates(tRes.data ?? [])
      if (cRes.success) setAllCharacters(cRes.data ?? [])
      if (sRes.success) setAllSettings(sRes.data ?? [])
    }
    load()
  }, [projectId, refreshTrigger])

  const activeTemplate = templates.find(t => t.id === selectedTemplate)
  const hasSelection = selection.trim().length > 0
  const templateVars = useMemo(() => {
    if (!activeTemplate) return []
    const matches = activeTemplate.content.match(/\{\{([^}]+)\}\}/g)
    if (!matches) return []
    return Array.from(new Set(matches.map(m => m.slice(2, -2)).filter(v => v !== 'selection')))
  }, [activeTemplate])

  useEffect(() => {
    if (!hasSelection && selectedTemplate) {
      const tpl = templates.find(t => t.id === selectedTemplate)
      if (tpl && tpl.content.includes('{{selection}}')) {
        setSelectedTemplate(null)
        setTemplateParams({})
      }
    }
  }, [hasSelection, selectedTemplate, templates])

  const handleCheckLogic = async () => {
    if (!selection) return
    setCheckingLogic(true)
    setLogicIssues([])
    const charNames = allCharacters.filter(c => selection.includes(c.name)).map(c => c.name)
    const res = await window.electronAPI.ai.checkLogicConsistency({ projectId, content: selection, charNames })
    if (res.success) setLogicIssues(res.data ?? [])
    setCheckingLogic(false)
  }

  const streamText = (text: string) => {
    let current = ''
    setChatHistory(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])
    let i = 0
    const interval = setInterval(() => {
      current += text[i]; i++
      setChatHistory(prev => {
        const next = [...prev]; next[next.length - 1] = { role: 'assistant', content: current, isStreaming: true }; return next
      })
      if (i >= text.length) {
        clearInterval(interval)
        setChatHistory(prev => {
          const next = [...prev]; next[next.length - 1] = { role: 'assistant', content: text, isStreaming: false }; return next
        })
      }
    }, 15)
  }

  const handleSend = async () => {
    if (!userInput && !selectedTemplate) return
    setLoading(true)
    const persona = personas.find(p => p.id === selectedPersona)
    const template = templates.find(t => t.id === selectedTemplate)
    
    let finalInput = userInput
    if (template) {
      let content = template.content.replace('{{selection}}', selection || '(未选中内容)')
      templateVars.forEach(v => {
        content = content.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), templateParams[v] || '')
      })
      finalInput = content + (userInput ? `\n要求: ${userInput}` : '')
    }
    
    if (useCoT) finalInput = `【逻辑分析模式】请先分析合理性：\n${finalInput}`

    const nextHistory = [...chatHistory, { role: 'user' as const, content: finalInput || template?.name || '开始执行' }]
    setChatHistory(nextHistory)
    setUserInput('')
    setTemplateParams({})

    try {
      const res = await window.electronAPI.ai.chat({
        messages: nextHistory, systemPrompt: persona?.system_prompt, temperature: aiIntensity,
        projectId, chapterId, chapterNumber, selection, pinnedContext: { charIds: selectedCharIds, settingIds: selectedSettingIds }
      })
      if (res.success) {
        streamText(res.data ?? '')
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ 请求失败: ${res.error || '未知错误'}`, isStreaming: false }])
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ 系统错误: ${(e as Error).message}`, isStreaming: false }])
    } finally {
      setLoading(false)
      if (!isContextLocked) {
        setSelectedTemplate(null)
      }
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        <Collapse ghost size="small" defaultActiveKey={['config']}>
          <Collapse.Panel 
            header={<Space><SettingOutlined /> <Text strong>AI 决策中枢</Text> {isContextLocked && <Badge status="processing" text="已锁定" />}</Space>} 
            key="config"
            extra={<Tooltip title="锁定配置"><Switch size="small" checked={isContextLocked} onChange={setIsContextLocked} /></Tooltip>}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>写作人格</Text>
                <Space><Text style={{ fontSize: 11 }}>CoT</Text><Switch size="small" checked={useCoT} onChange={setUseCoT} /></Space>
              </div>
              <Select size="small" style={{ width: '100%' }} value={selectedPersona} onChange={setSelectedPersona} options={personas.map(p => ({ label: p.name, value: p.id }))} />
              <Slider min={0.1} max={1.5} step={0.1} value={aiIntensity} onChange={setAiIntensity} />
              <Space wrap>
                {allCharacters.map(c => (
                  <Tag.CheckableTag key={c.id} checked={selectedCharIds.includes(c.id)} onChange={checked => setSelectedCharIds(checked ? [...selectedCharIds, c.id] : selectedCharIds.filter(id => id !== c.id))}>
                    <UserOutlined /> {c.name}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </Space>
          </Collapse.Panel>
          <Collapse.Panel header={<Space><ThunderboltOutlined /> <Text strong>写作技能库</Text></Space>} key="templates">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {templates.map(t => (
                  <Tooltip
                    key={t.id}
                    title={t.content.includes('{{selection}}') && !hasSelection ? '需要先选中文本才能使用' : (t.description || t.content)}
                  >
                    <Tag.CheckableTag
                      checked={selectedTemplate === t.id}
                      onChange={(checked) => {
                        const requiresSelection = t.content.includes('{{selection}}')
                        if (requiresSelection && !hasSelection) return
                        setSelectedTemplate(checked ? t.id : null)
                        setTemplateParams({})
                      }}
                      style={{
                        border: '1px solid var(--paper-border)',
                        borderRadius: '12px',
                        opacity: t.content.includes('{{selection}}') && !hasSelection ? 0.45 : 1,
                        cursor: t.content.includes('{{selection}}') && !hasSelection ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {t.name}{t.content.includes('{{selection}}') && !hasSelection ? <Text type="secondary">（需选中）</Text> : null}
                    </Tag.CheckableTag>
                  </Tooltip>
                ))}
              </div>
              {selectedTemplate && (
                <Card size="small" style={{ background: 'var(--paper-surface-2)' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {activeTemplate?.description && <Text type="secondary" style={{ fontSize: 12 }}>💡 {activeTemplate.description}</Text>}
                    {templateVars.length > 0 && templateVars.map(v => (
                      <Input key={v} size="small" addonBefore={v} placeholder={`请输入 ${v}...`} value={templateParams[v] || ''} onChange={e => setTemplateParams(p => ({...p, [v]: e.target.value}))} />
                    ))}
                  </Space>
                </Card>
              )}
            </Space>
          </Collapse.Panel>
        </Collapse>

        <div style={{ marginTop: 12 }}><Button size="small" icon={<ExperimentOutlined />} loading={checkingLogic} onClick={handleCheckLogic} disabled={!selection}>逻辑一致性检测</Button></div>
        {logicIssues.map((item, i) => (
          <Card key={i} size="small" style={{ background: '#fff2f0', border: '1px solid #ffccc7', marginTop: 8 }}>
            <Text type="danger" strong>偏离：</Text><Paragraph style={{ fontSize: 12 }}>{item.issue}</Paragraph>
            <Divider style={{ margin: '4px 0' }} /><Text type="success" style={{ fontSize: 12 }}>建议：{item.suggestion}</Text>
          </Card>
        ))}

        <Divider style={{ margin: '20px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chatHistory.map((item, idx) => (
            <div key={idx} style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: item.role === 'user' ? 'var(--paper-accent)' : 'var(--paper-surface)', color: item.role === 'user' ? '#fff' : 'var(--paper-text)', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{item.content}</div>
              {item.role === 'assistant' && !item.isStreaming && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <Button size="small" type="primary" shape="round" onClick={() => onApply(item.content)}>替换</Button>
                  <Button size="small" shape="round" icon={<FileAddOutlined />} onClick={() => onApply('\n' + item.content)}>插入</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px', background: 'var(--glass-bg)', borderTop: '1px solid var(--paper-border)' }}>
        <TextArea 
          autoSize={{ minRows: 1, maxRows: 6 }} 
          placeholder="⌘ + Enter 发送..." 
          value={userInput} 
          onChange={e => setUserInput(e.target.value)} 
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSend(); } }} 
          style={{ borderRadius: '12px', padding: '10px 14px', background: 'var(--paper-surface)', border: 'none', color: 'var(--paper-text)' }} 
        />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}><Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSend} disabled={!userInput && !selectedTemplate} style={{ borderRadius: '20px' }}>发送</Button></div>
      </div>
    </div>
  )
}
