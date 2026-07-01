import { Menu, dialog, BrowserWindow, app } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

export function buildApplicationMenu(getMainWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'

  const sendToRenderer = (channel: string, ...args: unknown[]) => {
    const win = getMainWindow() ?? BrowserWindow.getFocusedWindow()
    win?.webContents.send(channel, ...args)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建笔记',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_NEW_NOTE)
        },
        { type: 'separator' },
        {
          label: '打开文件...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_OPEN_FILE)
        },
        { type: 'separator' },
        {
          label: '保存笔记',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_SAVE)
        },
        { type: 'separator' },
        {
          label: '导出为 Markdown',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_EXPORT, 'md')
        },
        {
          label: '导出为纯文本',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_EXPORT, 'txt')
        },
        {
          label: '导出为 Word 文档',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_EXPORT, 'docx')
        },
        { type: 'separator' },
        {
          label: '导出备份...',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_EXPORT_CONFIG)
        },
        {
          label: '导入备份...',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_IMPORT_CONFIG)
        },
        { type: 'separator' },
        isMac
          ? { role: 'close' as const, label: '关闭窗口' }
          : { role: 'quit' as const, label: '退出', accelerator: 'Ctrl+Q' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '分屏模式',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_VIEWMODE, 'split')
        },
        {
          label: '仅编辑模式',
          accelerator: 'CmdOrCtrl+Alt+E',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_VIEWMODE, 'edit')
        },
        {
          label: '仅预览模式',
          accelerator: 'CmdOrCtrl+Alt+P',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_VIEWMODE, 'preview')
        },
        { type: 'separator' },
        {
          label: '切换昼夜主题',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_TOGGLE_THEME)
        },
        {
          label: '全局搜索',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendToRenderer(IPC_CHANNELS.MENU_SEARCH)
        },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于简单笔记',
              message: '简单笔记',
              detail: `版本: ${app.getVersion()}\n一个简洁的本地 Markdown 笔记应用\n基于 Electron + React + TypeScript\n支持实时预览、昼夜主题、分类管理、多格式导入导出\n\n开发者: ohhhss\nGitHub: https://github.com/ohhhss`
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
