import { Modal, Typography, List, Divider } from 'antd'
const { Text } = Typography

export default function ShortcutHelper({ open, onClose }: { open: boolean, onClose: () => void }) {
  const shortcuts = [
    { key: '⌘ + S', desc: '保存当前章节' },
    { key: '⌘ + Shift + F', desc: '全书秒寻 (全局搜索)' },
    { key: '⌘ + Enter', desc: '发送 AI 指令' },
    { key: '@', desc: '快捷引用角色' },
    { key: '?', desc: '查看快捷键帮助' },
    { key: 'Ctrl + Alt + Z', desc: '进入/退出 禅模式' }
  ]

  return (
    <Modal title="快捷键中心" open={open} onCancel={onClose} footer={null} width={400}>
      <List
        dataSource={shortcuts}
        renderItem={item => (
          <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">{item.desc}</Text>
            <Text code>{item.key}</Text>
          </List.Item>
        )}
      />
      <Divider />
      <Text type="secondary" style={{ fontSize: 11 }}>专业提示：善用快捷键能让创作速度提升 200%。</Text>
    </Modal>
  )
}
