import { app, BrowserWindow, shell, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { registerIpcHandlers } from './ipc'
import { buildApplicationMenu } from './menu'
import { restoreWindowState, saveWindowState } from './window-state'

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
      sandbox: false,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (windowState.isMaximized) {
    win.maximize()
  }

  win.on('ready-to-show', () => {
    win.show()
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

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
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
