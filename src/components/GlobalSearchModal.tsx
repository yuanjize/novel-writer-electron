import { useState, useEffect } from 'react'
import { Modal, Input, List, Typography, Space, Empty, Tag } from 'antd'
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

interface GlobalSearchModalProps {
  projectId: number
  open: boolean
  onClose: () => void
}

export default function GlobalSearchModal({ projectId, open, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await window.electronAPI.chapter.search(projectId, query)
      if (res.success) setResults(res.data ?? [])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, projectId])

  return (
    <Modal
      title={<Space><SearchOutlined /> 全书秒寻</Space>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{ body: { padding: '0 24px 24px' } }}
      centered
    >
      <Input 
        autoFocus 
        size="large" 
        placeholder="搜索全文关键字..." 
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 20, borderRadius: 12 }}
      />
      
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <List
          loading={searching}
          dataSource={results}
          renderItem={item => (
            <List.Item 
              style={{ cursor: 'pointer', borderRadius: 8, padding: '12px' }} 
              className="hover:bg-gray-50"
              onClick={() => { navigate(`/project/${projectId}/chapter/${item.id}`); onClose(); }}
            >
              <List.Item.Meta
                title={<Space><FileTextOutlined style={{ color: '#1890ff' }} /> <Text strong>{item.title}</Text></Space>}
                description={<div dangerouslySetInnerHTML={{ __html: item.preview }} style={{ fontSize: 13, color: '#666' }} />}
              />
            </List.Item>
          )}
        />
        {query && results.length === 0 && !searching && <Empty description="未找到相关内容" />}
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>支持 FTS5 高性能检索 · 智能分词</Text>
      </div>
    </Modal>
  )
}
