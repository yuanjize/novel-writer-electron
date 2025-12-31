import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Layout,
  Input,
  Space,
  Typography,
  Spin,
  Card,
  Tag
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  RobotOutlined,
  EditOutlined,
  BulbOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import { shallow } from 'zustand/shallow'

const { Header, Content } = Layout
const { Title, Text } = Typography
const { TextArea } = Input

function ChapterEditor() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>()
  const navigate = useNavigate()
  const { currentChapter, setCurrentChapter } = useAppStore(
    (state) => ({
      currentChapter: state.currentChapter,
      setCurrentChapter: state.setCurrentChapter
    }),
    shallow
  )
  const ipc = useElectronIPC()
  const { message, modal } = AntdApp.useApp()
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    const chapterId = Number(id)

    const loadChapter = async () => {
      setLoading(true)
      try {
        const chapter = await ipc.loadChapter(chapterId)
        if (cancelled) return

        setCurrentChapter(chapter)
        setTitle(chapter?.title || '')
        setContent(chapter?.content || '')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadChapter()
    return () => {
      cancelled = true
    }
  }, [id, ipc, setCurrentChapter])

  const handleSave = async () => {
    if (!id) return

    setSaving(true)

    try {
      const updated = await ipc.updateChapter(Number(id), {
        title: title.trim(),
        content: content.trim()
      })

      if (updated) {
        setCurrentChapter(updated)
        message.success('保存成功')
      }
    } catch (error) {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleAIContinue = async () => {
    if (!id || !content.trim()) {
      message.warning('请先输入一些内容，AI 才能续写')
      return
    }

    try {
      message.loading({ content: 'AI 正在续写…', key: 'ai', duration: 0 })

      const response = await ipc.continueWriting(Number(id), {
        content: content.trim()
      })

      if (!response.success) {
        message.error({ content: response.error || 'AI 续写失败', key: 'ai' })
        return
      }

      const suggestion = response.data?.suggestion?.trim()
      if (!suggestion) {
        message.error({ content: 'AI 返回内容为空', key: 'ai' })
        return
      }

      setContent((prev) => `${prev.trimEnd()}\n\n${suggestion}\n`)
      message.success({ content: 'AI 续写完成！', key: 'ai' })
    } catch (error) {
      message.error({ content: 'AI 续写失败，请重试', key: 'ai' })
    }
  }

  const handleAIOptimize = async () => {
    if (!content.trim()) {
      message.warning('请先输入需要优化的内容')
      return
    }

    if (!id) return

    try {
      message.loading({ content: 'AI 正在优化…', key: 'ai', duration: 0 })

      const response = await ipc.improveText(Number(id), content.trim())

      if (!response.success) {
        message.error({ content: response.error || 'AI 优化失败', key: 'ai' })
        return
      }

      const improved = response.data?.improved?.trim()
      if (!improved) {
        message.error({ content: 'AI 返回内容为空', key: 'ai' })
        return
      }

      setContent(improved)
      message.success({ content: 'AI 优化完成！', key: 'ai' })
    } catch (error) {
      message.error({ content: 'AI 优化失败，请重试', key: 'ai' })
    }
  }

  const handleAISuggest = async () => {
    if (!projectId) return

    try {
      message.loading({ content: 'AI 正在生成建议…', key: 'ai', duration: 0 })

      const response = await ipc.suggestPlot(Number(projectId), {
        genre: undefined
      })

      if (!response.success) {
        message.error({ content: response.error || 'AI 建议失败', key: 'ai' })
        return
      }

      const suggestions = response.data?.suggestions || []
      if (suggestions.length === 0) {
        message.error({ content: 'AI 没有返回有效建议', key: 'ai' })
        return
      }

      message.success({ content: '已生成情节建议', key: 'ai' })
      modal.info({
        title: '情节建议',
        okText: '知道了',
        content: (
          <div style={{ marginTop: 12 }}>
            {suggestions.map((s, i) => (
              <div key={`${i}-${s}`} style={{ marginBottom: 10, lineHeight: 1.7 }}>
                <Text strong>{i + 1}.</Text> <Text>{s}</Text>
              </div>
            ))}
          </div>
        )
      })
    } catch (error) {
      message.error({ content: 'AI 建议失败，请重试', key: 'ai' })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!currentChapter) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>章节不存在</Title>
        <Button onClick={() => navigate(`/project/${projectId}`)}>返回项目</Button>
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/project/${projectId}`)}
            >
              返回
            </Button>
            <Tag color={currentChapter.status === 'draft' ? 'default' : currentChapter.status === 'in_progress' ? 'blue' : 'green'}>
              {currentChapter.status === 'draft' ? '草稿' : currentChapter.status === 'in_progress' ? '进行中' : '已完成'}
            </Tag>
            <Text strong>第 {currentChapter.chapter_number} 章</Text>
          </Space>

          <Space size="middle">
            <Text type="secondary">{content.length.toLocaleString()} 字</Text>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 标题输入 */}
            <Card>
              <Input
                size="large"
                placeholder="章节标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onPressEnter={handleSave}
                style={{ fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>

            {/* AI 辅助工具栏 */}
            <Card>
              <Space wrap>
                <Button
                  icon={<RobotOutlined />}
                  onClick={handleAIContinue}
                >
                  AI 续写
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleAIOptimize}
                >
                  AI 优化
                </Button>
                <Button
                  icon={<BulbOutlined />}
                  onClick={handleAISuggest}
                >
                  情节建议
                </Button>
              </Space>
            </Card>

            {/* 内容编辑器 */}
            <Card style={{ minHeight: '500px' }}>
              <TextArea
                placeholder="开始写作..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  minHeight: '400px',
                  fontSize: '16px',
                  lineHeight: '1.8',
                  border: 'none',
                  resize: 'none'
                }}
              />
            </Card>
          </Space>
        </div>
      </Content>
    </Layout>
  )
}

export default ChapterEditor
