import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import RootApp from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AntdApp>
      <RootApp />
    </AntdApp>
  </React.StrictMode>
)
