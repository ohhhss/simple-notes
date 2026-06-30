import { contextBridge, ipcRenderer } from 'electron'
import type { Note, Theme, ExportFormat } from '../shared/types'

contextBridge.exposeInMainWorld('notesAPI', {
  loadNotes: (): Promise<Note[]> => ipcRenderer.invoke('notes:load'),
  saveNotes: (notes: Note[]): Promise<void> => ipcRenderer.invoke('notes:save', notes),

  onMenuNewNote: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:new-note', handler)
    return () => ipcRenderer.removeListener('menu:new-note', handler)
  },

  onMenuToggleTheme: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:toggle-theme', handler)
    return () => ipcRenderer.removeListener('menu:toggle-theme', handler)
  },

  onMenuExport: (callback: (format: ExportFormat) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, format: ExportFormat): void => callback(format)
    ipcRenderer.on('menu:export', handler)
    return () => ipcRenderer.removeListener('menu:export', handler)
  },

  getTheme: (): Promise<Theme> => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: Theme): Promise<void> => ipcRenderer.invoke('theme:set', theme),

  exportNote: (title: string, content: string, format: ExportFormat): Promise<boolean> =>
    ipcRenderer.invoke('note:export', title, content, format)
})
