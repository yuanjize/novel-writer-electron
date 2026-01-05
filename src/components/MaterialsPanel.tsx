import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Collapse, Empty, Input, List, Space, Tabs, Tag, Typography, message } from 'antd'
import { BookOutlined, GlobalOutlined, ProfileOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Chapter, Character, Outline, WorldSetting } from '../types'

const { Text, Paragraph } = Typography

type MaterialsPanelProps = {
  projectId: number
  currentChapterId?: number
  onInsert: (text: string) => void
}

function buildCharacterText(c: Character) {
  const parts = [`【角色】${c.name}`]
  if (c.personality) parts.push(`性格：${c.personality}`)
  if (c.background) parts.push(`背景：${c.background}`)
  if (c.relationships) parts.push(`关系：${c.relationships}`)
  return parts.join('\n')
}

function buildWorldSettingText(s: WorldSetting) {
  const parts = [`【世界观】${s.category} / ${s.title}`]
  if (s.content) parts.push(s.content)
  return parts.join('\n')
}

function buildOutlineText(o: Outline) {
  const parts = [`【大纲】${o.type.toUpperCase()} / ${o.title}`]
  if (o.content) parts.push(o.content)
  return parts.join('\n')
}

function buildChapterText(c: Chapter) {
  const parts = [`【章节】第${c.chapter_number}章 / ${c.title}`]
  if (c.summary) parts.push(`摘要：${c.summary}`)
  return parts.join('\n')
}

export default function MaterialsPanel({ projectId, currentChapterId, onInsert }: MaterialsPanelProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const [characters, setCharacters] = useState<Character[]>([])
  const [settings, setSettings] = useState<WorldSetting[]>([])
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [cRes, sRes, oRes, chRes] = await Promise.all([
        window.electronAPI.character.getAll(projectId),
        window.electronAPI.worldSetting.getAll(projectId),
        window.electronAPI.outline.getAll(projectId),
        window.electronAPI.project.getChapters(projectId)
      ])
      if (cRes.success) setCharacters(cRes.data ?? [])
      if (sRes.success) setSettings(sRes.data ?? [])
      if (oRes.success) setOutlines(oRes.data ?? [])
      if (chRes.success) setChapters(chRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [projectId])

  const q = query.trim().toLowerCase()
  const filterByQuery = (haystack: string) => (q ? haystack.toLowerCase().includes(q) : true)

  const visibleCharacters = useMemo(() => {
    return characters.filter((c) => filterByQuery([c.name, c.personality, c.background, c.relationships].filter(Boolean).join(' ')))
  }, [characters, q])

  const visibleSettings = useMemo(() => {
    return settings.filter((s) => filterByQuery([s.category, s.title, s.content].filter(Boolean).join(' ')))
  }, [settings, q])

  const visibleOutlines = useMemo(() => {
    return outlines
      .filter((o) => filterByQuery([o.type, o.title, o.content].filter(Boolean).join(' ')))
      .sort((a, b) => a.sequence - b.sequence)
  }, [outlines, q])

  const visibleChapters = useMemo(() => {
    return chapters
      .filter((c) => !c.deleted_at)
      .filter((c) => filterByQuery([`第${c.chapter_number}章`, c.title, c.summary].filter(Boolean).join(' ')))
      .sort((a, b) => a.chapter_number - b.chapter_number)
  }, [chapters, q])

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, WorldSetting[]>()
    for (const s of visibleSettings) {
      groups.set(s.category, [...(groups.get(s.category) ?? []), s])
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [visibleSettings])

  const tabLabel = (icon: ReactNode, label: string, count: number) => (
    <Space size={6}>
      {icon}
      <span>{label}</span>
      <Tag style={{ marginInlineStart: 4 }}>{count}</Tag>
    </Space>
  )

  const quickActions = (
    <Space wrap size={8}>
      <Button size="small" icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
        刷新
      </Button>
      <Button size="small" onClick={() => navigate(`/project/${projectId}/characters`)}>
        角色管理
      </Button>
      <Button size="small" onClick={() => navigate(`/project/${projectId}/worldview`)}>
        世界观
      </Button>
      <Button size="small" onClick={() => navigate(`/project/${projectId}/outline`)}>
        大纲
      </Button>
    </Space>
  )

  const emptyHint = (
    <div style={{ padding: 12 }}>
      <Empty description="资料为空：先在 角色 / 世界观 / 大纲 页面录入内容" />
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>{quickActions}</div>
    </div>
  )

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }

  const handleInsert = (text: string) => {
    onInsert(text.endsWith('\n') ? `\n${text}` : `\n${text}\n`)
    message.success('已插入到编辑器')
  }

  const tabs = [
    {
      key: 'characters',
      label: tabLabel(<TeamOutlined />, '角色', visibleCharacters.length),
      children:
        visibleCharacters.length === 0
          ? emptyHint
          : (
              <List
                size="small"
                dataSource={visibleCharacters}
                renderItem={(c) => {
                  const txt = buildCharacterText(c)
                  return (
                    <List.Item
                      actions={[
                        <Button key="copy" size="small" type="link" onClick={() => handleCopy(txt)}>复制</Button>,
                        <Button key="insert" size="small" type="link" onClick={() => handleInsert(txt)}>插入</Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Space><TeamOutlined /> <Text strong>{c.name}</Text></Space>}
                        description={
                          <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                            {[c.personality, c.background].filter(Boolean).join(' / ') || '（暂无详细设定）'}
                          </Paragraph>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            )
    },
    {
      key: 'world',
      label: tabLabel(<GlobalOutlined />, '世界观', visibleSettings.length),
      children:
        visibleSettings.length === 0
          ? emptyHint
          : (
              <Collapse
                bordered={false}
                defaultActiveKey={groupedSettings.slice(0, 1).map(([k]) => k)}
                items={groupedSettings.map(([category, items]) => ({
                  key: category,
                  label: (
                    <Space size={8}>
                      <GlobalOutlined />
                      <Text strong>{category}</Text>
                      <Tag>{items.length}</Tag>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={items}
                      renderItem={(s) => {
                        const txt = buildWorldSettingText(s)
                        return (
                          <List.Item
                            actions={[
                              <Button key="copy" size="small" type="link" onClick={() => handleCopy(txt)}>复制</Button>,
                              <Button key="insert" size="small" type="link" onClick={() => handleInsert(txt)}>插入</Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={<Text strong>{s.title}</Text>}
                              description={
                                <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                                  {s.content || '（暂无内容）'}
                                </Paragraph>
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  )
                }))}
              />
            )
    },
    {
      key: 'outline',
      label: tabLabel(<ProfileOutlined />, '大纲', visibleOutlines.length),
      children:
        visibleOutlines.length === 0
          ? emptyHint
          : (
              <List
                size="small"
                dataSource={visibleOutlines}
                renderItem={(o) => {
                  const txt = buildOutlineText(o)
                  return (
                    <List.Item
                      actions={[
                        <Button key="copy" size="small" type="link" onClick={() => handleCopy(txt)}>复制</Button>,
                        <Button key="insert" size="small" type="link" onClick={() => handleInsert(txt)}>插入</Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={8}>
                            <ProfileOutlined />
                            <Text strong>{o.title}</Text>
                            <Tag>{o.type}</Tag>
                          </Space>
                        }
                        description={
                          <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                            {o.content || '（暂无内容）'}
                          </Paragraph>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            )
    },
    {
      key: 'chapters',
      label: tabLabel(<BookOutlined />, '章节', visibleChapters.length),
      children:
        visibleChapters.length === 0
          ? emptyHint
          : (
              <List
                size="small"
                dataSource={visibleChapters}
                renderItem={(c) => {
                  const txt = buildChapterText(c)
                  const isCurrent = currentChapterId === c.id
                  return (
                    <List.Item
                      actions={[
                        <Button key="open" size="small" type="link" disabled={isCurrent} onClick={() => navigate(`/project/${projectId}/chapter/${c.id}`)}>
                          打开
                        </Button>,
                        <Button key="copy" size="small" type="link" onClick={() => handleCopy(txt)}>复制</Button>,
                        <Button key="insert" size="small" type="link" onClick={() => handleInsert(txt)}>插入</Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong>{`第${c.chapter_number}章：${c.title}`}</Text>}
                        description={<Text type="secondary">{c.summary ? `摘要：${c.summary}` : '（暂无摘要）'}</Text>}
                      />
                    </List.Item>
                  )
                }}
              />
            )
    }
  ]

  const anyHasData = characters.length + settings.length + outlines.length + chapters.length > 0

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        <Input
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索资料：角色名 / 设定标题 / 大纲内容…"
        />
        {quickActions}
        {!anyHasData ? (
          emptyHint
        ) : (
          <Tabs items={tabs} />
        )}
      </Space>
    </div>
  )
}
