import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { setupIPCHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

// 应用启动时初始化数据库
app.whenReady().then(() => {
  initDatabase()
  setupIPCHandlers()
  createWindow()
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  // 开发模式加载 dev server；生产模式加载构建文件
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
    mainWindow.webContents.openDevTools()
    return
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 关闭数据库连接
    closeDatabase()
    app.quit()
  }
})

// 确保在应用退出前关闭数据库
app.on('before-quit', () => {
  closeDatabase()
})
