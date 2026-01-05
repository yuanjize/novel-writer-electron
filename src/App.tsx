import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Suspense, lazy } from 'react'
import AppLayout from './layout/AppLayout'

const ProjectList = lazy(() => import('./pages/ProjectList'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const ProjectCreate = lazy(() => import('./pages/ProjectCreate'))
const ChapterEditor = lazy(() => import('./pages/ChapterEditor'))
const ChapterCreate = lazy(() => import('./pages/ChapterCreate'))
const CharacterManagement = lazy(() => import('./pages/CharacterManagement'))
const OutlineManagement = lazy(() => import('./pages/OutlineManagement'))
const WorldSettingManagement = lazy(() => import('./pages/WorldSettingManagement'))
const Statistics = lazy(() => import('./pages/Statistics'))
const PlotGrid = lazy(() => import('./pages/PlotGrid'))

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        components: {
          Button: {
            controlHeight: 38,
            boxShadow: 'none',
          },
          Input: {
            controlHeight: 38,
          },
          Card: {
            borderRadiusLG: 16,
          }
        }
      }}
    >
      <AntdApp>
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
                <Route path="/project/:projectId/statistics" element={<Statistics />} />
                <Route path="/project/:projectId/plot-grid" element={<PlotGrid />} />
                <Route path="/project/:projectId/chapter/create" element={<ChapterCreate />} />
                <Route path="/project/:id/characters" element={<CharacterManagement />} />
                <Route path="/project/:id/outline" element={<OutlineManagement />} />
                <Route path="/project/:id/worldview" element={<WorldSettingManagement />} />
              </Route>

              <Route path="/project/:projectId/chapter/:id" element={<ChapterEditor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
