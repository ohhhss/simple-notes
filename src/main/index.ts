import { app, BrowserWindow, shell, nativeImage, crashReporter, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { registerIpcHandlers } from './ipc'
import { buildApplicationMenu } from './menu'
import { restoreWindowState, saveWindowState } from './window-state'
import { logger } from './logger'

// --- Global exception handlers (P0: stability) ---
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack })
  try {
    dialog.showErrorBox('应用发生严重错误', `${err.message}\n\n请查看日志文件获取详情。应用将继续运行，但建议重启。`)
  } catch {
    // dialog may not be available in some contexts
  }
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', { reason: String(reason) })
})

// --- Crash reporter (P0: stability) ---
crashReporter.start({
  productName: '简单笔记',
  companyName: 'SimpleNotes',
  submitURL: '', // No remote server; crashes stored locally
  uploadToServer: false,
  compress: true
})

let mainWindow: BrowserWindow | null = null

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function getAppIcon(): Electron.NativeImage | undefined {
  const basePath = app.getAppPath()
  const possiblePaths = [
    join(basePath, 'build/icons/icon.png'),
    join(__dirname, '../../build/icons/icon.png'),
    join(__dirname, '../../../build/icons/icon.png'),
    join(process.cwd(), 'build/icons/icon.png'),
    join(__dirname, '../renderer/icon.png'),
    join(basePath, 'out/renderer/logo.svg')
  ]

  for (const iconPath of possiblePaths) {
    if (existsSync(iconPath)) {
      try {
        const image = nativeImage.createFromPath(iconPath)
        if (!image.isEmpty()) {
          return image
        }
      } catch {
        // ignore invalid image
      }
    }
  }
  return undefined
}

function createWindow(): BrowserWindow {
  const windowState = restoreWindowState()
  const appIcon = getAppIcon()

  const win = new BrowserWindow({
    title: '简单笔记',
    width: windowState.width ?? 1000,
    height: windowState.height ?? 680,
    x: windowState.x,
    y: windowState.y,
    minWidth: 700,
    minHeight: 500,
    show: false,
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // P0: enable sandbox for renderer process isolation
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (windowState.isMaximized) {
    win.maximize()
  }

  win.on('ready-to-show', () => {
    win.show()
    logger.info('Main window ready')
  })

  let saveTimer: NodeJS.Timeout | null = null
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWindowState(win), 300)
  }
  win.on('resize', scheduleSave)
  win.on('move', scheduleSave)
  win.on('close', () => saveWindowState(win))

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent file drag-drop from navigating the window
  win.webContents.on('will-navigate', (e) => {
    if (e.url !== (process.env['ELECTRON_RENDERER_URL'] || '')) {
      e.preventDefault()
    }
  })

  // P0: Render process crash handling - show recovery dialog instead of blank screen
  win.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Render process gone', { reason: details.reason, exitCode: details.exitCode })
    dialog.showMessageBox(win, {
      type: 'error',
      title: '渲染进程崩溃',
      message: '笔记渲染窗口意外关闭',
      detail: `原因: ${details.reason}\n退出码: ${details.exitCode}\n\n点击确定后窗口将重新加载。`,
      buttons: ['重新加载', '退出']
    }).then((result) => {
      if (result.response === 0) {
        win.webContents.reload()
      } else {
        app.quit()
      }
    })
  })

  // P0: Unresponsive renderer handling
  win.on('unresponsive', () => {
    logger.warn('Renderer became unresponsive')
    dialog.showMessageBox(win, {
      type: 'warning',
      title: '应用无响应',
      message: '笔记应用暂时无响应',
      detail: '可能是大文件处理导致。是否要重新加载页面？',
      buttons: ['等待', '重新加载']
    }).then((result) => {
      if (result.response === 1) {
        win.webContents.reload()
      }
    })
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  logger.info('App ready', { platform: process.platform, version: app.getVersion() })
  const appIcon = getAppIcon()
  if (appIcon && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon)
  }

  registerIpcHandlers()
  mainWindow = createWindow()
  buildApplicationMenu(getMainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      buildApplicationMenu(getMainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
