import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Button, Typography, Card, Space, Spin, Modal, Form, Input, Select, Tag, Popover, message } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons'
import { useElectronIPC } from '../hooks/useElectronIPC'
import type { Outline, Storyline } from '../types'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function PlotGrid() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const ipc = useElectronIPC()
  const [loading, setLoading] = useState(true)
  
  const [chapters, setChapters] = useState<Outline[]>([])
  const [storylines, setStorylines] = useState<Storyline[]>([])
  const [scenes, setScenes] = useState<Outline[]>([])

  // Modal States
  const [isStorylineModalOpen, setIsStorylineModalOpen] = useState(false)
  const [editingStoryline, setEditingStoryline] = useState<Storyline | null>(null)
  
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<Partial<Outline> | null>(null)
  const [targetCell, setTargetCell] = useState<{ chapterId: number, storylineId: number } | null>(null)

  const [formStoryline] = Form.useForm()
  const [formScene] = Form.useForm()

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [allOutlines, allStorylines] = await Promise.all([
        window.electronAPI.outline.getAll(Number(projectId)),
        ipc.loadStorylines(Number(projectId))
      ])

      if (allOutlines.success && allOutlines.data) {
        const rawOutlines = allOutlines.data as Outline[]
        // Columns: Type = chapter
        const cols = rawOutlines.filter(o => o.type === 'chapter').sort((a, b) => a.sequence - b.sequence)
        // Cells: Type = scene
        const cells = rawOutlines.filter(o => o.type === 'scene')
        
        setChapters(cols)
        setScenes(cells)
      }
      
      setStorylines(allStorylines)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  // --- Storyline Logic ---
  const handleAddStoryline = () => {
    setEditingStoryline(null)
    formStoryline.resetFields()
    setIsStorylineModalOpen(true)
  }

  const handleEditStoryline = (sl: Storyline) => {
    setEditingStoryline(sl)
    formStoryline.setFieldsValue(sl)
    setIsStorylineModalOpen(true)
  }

  const handleDeleteStoryline = async (id: number) => {
    Modal.confirm({
      title: '删除故事线？',
      content: '删除后，该线上的场景将保留但失去关联。',
      okType: 'danger',
      onOk: async () => {
        await ipc.deleteStoryline(id)
        loadData()
      }
    })
  }

  const saveStoryline = async () => {
    try {
      const values = await formStoryline.validateFields()
      if (editingStoryline) {
        await ipc.updateStoryline(editingStoryline.id, values)
      } else {
        await ipc.createStoryline({
          project_id: Number(projectId),
          ...values,
          position: storylines.length + 1
        })
      }
      setIsStorylineModalOpen(false)
      loadData()
    } catch (e) {
      // validation failed
    }
  }

  // --- Scene Logic ---
  const handleAddScene = (chapterId: number, storylineId: number) => {
    setTargetCell({ chapterId, storylineId })
    setEditingScene(null)
    formScene.resetFields()
    setIsSceneModalOpen(true)
  }

  const handleEditScene = (scene: Outline) => {
    setEditingScene(scene)
    formScene.setFieldsValue(scene)
    setIsSceneModalOpen(true)
  }

  const handleDeleteScene = async (id: number) => {
    await window.electronAPI.outline.delete(id)
    loadData()
  }

  const saveScene = async () => {
    try {
      const values = await formScene.validateFields()
      if (editingScene && editingScene.id) {
        await window.electronAPI.outline.update(editingScene.id, values)
      } else if (targetCell) {
        // Find correct sequence: append to end of list for this parent?
        // Actually sequence is global or per parent?
        // OutlineDAO logic: sequence is usually global for the project or filtered.
        // Let's just use a simple large number or calc max.
        // Simpler: sequence = scenes.length + 1
        
        await window.electronAPI.outline.create({
          project_id: Number(projectId),
          type: 'scene',
          parent_id: targetCell.chapterId,
          storyline_id: targetCell.storylineId,
          sequence: Date.now(), // simple hack for order
          ...values
        })
      }
      setIsSceneModalOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  // --- Render Helpers ---
  const getScenesForCell = (chapterId: number, storylineId: number) => {
    return scenes.filter(s => s.parent_id === chapterId && s.storyline_id === storylineId)
  }

  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a', '#f5222d', '#722ed1']

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />

  return (
    <Layout style={{ height: '100vh', background: 'var(--paper-bg)' }}>
      <Header style={{ background: 'var(--paper-surface)', padding: '0 24px', borderBottom: '1px solid var(--paper-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/project/${projectId}`)}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>剧情网格 (Plot Grid)</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStoryline}>新建故事线</Button>
      </Header>
      
      <Content style={{ overflow: 'auto', padding: 24 }}>
        {storylines.length === 0 || chapters.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 100 }}>
            <Text type="secondary">
              {chapters.length === 0 ? '还没有规划章节（大纲），请先去“大纲规划”添加章节。' : '还没有故事线，请点击右上角新建。'}
            </Text>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `180px repeat(${chapters.length}, 280px)`,
            gap: 16,
            paddingBottom: 40
          }}>
            {/* Header Row */}
            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-surface-2)', borderRadius: 8 }}>
              故事线 \ 章节
            </div>
            {chapters.map(c => (
              <div key={c.id} style={{ padding: 12, background: '#f0f5ff', borderRadius: 8, border: '1px solid #d6e4ff', textAlign: 'center' }}>
                <Text strong>{c.title}</Text>
              </div>
            ))}

            {/* Storyline Rows */}
            {storylines.map((sl, idx) => (
              <>
                {/* Row Header */}
                <div key={`head-${sl.id}`} style={{ 
                  padding: 12, 
                  background: 'var(--paper-surface)', 
                  borderRadius: 8, 
                  border: '1px solid var(--paper-border)',
                  borderLeft: `4px solid ${sl.color || colors[idx % colors.length]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{sl.name}</Text>
                    <Space size="small">
                      <EditOutlined style={{ fontSize: 12, cursor: 'pointer', color: 'var(--paper-text-muted)' }} onClick={() => handleEditStoryline(sl)} />
                      <DeleteOutlined style={{ fontSize: 12, cursor: 'pointer', color: '#ff4d4f' }} onClick={() => handleDeleteStoryline(sl.id)} />
                    </Space>
                  </div>
                  {sl.description && <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }} ellipsis>{sl.description}</Text>}
                </div>

                {/* Cells */}
                {chapters.map(c => {
                  const cellScenes = getScenesForCell(c.id, sl.id)
                  return (
                    <div key={`${sl.id}-${c.id}`} style={{ 
                      background: 'var(--paper-surface-2)', 
                      borderRadius: 8, 
                      padding: 8, 
                      border: '1px dashed var(--paper-border)',
                      minHeight: 120,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      {cellScenes.map(scene => (
                        <Card 
                          key={scene.id} 
                          size="small" 
                          hoverable 
                          style={{ cursor: 'pointer', borderColor: sl.color ? `${sl.color}40` : undefined }}
                          onClick={() => handleEditScene(scene)}
                        >
                          <Text strong style={{ fontSize: 13 }}>{scene.title}</Text>
                          {scene.content && <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 12, margin: '4px 0 0' }}>{scene.content}</Paragraph>}
                        </Card>
                      ))}
                      <Button 
                        type="dashed" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        block 
                        style={{ marginTop: 'auto', color: 'var(--paper-text-muted)' }}
                        onClick={() => handleAddScene(c.id, sl.id)}
                      />
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        )}
      </Content>

      {/* Storyline Modal */}
      <Modal
        title={editingStoryline ? '编辑故事线' : '新建故事线'}
        open={isStorylineModalOpen}
        onCancel={() => setIsStorylineModalOpen(false)}
        onOk={saveStoryline}
      >
        <Form form={formStoryline} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：感情线、复仇线" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="简要描述这条线的主要内容..." />
          </Form.Item>
          <Form.Item name="color" label="标记颜色">
            <div style={{ display: 'flex', gap: 8 }}>
              {colors.map(c => (
                <div 
                  key={c}
                  onClick={() => formStoryline.setFieldsValue({ color: c })}
                  style={{ 
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: '2px solid var(--paper-surface)', boxShadow: '0 0 0 1px var(--paper-border)'
                  }}
                />
              ))}
            </div>
            <Form.Item name="color" noStyle><Input type="hidden" /></Form.Item>
          </Form.Item>
        </Form>
      </Modal>

      {/* Scene Modal */}
      <Modal
        title={editingScene ? '编辑剧情点' : '添加剧情点'}
        open={isSceneModalOpen}
        onCancel={() => setIsSceneModalOpen(false)}
        onOk={saveScene}
        footer={[
          editingScene && <Button key="delete" danger onClick={() => handleDeleteScene(editingScene.id!)} style={{ float: 'left' }}>删除</Button>,
          <Button key="cancel" onClick={() => setIsSceneModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveScene}>保存</Button>
        ]}
      >
        <Form form={formScene} layout="vertical">
          <Form.Item name="title" label="标题/摘要" rules={[{ required: true }]}>
            <Input placeholder="一句话概括..." />
          </Form.Item>
          <Form.Item name="content" label="详细内容">
            <TextArea rows={4} placeholder="详细的剧情描述..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default PlotGrid
