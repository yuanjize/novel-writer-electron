import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Typography,
  List,
  Space,
  Spin,
  Card,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm
} from 'antd'
import { ArrowLeftOutlined, PlusOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Chapter, Outline } from '../types'
import HelpIcon from '../components/HelpIcon'

const { Title, Text } = Typography
const { TextArea } = Input

function OutlineManagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOutline, setEditingOutline] = useState<Outline | null>(null)
  const [form] = Form.useForm()
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    loadOutlines()
  }, [id])

  const loadOutlines = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await window.electronAPI.outline.getAll(Number(id))
      if (result.success && result.data) {
        setOutlines(result.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingOutline(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (outline: Outline) => {
    setEditingOutline(outline)
    form.setFieldsValue(outline)
    setModalVisible(true)
  }

  const handleDelete = async (outlineId: number) => {
    const result = await window.electronAPI.outline.delete(outlineId)
    if (result.success) {
      message.success('删除成功')
      loadOutlines()
    } else {
      message.error(result.error || '删除失败')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        project_id: Number(id),
        sequence: editingOutline?.sequence || outlines.length
      }

      let result
      if (editingOutline) {
        result = await window.electronAPI.outline.update(editingOutline.id, values)
      } else {
        result = await window.electronAPI.outline.create(data)
      }

      if (result.success) {
        message.success(editingOutline ? '更新成功' : '创建成功')
        setModalVisible(false)
        form.resetFields()
        loadOutlines()
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (error) {
      // Form validation failed
    }
  }

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    try {
      // Get project info for context
      const projectResult = await window.electronAPI.project.getById(Number(id))
      const project = projectResult.data

      const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
      const chaptersRes = await window.electronAPI.project.getChapters(Number(id))
      const chapters: Chapter[] = chaptersRes.success && Array.isArray(chaptersRes.data) ? (chaptersRes.data as Chapter[]) : []
      const existingChapters = chapters
        .sort((a, b) => a.chapter_number - b.chapter_number)
        .slice(-10)
        .map((c) => ({
          title: c.title,
          content: c.summary
            ? normalize(c.summary).slice(0, 220)
            : c.content
              ? normalize(c.content).slice(0, 220)
              : undefined
        }))
        .filter((c) => c.title)

      const result = await window.electronAPI.ai.generateOutline({
        genre: project?.genre || '通用',
        projectDescription: project?.description || '',
        existingChapters: existingChapters.length > 0 ? existingChapters : undefined,
        targetChapterCount: 10
      })

      if (result.success && result.data) {
        // Batch create all generated outlines
        for (const outline of result.data) {
          await window.electronAPI.outline.create({
            project_id: Number(id),
            type: 'chapter',
            title: outline.title,
            content: outline.content,
            sequence: outline.sequence
          })
        }
        message.success(`AI 生成了 ${result.data.length} 个大纲`)
        loadOutlines()
      } else {
        message.error(result.error || 'AI 生成失败')
      }
    } finally {
      setAiGenerating(false)
    }
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
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/project/${id}`)}
            style={{ marginBottom: '16px' }}
          >
            返回项目
          </Button>
          <Title level={2}>大纲规划</Title>
        </div>

        <Card
          title="大纲列表"
          extra={
            <Space>
              <Button icon={<ThunderboltOutlined />} onClick={handleAIGenerate} loading={aiGenerating}>
                AI 生成大纲
              </Button>
              <HelpIcon
                title="AI 生成大纲"
                content={
                  <div style={{ lineHeight: 1.8 }}>
                    <div>会用到：项目类型/简介 +（若已写过）最近章节摘要/片段。</div>
                    <div>效果：更贴合你已经写出来的走向，而不是泛大纲。</div>
                  </div>
                }
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建大纲
              </Button>
              <HelpIcon
                title="新建大纲"
                content={<div style={{ lineHeight: 1.8 }}>手动补充章节/分卷结构，用于规划写作节奏。</div>}
              />
            </Space>
          }
        >
          {outlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">还没有大纲，可以使用 AI 生成或手动创建</Text>
            </div>
          ) : (
            <List
              dataSource={outlines}
              renderItem={(outline) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(outline)}>
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定删除这个大纲吗？"
                      onConfirm={() => handleDelete(outline.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
                    title={`${outline.sequence + 1}. ${outline.title}`}
                    description={outline.content}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>

      <Modal
        title={editingOutline ? '编辑大纲' : '新建大纲'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：第一章 初入修仙界" />
          </Form.Item>

          <Form.Item label="类型" name="type" initialValue="chapter">
            <Select>
              <Select.Option value="chapter">章节</Select.Option>
              <Select.Option value="volume">分卷</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="内容概要" name="content">
            <TextArea rows={4} placeholder="描述本章节的主要内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OutlineManagement
