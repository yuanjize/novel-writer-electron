import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Typography, Space, Empty, Spin, Input, Modal, List } from 'antd'
import { PlusOutlined, BookOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import type { Project } from '../types'
import { shallow } from 'zustand/shallow'
import HelpIcon from '../components/HelpIcon'

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

  // 导入状态
  const [importPreviewVisible, setImportPreviewVisible] = useState(false)
  const [importData, setImportData] = useState<any>(null)
  const [importing, setImporting] = useState(false)

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

  const handleImport = async () => {
    const data = await ipc.selectImportFile()
    if (data) {
      setImportData(data)
      setImportPreviewVisible(true)
    }
  }

  const confirmImport = async () => {
    if (!importData) return
    setImporting(true)
    try {
      const result = await ipc.importProject(importData)
      if (result) {
        setImportPreviewVisible(false)
        setImportData(null)
        // Reload projects
        const data = await ipc.loadProjects()
        setProjects(data)
      }
    } finally {
      setImporting(false)
    }
  }

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
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            导入书稿
          </Button>
          <HelpIcon
            title="导入书稿"
            content={
              <div style={{ lineHeight: 1.8 }}>
                <div>把外部文本导入到软件里，后续可用 AI、版本历史与导出能力。</div>
              </div>
            }
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
            新建项目
          </Button>
          <HelpIcon
            title="新建项目"
            content={
              <div style={{ lineHeight: 1.8 }}>
                <div>创建小说项目（类型/简介/目标字数）。</div>
                <div>也可以先用 AI 生成项目设定再确认创建。</div>
              </div>
            }
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div style={{ marginTop: '64px' }}>
          <Empty
            description={projects.length === 0 ? '还没有项目' : '没有匹配的项目'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
              创建第一个项目
            </Button>
          </Empty>

          {projects.length === 0 && (
            <Card style={{ marginTop: 18 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Title level={4} style={{ margin: 0 }}>三步上手（1 分钟）</Title>
                <Text type="secondary">不需要研究功能，照着做就能写起来。</Text>
                <div style={{ lineHeight: 1.9 }}>
                  <div><Text strong>1.</Text> 新建项目：填一句故事想法（也可以用 AI 生成项目设定）</div>
                  <div><Text strong>2.</Text> 新建章节：写 50~100 字，点 “AI 续写/优化/情节建议”</div>
                  <div><Text strong>3.</Text> 需要结构：去 “大纲规划/世界观/角色管理” 一键生成</div>
                </div>
                <Space wrap>
                  <Button onClick={() => navigate('/project/create')}>立即开始</Button>
                </Space>
              </Space>
            </Card>
          )}
        </div>
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
                  <BookOutlined style={{ fontSize: '24px', marginRight: '12px', color: 'var(--paper-accent)' }} />
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

      <Modal
        title="导入确认"
        open={importPreviewVisible}
        onCancel={() => setImportPreviewVisible(false)}
        onOk={confirmImport}
        confirmLoading={importing}
        width={600}
        okText="开始导入"
      >
        {importData && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ padding: '12px', background: 'var(--paper-surface-2)', borderRadius: '8px' }}>
              <Text strong>书名：</Text> {importData.name} <br/>
              <Text strong>识别章节数：</Text> {importData.chapters.length} 章 <br/>
              <Text strong>总字数：</Text> {importData.chapters.reduce((a: any, c: any) => a + c.word_count, 0).toLocaleString()} 字
            </div>
            
            <Text type="secondary">预览前 5 章标题：</Text>
            <List
              size="small"
              bordered
              dataSource={importData.chapters.slice(0, 5)}
              renderItem={(item: any) => <List.Item>{item.title}</List.Item>}
            />
            {importData.chapters.length > 5 && <Text type="secondary">... 等共 {importData.chapters.length} 章</Text>}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default ProjectList
