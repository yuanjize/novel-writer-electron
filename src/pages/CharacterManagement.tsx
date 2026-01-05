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
import { ArrowLeftOutlined, PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Character } from '../types'
import HelpIcon from '../components/HelpIcon'

const { Title, Text } = Typography
const { TextArea } = Input

function CharacterManagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [form] = Form.useForm()
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    loadCharacters()
  }, [id])

  const loadCharacters = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await window.electronAPI.character.getAll(Number(id))
      if (result.success && result.data) {
        setCharacters(result.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCharacter(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (character: Character) => {
    setEditingCharacter(character)
    form.setFieldsValue(character)
    setModalVisible(true)
  }

  const handleDelete = async (characterId: number) => {
    const result = await window.electronAPI.character.delete(characterId)
    if (result.success) {
      message.success('删除成功')
      loadCharacters()
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
      if (editingCharacter) {
        result = await window.electronAPI.character.update(editingCharacter.id, values)
      } else {
        result = await window.electronAPI.character.create(data)
      }

      if (result.success) {
        message.success(editingCharacter ? '更新成功' : '创建成功')
        setModalVisible(false)
        form.resetFields()
        loadCharacters()
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
      // 获取项目信息作为上下文
      const projectResult = await window.electronAPI.project.getById(Number(id))
      const project = projectResult.data
      
      // 获取当前表单中的名字作为提示
      const currentName = form.getFieldValue('name')
      
      // 构建上下文
      let context = ''
      if (project) {
        context += `小说类型：${project.genre || '未设定'}。\n`
        context += `小说简介：${project.description || '暂无'}。\n`
      }
      if (currentName) {
        context += `角色名字：${currentName}。\n`
      } else {
        context += `请生成一个与故事风格契合的角色。\n`
      }

      const existingCharacters = characters
        .map(c => c.name)
        .filter(Boolean)
        .filter(name => name !== currentName)

      const result = await window.electronAPI.ai.generateCharacter({
        projectId: Number(id),
        role: 'supporting', // 默认为配角，AI会根据描述调整
        context: context,
        existingCharacters: existingCharacters.length > 0 ? existingCharacters : undefined
      })

      if (result.success && result.data) {
        form.setFieldsValue({
          name: result.data.name, // 如果AI改了名字，也同步更新
          personality: result.data.personality,
          background: result.data.background,
          relationships: result.data.relationships
        })
        message.success('AI 生成成功，请确认后保存')
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
          <Title level={2}>角色管理</Title>
        </div>

        <Card
          title="角色列表"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建角色
            </Button>
          }
        >
          {characters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">还没有角色，点击右上角创建第一个角色</Text>
            </div>
          ) : (
            <List
              dataSource={characters}
              renderItem={(character) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(character)}>
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定删除这个角色吗？"
                      onConfirm={() => handleDelete(character.id)}
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
                    avatar={<UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                    title={character.name}
                    description={
                      <Space direction="vertical" size="small">
                        {character.personality && <Text>性格：{character.personality}</Text>}
                        {character.background && <Text type="secondary">{character.background.slice(0, 100)}...</Text>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>

      <Modal
        title={editingCharacter ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleAIGenerate}
            loading={aiGenerating}
            type="dashed"
          >
            AI 一键生成/补全设定
          </Button>
          <HelpIcon
            title="AI 一键生成/补全设定"
            content={
              <div style={{ lineHeight: 1.8 }}>
                <div>会用到：项目类型/简介 +（可选）你填的角色名 + 已有角色名列表。</div>
                <div>用途：快速补齐性格/背景/关系，避免空白表单。</div>
              </div>
            }
          />
        </div>
        <Form form={form} layout="vertical">
          <Form.Item label="角色名称" name="name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="例如：张三" />
          </Form.Item>

          <Form.Item label="性格特点" name="personality">
            <TextArea rows={3} placeholder="描述角色的性格特点..." />
          </Form.Item>

          <Form.Item label="背景故事" name="background">
            <TextArea rows={4} placeholder="描述角色的背景故事..." />
          </Form.Item>

          <Form.Item label="人际关系" name="relationships">
            <TextArea rows={2} placeholder="描述与其他角色的关系..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CharacterManagement
