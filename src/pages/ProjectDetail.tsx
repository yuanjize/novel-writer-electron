import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, List, Space, Spin, Card, Row, Col, Modal, Select, Checkbox, message, Tag, Empty } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, BookOutlined, UserOutlined, FileTextOutlined, GlobalOutlined, DownloadOutlined, LineChartOutlined, AppstoreOutlined, RadarChartOutlined } from '@ant-design/icons'
import { useAppStore } from '../store'
import { useElectronIPC } from '../hooks/useElectronIPC'
import { shallow } from 'zustand/shallow'
import Statistics from './Statistics'

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

  // Smart Export
  const [exportVisible, setExportVisible] = useState(false)
  const [exportFormat, setExportFormat] = useState<'txt' | 'epub' | 'docx'>('txt')
  const [exportOptions, setExportOptions] = useState({
    includeProjectHeader: true,
    includeVolumeTitles: true,
    includeChapterTitles: true,
    cleanBlankLines: true,
    indentParagraphs: true
  })
  const [exportPreviewHtml, setExportPreviewHtml] = useState<string>('')
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // 伏笔雷达 (第 121 轮)
  const [radarVisible, setRadarVisible] = useState(false)
  const [foreshadowing, setForeshadowing] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)

  // 回收站 (第 261 轮)
  const [trashVisible, setTrashVisible] = useState(false)
  const [deletedChapters, setDeletedChapters] = useState<any[]>([])

  const handleScanRadar = async () => {
    setRadarVisible(true)
    setScanning(true)
    try {
      const res = await window.electronAPI.ai.scanForeshadowing(Number(id))
      if (res.success) setForeshadowing(res.data ?? [])
    } finally {
      setScanning(false)
    }
  }

  const loadTrash = async () => {
    const res = await window.electronAPI.chapter.getDeleted(Number(id))
    if (res.success) setDeletedChapters(res.data ?? [])
    setTrashVisible(true)
  }

  const handleRestore = async (chapterId: number) => {
    const res = await window.electronAPI.chapter.restore(chapterId)
    if (res.success) {
      message.success('已还原章节')
      const projectId = Number(id)
      const chapterList = await window.electronAPI.project.getChapters(projectId)
      if (chapterList.success) setChapters(chapterList.data ?? [])
      const trashList = await window.electronAPI.chapter.getDeleted(projectId)
      if (trashList.success) setDeletedChapters(trashList.data ?? [])
    }
  }

  const handleSoftDelete = async (chapterId: number) => {
    const res = await window.electronAPI.chapter.softDelete(chapterId)
    if (res.success) {
      message.success('章节已移至回收站')
      const chapterList = await window.electronAPI.project.getChapters(Number(id))
      if (chapterList.success) setChapters(chapterList.data ?? [])
    }
  }

  const handleExportPreview = async () => {
    if (!id) return
    setExportPreviewLoading(true)
    try {
      const res = await ipc.previewExport({
        projectId: Number(id),
        format: exportFormat,
        options: exportOptions
      })
      if (res?.html) setExportPreviewHtml(res.html)
    } finally {
      setExportPreviewLoading(false)
    }
  }

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    try {
      const res = await ipc.exportProject({
        projectId: Number(id),
        format: exportFormat,
        options: exportOptions
      })
      if (res?.path) setExportVisible(false)
    } catch (e) {
      message.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (!id) return
    const projectId = Number(id)
    const loadData = async () => {
      setLoading(true)
      const [project, chapterList] = await Promise.all([
        ipc.loadProject(projectId),
        ipc.loadChapters(projectId)
      ])
      setCurrentProject(project)
      setChapters(chapterList)
      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) return <div className="centeredFill"><Spin size="large" /></div>
  if (!currentProject) return <div style={{ textAlign: 'center' }}><Title level={3}>项目不存在</Title><Button onClick={() => navigate('/')}>返回</Button></div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: '16px' }}>返回</Button>
          <Title level={2}>{currentProject.name}</Title>
          <Space size="large">
            {currentProject.author && <Text>作者: {currentProject.author}</Text>}
            <Text>目标: {currentProject.target_words.toLocaleString()} 字</Text>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          {[
            { title: '角色管理', icon: <UserOutlined style={{ color: '#1890ff' }} />, path: 'characters', desc: '设定角色，AI 辅助设计' },
            { title: '大纲规划', icon: <FileTextOutlined style={{ color: '#52c41a' }} />, path: 'outline', desc: '规划剧情，生成结构' },
            { title: '剧情网格', icon: <AppstoreOutlined style={{ color: '#eb2f96' }} />, path: 'plot-grid', desc: '可视化多线叙事' },
            { title: '世界设定', icon: <GlobalOutlined style={{ color: '#fa8c16' }} />, path: 'worldview', desc: '构建世界细节' },
            { title: '数据中心', icon: <LineChartOutlined style={{ color: '#722ed1' }} />, path: 'statistics', desc: '热力图与字数统计' },
          ].map(item => (
            <Col span={8} key={item.title}>
              <Card hoverable onClick={() => navigate(`/project/${id}/${item.path}`)} style={{ height: '100%' }}>
                <Space direction="vertical" size={4}>
                  <div style={{ fontSize: 32 }}>{item.icon}</div>
                  <Title level={4} style={{ margin: 0 }}>{item.title}</Title>
                  <Text type="secondary">{item.desc}</Text>
                </Space>
              </Card>
            </Col>
          ))}
          <Col span={8}>
            <Card hoverable onClick={handleScanRadar} style={{ height: '100%', background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)' }}>
              <Space direction="vertical" size={4}>
                <RadarChartOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                <Title level={4} style={{ margin: 0 }}>伏笔雷达</Title>
                <Text type="secondary">扫描全书，自动寻找剧情断层</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card title="章节列表" extra={
          <Space>
            <Button onClick={loadTrash}>回收站</Button>
            <Button icon={<DownloadOutlined />} onClick={() => setExportVisible(true)}>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/project/${id}/chapter/create`)}>新建章节</Button>
          </Space>
        }>
          <List dataSource={chapters} renderItem={chapter => (
            <List.Item actions={[
              <Button type="link" onClick={() => navigate(`/project/${id}/chapter/${chapter.id}`)}>编辑</Button>,
              <Button type="link" danger onClick={() => handleSoftDelete(chapter.id)}>删除</Button>
            ]}>
              <List.Item.Meta avatar={<BookOutlined style={{ fontSize: 24, color: 'var(--paper-accent)' }} />} title={`${chapter.chapter_number}. ${chapter.title}`} description={`${chapter.word_count} 字 · ${chapter.status}`} />
            </List.Item>
          )} />
        </Card>

        <Modal title="章节回收站" open={trashVisible} onCancel={() => setTrashVisible(false)} footer={null} width={600}>
          <List dataSource={deletedChapters} renderItem={item => (
            <List.Item actions={[<Button onClick={() => handleRestore(item.id)}>还原</Button>]}>
              <List.Item.Meta title={item.title} description={`删除于: ${item.deleted_at}`} />
            </List.Item>
          )} />
          {deletedChapters.length === 0 && <Empty description="回收站空空如也" />}
        </Modal>

        <Modal title={<Space><RadarChartOutlined /> 伏笔雷达结果</Space>} open={radarVisible} onCancel={() => setRadarVisible(false)} width={800} footer={null}>
          <List loading={scanning} dataSource={foreshadowing} renderItem={item => (
            <List.Item><Card size="small" style={{ width: '100%' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><Text strong>{item.clue}</Text><Tag color={item.status === 'resolved' ? 'green' : 'gold'}>{item.status === 'resolved' ? '已填' : '待填'}</Tag></div></Card></List.Item>
          )} />
          {!scanning && foreshadowing.length === 0 && <Empty description="未发现明显伏笔" />}
        </Modal>

        <Modal title="📦 Smart Export" open={exportVisible} onCancel={() => setExportVisible(false)} width={900} onOk={handleExport} confirmLoading={exporting} okText="导出文件">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Select value={exportFormat} onChange={setExportFormat} options={[{ value: 'txt', label: 'TXT' }, { value: 'epub', label: 'EPUB' }, { value: 'docx', label: 'DOCX' }]} style={{ width: 120 }} />
              <Checkbox checked={exportOptions.cleanBlankLines} onChange={e => setExportOptions(p => ({ ...p, cleanBlankLines: e.target.checked }))}>清洗空行</Checkbox>
              <Checkbox checked={exportOptions.indentParagraphs} onChange={e => setExportOptions(p => ({ ...p, indentParagraphs: e.target.checked }))}>段首缩进</Checkbox>
              <Button onClick={handleExportPreview} loading={exportPreviewLoading}>预览效果</Button>
            </Space>
            <div style={{ height: 400, border: '1px solid var(--paper-border)', overflow: 'hidden' }}>{exportPreviewHtml ? <iframe srcDoc={exportPreviewHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="export-preview" /> : <div style={{ padding: 20 }}>点击预览查看效果</div>}</div>
          </Space>
        </Modal>
      </Space>
    </div>
  )
}

export default ProjectDetail
