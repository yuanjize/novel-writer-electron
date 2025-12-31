import { BookOutlined } from '@ant-design/icons'
import { Layout, Typography } from 'antd'
import { useNavigate, Outlet } from 'react-router-dom'

const { Header, Content } = Layout
const { Text } = Typography

export default function AppLayout() {
  const navigate = useNavigate()

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
        </div>
      </Header>

      <Content className="appContent">
        <div className="appContentInner">
          <Outlet />
        </div>
      </Content>
    </Layout>
  )
}

