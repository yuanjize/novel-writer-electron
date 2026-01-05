import { Input, Modal, Tabs, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { helpGroups, helpTopics } from '../help/manual'

const { Paragraph, Text } = Typography

export default function ManualModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const topics = useMemo(() => {
    if (!normalizedQuery) return helpTopics
    return helpTopics.filter((topic) => {
      const haystack = [
        topic.title,
        topic.summary || '',
        ...(topic.keywords || [])
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery])

  const items = useMemo(() => {
    return helpGroups.map((group) => {
      const groupTopics = topics.filter((t) => t.group === group)
      return {
        key: group,
        label: group,
        children: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groupTopics.length === 0 ? (
              <Text type="secondary">暂无匹配内容</Text>
            ) : (
              groupTopics.map((t) => (
                <div key={t.id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--paper-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text strong>{t.title}</Text>
                    {t.summary ? <Text type="secondary">{t.summary}</Text> : null}
                  </div>
                  <div style={{ marginTop: 8 }}>{t.content}</div>
                </div>
              ))
            )}
          </div>
        )
      }
    })
  }, [topics])

  return (
    <Modal
      title="说明书（快速上手 + 功能说明）"
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
    >
      <Paragraph type="secondary" style={{ marginBottom: 10 }}>
        按关键词搜索，例如：<Text code>续写</Text>、<Text code>导出</Text>、<Text code>@</Text>、<Text code>版本</Text>。
      </Paragraph>
      <Input
        allowClear
        placeholder="搜索功能说明…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 14 }}
      />
      <Tabs items={items} />
    </Modal>
  )
}
