import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, List, Space, Spin, Card } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, BookOutlined } from '@ant-design/icons'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import { shallow } from 'zustand/shallow'

const { Title, Text } = Typography

function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, chapters, setCurrentProject, setChapters } = useAppStore(
    (state) => ({
      currentProject: state.currentProject,
      chapters: state.chapters,
      setCurrentProject: state.setCurrentProject,
      setChapters: state.setChapters
    }),
    shallow
  )
  const ipc = useElectronIPC()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    const projectId = Number(id)

    const loadData = async () => {
      setLoading(true)
      try {
        const [project, chapterList] = await Promise.all([
          ipc.loadProject(projectId),
          ipc.loadChapters(projectId)
        ])

        if (cancelled) return
        setCurrentProject(project)
        setChapters(chapterList)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id, ipc, setCurrentProject, setChapters])

  if (loading) {
    return (
      <div className="centeredFill">
        <Spin size="large" />
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Title level={3}>项目不存在</Title>
        <Button onClick={() => navigate('/')}>返回项目列表</Button>
      </div>
    )
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 头部 */}
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ marginBottom: '16px' }}
          >
            返回
          </Button>
          <Title level={2}>{currentProject.name}</Title>
          <Space size="large">
            {currentProject.author && <Text>作者: {currentProject.author}</Text>}
            {currentProject.genre && <Text>类型: {currentProject.genre}</Text>}
            <Text>目标字数: {currentProject.target_words.toLocaleString()} 字</Text>
          </Space>
        </div>

        {/* 章节列表 */}
        <Card
          title="章节列表"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/project/${id}/chapter/create`)}>
              新建章节
            </Button>
          }
        >
          {chapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">还没有章节，点击右上角创建第一个章节</Text>
            </div>
          ) : (
            <List
              dataSource={chapters}
              renderItem={(chapter) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      onClick={() => navigate(`/project/${id}/chapter/${chapter.id}`)}
                    >
                      编辑
                    </Button>
                  ]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/project/${id}/chapter/${chapter.id}`)}
                >
                  <List.Item.Meta
                    avatar={<BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                    title={`${chapter.chapter_number}. ${chapter.title}`}
                    description={`${chapter.word_count} 字 · ${chapter.status === 'draft' ? '草稿' : chapter.status === 'in_progress' ? '进行中' : '已完成'}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>
    </div>
  )
}

export default ProjectDetail
