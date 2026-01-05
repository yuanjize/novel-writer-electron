import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { setupIPCHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

// 应用启动时初始化数据库
app.whenReady().then(() => {
  try {
    initDatabase()
  } catch (error) {
    console.error('[main] Failed to initialize database:', error)
    dialog.showErrorBox(
      '数据库初始化失败',
      error instanceof Error ? error.message : String(error)
    )
  }

  try {
    setupIPCHandlers()
  } catch (error) {
    console.error('[main] Failed to setup IPC handlers:', error)
    dialog.showErrorBox(
      'IPC 初始化失败',
      error instanceof Error ? error.message : String(error)
    )
  }

  createWindow()
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    autoHideMenuBar: true, // 隐藏菜单栏
    backgroundColor: '#f5f5f5', // 防止白屏闪烁
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  attachWindowDebugging(mainWindow)

  void loadRenderer(mainWindow)
}

async function loadRenderer(window: BrowserWindow) {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  // 开发模式加载 dev server；生产模式加载构建文件
  if (rendererUrl) {
    console.log('[main] Loading renderer URL:', rendererUrl)
    await loadURLWithRetry(window, rendererUrl, 8)
    window.webContents.openDevTools()
    return
  }

  const indexPath = path.join(__dirname, '../renderer/index.html')
  console.log('[main] Loading renderer file:', indexPath)
  try {
    await window.loadFile(indexPath)
  } catch (error) {
    console.error('[main] Failed to load renderer file:', error)
    dialog.showErrorBox(
      '页面加载失败',
      `无法加载渲染进程页面：${indexPath}\n\n${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function loadURLWithRetry(window: BrowserWindow, url: string, maxAttempts: number) {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await window.loadURL(url)
      return
    } catch (error) {
      lastError = error
      console.warn('[main] loadURL failed', JSON.stringify({ url, attempt, maxAttempts }))

      // If this is a transient dev-server startup issue, retry with backoff.
      const backoffMs = Math.min(2000, 200 * Math.pow(2, attempt - 1))
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  console.error('[main] loadURL failed permanently:', lastError)
  dialog.showErrorBox(
    '页面加载失败',
    `无法加载渲染进程 URL：${url}\n\n${lastError instanceof Error ? lastError.message : String(lastError)}`
  )
}

function attachWindowDebugging(window: BrowserWindow) {
  const wc = window.webContents
  const isDev = !!process.env.ELECTRON_RENDERER_URL

  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(
      '[renderer] did-fail-load',
      JSON.stringify({ errorCode, errorDescription, validatedURL, isMainFrame })
    )
  })

  wc.on('render-process-gone', (_event, details) => {
    console.error('[renderer] render-process-gone', JSON.stringify(details))
  })

  wc.on('unresponsive', () => {
    console.warn('[renderer] unresponsive')
  })

  wc.on('responsive', () => {
    console.log('[renderer] responsive')
  })

  wc.on('preload-error', (_event, preloadPath, error) => {
    console.error('[preload] preload-error', preloadPath, error)
  })

  wc.on('console-message', (_event, level, message, line, sourceId) => {
    // level: 0=log, 1=warning, 2=error, 3=debug (Chromium behavior; may vary)
    const label = level === 2 ? 'error' : level === 1 ? 'warn' : level === 3 ? 'debug' : 'log'
    if (isDev || label === 'error' || label === 'warn') {
      console.log(`[renderer][console][${label}] ${message} (${sourceId}:${line})`)
    }
  })

  wc.on('did-finish-load', () => {
    console.log('[renderer] did-finish-load', wc.getURL())

    // Useful to diagnose "white screen" cases where no console error is emitted.
    setTimeout(async () => {
      try {
        const rootState = await wc.executeJavaScript(
          `(() => {
            const root = document.getElementById('root');
            const text = root?.innerText || '';
            const html = root?.innerHTML || '';
            return { hasRoot: !!root, textLen: text.length, htmlLen: html.length };
          })()`
        )
        console.log('[renderer] root-state', JSON.stringify(rootState))
      } catch (error) {
        console.warn('[renderer] root-state failed', error)
      }
    }, 1500)
  })
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
