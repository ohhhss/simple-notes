export interface Note {
  id: string
  title: string
  content: string
  created: number
  updated: number
}

export type Theme = 'light' | 'dark'

export type ExportFormat = 'md' | 'txt' | 'docx'

export interface NotesAPI {
  loadNotes: () => Promise<Note[]>
  saveNotes: (notes: Note[]) => Promise<void>
  onMenuNewNote: (callback: () => void) => () => void
  onMenuToggleTheme: (callback: () => void) => () => void
  onMenuExport: (callback: (format: ExportFormat) => void) => () => void
  getTheme: () => Promise<Theme>
  setTheme: (theme: Theme) => Promise<void>
  exportNote: (title: string, content: string, format: ExportFormat) => Promise<boolean>
}
