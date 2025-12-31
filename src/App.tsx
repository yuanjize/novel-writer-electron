import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Suspense, lazy } from 'react'
import AppLayout from './layout/AppLayout'

const ProjectList = lazy(() => import('./pages/ProjectList'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const ProjectCreate = lazy(() => import('./pages/ProjectCreate'))
const ChapterEditor = lazy(() => import('./pages/ChapterEditor'))
const ChapterCreate = lazy(() => import('./pages/ChapterCreate'))

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 14
        }
      }}
    >
      <HashRouter>
        <Suspense
          fallback={
            <div className="appSuspense">
              <Spin size="large" />
            </div>
          }
        >
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ProjectList />} />
              <Route path="/project/create" element={<ProjectCreate />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/project/:projectId/chapter/create" element={<ChapterCreate />} />
            </Route>

            <Route path="/project/:projectId/chapter/:id" element={<ChapterEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ConfigProvider>
  )
}

export default App
