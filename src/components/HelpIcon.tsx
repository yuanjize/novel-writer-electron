import { Button, Popover, Typography } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

const { Text } = Typography

export default function HelpIcon(props: {
  title: string
  content: ReactNode
  trigger?: 'hover' | 'click'
  placement?:
    | 'top'
    | 'topLeft'
    | 'topRight'
    | 'left'
    | 'leftTop'
    | 'leftBottom'
    | 'right'
    | 'rightTop'
    | 'rightBottom'
    | 'bottom'
    | 'bottomLeft'
    | 'bottomRight'
  size?: 'small' | 'middle'
}) {
  const { title, content, trigger = 'hover', placement = 'bottom', size = 'small' } = props

  return (
    <Popover
      trigger={trigger}
      placement={placement}
      title={<Text strong>{title}</Text>}
      content={<div style={{ maxWidth: 360 }}>{content}</div>}
    >
      <Button
        type="text"
        size={size}
        icon={<QuestionCircleOutlined />}
        aria-label={`帮助：${title}`}
        style={{ color: '#8c8c8c' }}
      />
    </Popover>
  )
}

