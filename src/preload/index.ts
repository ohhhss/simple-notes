import { contextBridge, ipcRenderer } from 'electron'
import type { Note, Theme, ExportFormat, ViewMode, OpenedFile, Category, AppData } from '../shared/types'
import { IPC_CHANNELS, IPC_TIMEOUT_MS } from '../shared/ipc-channels'

/**
 * Wrap ipcRenderer.invoke with a timeout to prevent the renderer from
 * waiting indefinitely if the main process hangs or the handler is missing.
 * P0: stability - IPC timeout mechanism
 */
function invokeWithTimeout<T>(channel: string, ...args: unknown[]): Promise<T> {
  return Promise.race([
    ipcRenderer.invoke(channel, ...args) as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`IPC timeout after ${IPC_TIMEOUT_MS}ms: ${channel}`)), IPC_TIMEOUT_MS)
    })
  ])
}

const api = {
  loadNotes: (): Promise<Note[]> => invokeWithTimeout<Note[]>(IPC_CHANNELS.NOTES_LOAD),
  saveNotes: (notes: Note[]): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.NOTES_SAVE, notes),
  loadCategories: (): Promise<Category[]> => invokeWithTimeout<Category[]>(IPC_CHANNELS.CATEGORIES_LOAD),
  saveCategories: (categories: Category[]): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.CATEGORIES_SAVE, categories),
  loadAppData: (): Promise<AppData> => invokeWithTimeout<AppData>(IPC_CHANNELS.APP_LOAD),
  saveAppData: (data: AppData): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.APP_SAVE, data),
  getTheme: (): Promise<Theme> => invokeWithTimeout<Theme>(IPC_CHANNELS.THEME_GET),
  setTheme: (theme: Theme): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.THEME_SET, theme),
  getViewMode: (): Promise<ViewMode> => invokeWithTimeout<ViewMode>(IPC_CHANNELS.VIEWMODE_GET),
  setViewMode: (mode: ViewMode): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.VIEWMODE_SET, mode),
  getSplitRatio: (): Promise<number> => invokeWithTimeout<number>(IPC_CHANNELS.SPLITRATIO_GET),
  setSplitRatio: (ratio: number): Promise<void> => invokeWithTimeout<void>(IPC_CHANNELS.SPLITRATIO_SET, ratio),
  exportNote: (title: string, content: string, format: ExportFormat, defaultPath?: string): Promise<boolean> =>
    invokeWithTimeout<boolean>(IPC_CHANNELS.NOTE_EXPORT, title, content, format, defaultPath),
  openFile: (): Promise<OpenedFile | null> => invokeWithTimeout<OpenedFile | null>(IPC_CHANNELS.FILE_OPEN),
  openFileByPath: (filePath: string): Promise<OpenedFile | null> =>
    invokeWithTimeout<OpenedFile | null>(IPC_CHANNELS.FILE_OPEN_BY_PATH, filePath),
  onMenuNewNote: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_NEW_NOTE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_NEW_NOTE, handler)
  },
  onMenuNewFile: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_NEW_FILE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_NEW_FILE, handler)
  },
  onMenuOpenFile: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_FILE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_OPEN_FILE, handler)
  },
  onMenuSave: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_SAVE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_SAVE, handler)
  },
  onMenuToggleTheme: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_TOGGLE_THEME, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_TOGGLE_THEME, handler)
  },
  onMenuExport: (callback: (format: ExportFormat) => void) => {
    const handler = (_: unknown, format: ExportFormat) => callback(format)
    ipcRenderer.on(IPC_CHANNELS.MENU_EXPORT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_EXPORT, handler)
  },
  onMenuViewMode: (callback: (mode: ViewMode) => void) => {
    const handler = (_: unknown, mode: ViewMode) => callback(mode)
    ipcRenderer.on(IPC_CHANNELS.MENU_VIEWMODE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_VIEWMODE, handler)
  },
  onMenuSearch: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_SEARCH, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_SEARCH, handler)
  },
  exportConfig: (): Promise<boolean> => invokeWithTimeout<boolean>(IPC_CHANNELS.CONFIG_EXPORT),
  importConfig: (): Promise<AppData | null> => invokeWithTimeout<AppData | null>(IPC_CHANNELS.CONFIG_IMPORT),
  showNotification: (title: string, body: string): Promise<void> =>
    invokeWithTimeout<void>(IPC_CHANNELS.NOTIFY_SHOW, title, body),
  onFileDropped: (callback: (filePath: string) => void) => {
    const handler = (_: unknown, filePath: string) => callback(filePath)
    ipcRenderer.on(IPC_CHANNELS.FILE_DROPPED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FILE_DROPPED, handler)
  },
  onMenuExportConfig: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_EXPORT_CONFIG, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_EXPORT_CONFIG, handler)
  },
  onMenuImportConfig: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.MENU_IMPORT_CONFIG, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MENU_IMPORT_CONFIG, handler)
  }
}

contextBridge.exposeInMainWorld('notesAPI', api)

export type NotesAPI = typeof api
