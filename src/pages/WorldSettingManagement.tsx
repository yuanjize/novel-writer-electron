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
  Popconfirm,
  Tag
} from 'antd'
import { ArrowLeftOutlined, PlusOutlined, GlobalOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { WorldSetting } from '../types'
import HelpIcon from '../components/HelpIcon'

const { Title, Text } = Typography
const { TextArea } = Input

const categories = [
  '地理环境', '历史背景', '魔法体系', '势力组织',
  '物品道具', '种族设定', '社会制度', '其他'
]

function WorldSettingManagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<WorldSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSetting, setEditingSetting] = useState<WorldSetting | null>(null)
  const [form] = Form.useForm()
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [id])

  const loadSettings = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await window.electronAPI.worldSetting.getAll(Number(id))
      if (result.success && result.data) {
        setSettings(result.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSetting(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (setting: WorldSetting) => {
    setEditingSetting(setting)
    form.setFieldsValue(setting)
    setModalVisible(true)
  }

  const handleDelete = async (settingId: number) => {
    const result = await window.electronAPI.worldSetting.delete(settingId)
    if (result.success) {
      message.success('删除成功')
      loadSettings()
    } else {
      message.error(result.error || '删除失败')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        project_id: Number(id)
      }

      let result
      if (editingSetting) {
        result = await window.electronAPI.worldSetting.update(editingSetting.id, values)
      } else {
        result = await window.electronAPI.worldSetting.create(data)
      }

      if (result.success) {
        message.success(editingSetting ? '更新成功' : '创建成功')
        setModalVisible(false)
        form.resetFields()
        loadSettings()
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

      const result = await window.electronAPI.ai.generateWorldSetting({
        genre: project?.genre || '通用',
        projectDescription: project?.description || ''
      })

      if (result.success && result.data) {
        // Batch create all generated settings
        for (const setting of result.data) {
          await window.electronAPI.worldSetting.create({
            project_id: Number(id),
            category: setting.category,
            title: setting.title,
            content: setting.content
          })
        }
        message.success(`AI 生成了 ${result.data.length} 个世界观设定`)
        loadSettings()
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

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, WorldSetting[]>)

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
          <Title level={2}>世界观设定</Title>
        </div>

        <Card
          title="设定列表"
          extra={
            <Space>
              <Button icon={<ThunderboltOutlined />} onClick={handleAIGenerate} loading={aiGenerating}>
                AI 生成设定
              </Button>
              <HelpIcon
                title="AI 生成设定"
                content={
                  <div style={{ lineHeight: 1.8 }}>
                    <div>会用到：项目类型/简介。</div>
                    <div>用途：快速生成地理/历史/体系/势力等设定，写作时不容易崩设定。</div>
                  </div>
                }
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建设定
              </Button>
              <HelpIcon
                title="新建设定"
                content={<div style={{ lineHeight: 1.8 }}>手动补充或修正设定，写作时可在资料面板快速查看。</div>}
              />
            </Space>
          }
        >
          {settings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">还没有设定，可以使用 AI 生成或手动创建</Text>
            </div>
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {Object.entries(groupedSettings).map(([category, items]) => (
                <Card key={category} size="small" title={<Tag color="blue">{category}</Tag>}>
                  <List
                    dataSource={items}
                    renderItem={(setting) => (
                      <List.Item
                        actions={[
                          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(setting)}>
                            编辑
                          </Button>,
                          <Popconfirm
                            title="确定删除这个设定吗？"
                            onConfirm={() => handleDelete(setting.id)}
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
                          avatar={<GlobalOutlined style={{ fontSize: '20px', color: '#fa8c16' }} />}
                          title={setting.title}
                          description={setting.content?.slice(0, 150)}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </Space>

      <Modal
        title={editingSetting ? '编辑设定' : '新建设定'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：修仙等级体系" />
          </Form.Item>

          <Form.Item label="详细描述" name="content">
            <TextArea rows={6} placeholder="详细描述这个设定..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorldSettingManagement
