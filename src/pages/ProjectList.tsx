import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Typography, Space, Empty, Spin, Input, Modal } from 'antd'
import { PlusOutlined, BookOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import type { Project } from '../types'
import { shallow } from 'zustand/shallow'

const { Title, Text, Paragraph } = Typography

function ProjectList() {
  const navigate = useNavigate()
  const { projects, setProjects, removeProject } = useAppStore(
    (state) => ({
      projects: state.projects,
      setProjects: state.setProjects,
      removeProject: state.removeProject
    }),
    shallow
  )
  const ipc = useElectronIPC()
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadProjects = async () => {
      setLoading(true)
      const data = await ipc.loadProjects()
      if (!cancelled) {
        setProjects(data)
        setLoading(false)
      }
    }
    loadProjects()

    return () => {
      cancelled = true
    }
  }, [ipc, setProjects])

  const filteredProjects = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return projects

    const includes = (value?: string) => (value || '').toLowerCase().includes(q)

    return projects.filter((project) => {
      return (
        includes(project.name) ||
        includes(project.author) ||
        includes(project.genre) ||
        includes(project.description)
      )
    })
  }, [keyword, projects])

  const confirmDelete = (project: Project) => {
    Modal.confirm({
      title: '删除项目？',
      content: `确定删除「${project.name}」吗？该操作会同时删除该项目下的所有章节，且无法恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        const success = await ipc.deleteProject(project.id)
        if (success) {
          removeProject(project.id)
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="centeredFill">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="pageHeader">
        <div className="pageHeaderMeta">
          <Title level={2} className="pageTitle">
            我的项目
          </Title>
          <Text type="secondary">
            {projects.length === 0 ? '还没有项目，先创建一个吧。' : `共 ${projects.length} 个项目`}
          </Text>
        </div>

        <div className="pageHeaderActions">
          <Input
            allowClear
            placeholder="搜索项目名称/作者/类型…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
            新建项目
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <Empty
          description={projects.length === 0 ? '还没有项目' : '没有匹配的项目'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: '100px' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
            创建第一个项目
          </Button>
        </Empty>
      ) : (
        <div className="projectGrid">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              hoverable
              actions={[
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/project/${project.id}`)
                  }}
                >
                  编辑
                </Button>,
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmDelete(project)
                  }}
                >
                  删除
                </Button>
              ]}
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BookOutlined style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }} />
                  <Title level={4} style={{ margin: 0 }}>
                    {project.name}
                  </Title>
                </div>
                {project.author && (
                  <Text type="secondary">作者: {project.author}</Text>
                )}
                {project.genre && (
                  <Text type="secondary">类型: {project.genre}</Text>
                )}
                {project.description && (
                  <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                    {project.description}
                  </Paragraph>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  目标字数: {project.target_words.toLocaleString()} 字
                </Text>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectList
