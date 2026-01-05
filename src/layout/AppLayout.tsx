import { useState } from 'react'
import { BookOutlined, QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Layout, Tooltip, Typography } from 'antd'
import { useNavigate, Outlet } from 'react-router-dom'
import AISettingsModal from '../components/AISettingsModal'
import ManualModal from '../components/ManualModal'

const { Header, Content } = Layout
const { Text } = Typography

export default function AppLayout() {
  const navigate = useNavigate()
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  return (
    <Layout className="appShell">
      <Header className="appHeader">
        <div className="appHeaderInner">
          <button
            type="button"
            className="appBrand"
            onClick={() => navigate('/')}
            aria-label="返回项目列表"
          >
            <BookOutlined className="appBrandIcon" />
            <div className="appBrandText">
              <div className="appBrandTitle">AI 小说创作器</div>
              <Text className="appBrandSubtitle">写作更顺手，创作更专注</Text>
            </div>
          </button>

          <div className="appHeaderActions">
            <Tooltip title="说明书">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => setManualOpen(true)}
              />
            </Tooltip>
            <Tooltip title="AI 设置">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setAiSettingsOpen(true)}
              />
            </Tooltip>
          </div>
        </div>
      </Header>

      <Content className="appContent">
        <div className="appContentInner">
          <Outlet />
        </div>
      </Content>

      <AISettingsModal open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </Layout>
  )
}

