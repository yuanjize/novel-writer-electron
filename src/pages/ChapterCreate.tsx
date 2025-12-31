import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { App as AntdApp, Button, Card, Form, Input, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'

const { Title } = Typography

function ChapterCreate() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const chapters = useAppStore((state) => state.chapters)
  const ipc = useElectronIPC()
  const { message } = AntdApp.useApp()

  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [nextChapterNum, setNextChapterNum] = useState(1)

  useEffect(() => {
    // 计算下一章的编号
    if (chapters.length > 0) {
      const maxNum = Math.max(...chapters.map((c) => c.chapter_number))
      setNextChapterNum(maxNum + 1)
    } else {
      setNextChapterNum(1)
    }
  }, [chapters])

  const handleCreate = async () => {
    if (!title.trim()) {
      message.error('请输入章节标题')
      return
    }

    if (!projectId) return

    setLoading(true)

    try {
      const chapter = await ipc.createChapter({
        project_id: Number(projectId),
        title: title.trim(),
        content: '',
        chapter_number: nextChapterNum,
        status: 'draft'
      })

      if (chapter) {
        message.success('章节创建成功')
        navigate(`/project/${projectId}/chapter/${chapter.id}`)
      }
    } catch (error) {
      message.error('创建章节失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/project/${projectId}`)}
        style={{ marginBottom: '24px' }}
      >
        返回
      </Button>

      <Card>
        <Form layout="vertical">
          <Form.Item>
            <Title level={3}>创建新章节</Title>
          </Form.Item>

          <Form.Item label="章节编号">
            <Input value={`第 ${nextChapterNum} 章`} disabled />
          </Form.Item>

          <Form.Item label="章节标题" required>
            <Input
              size="large"
              placeholder="例如：初入修仙界"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onPressEnter={handleCreate}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              size="large"
              block
              icon={<SaveOutlined />}
              onClick={handleCreate}
              loading={loading}
            >
              创建章节
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default ChapterCreate
