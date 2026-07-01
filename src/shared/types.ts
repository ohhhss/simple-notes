export const DEFAULT_CATEGORY_ID = 'default'
export const TRASH_CATEGORY_ID = '__trash__'
export const TRASH_RETENTION_DAYS = 30

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  created: number
  updated: number
  categoryId: string
  deletedAt?: number
  filePath?: string
}

export interface Category {
  id: string
  name: string
  collapsed: boolean
  created: number
}

export type Theme = 'light' | 'dark'

export type ExportFormat = 'md' | 'txt' | 'docx'

export type ViewMode = 'split' | 'edit' | 'preview'

export interface OpenedFile {
  title: string
  content: string
  filePath: string
  format: ExportFormat
}

export interface SearchFilters {
  keyword: string
  tag: string | null
  dateFrom: number | null
  dateTo: number | null
  dateField: 'updated' | 'created'
  inTrash: boolean
}

export interface AppData {
  notes: Note[]
  categories: Category[]
}

export interface NotesAPI {
  loadNotes: () => Promise<Note[]>
  saveNotes: (notes: Note[]) => Promise<void>
  loadCategories: () => Promise<Category[]>
  saveCategories: (categories: Category[]) => Promise<void>
  loadAppData: () => Promise<AppData>
  saveAppData: (data: AppData) => Promise<void>
  onMenuNewNote: (callback: () => void) => () => void
  onMenuNewFile: (callback: () => void) => () => void
  onMenuOpenFile: (callback: () => void) => () => void
  onMenuSave: (callback: () => void) => () => void
  onMenuToggleTheme: (callback: () => void) => () => void
  onMenuExport: (callback: (format: ExportFormat) => void) => () => void
  onMenuViewMode: (callback: (mode: ViewMode) => void) => () => void
  onMenuSearch: (callback: () => void) => () => void
  getTheme: () => Promise<Theme>
  setTheme: (theme: Theme) => Promise<void>
  getViewMode: () => Promise<ViewMode>
  setViewMode: (mode: ViewMode) => Promise<void>
  getSplitRatio: () => Promise<number>
  setSplitRatio: (ratio: number) => Promise<void>
  exportNote: (title: string, content: string, format: ExportFormat, defaultPath?: string) => Promise<boolean>
  openFile: () => Promise<OpenedFile | null>
  openFileByPath: (filePath: string) => Promise<OpenedFile | null>
  exportConfig: () => Promise<boolean>
  importConfig: () => Promise<AppData | null>
  showNotification: (title: string, body: string) => Promise<void>
  onFileDropped: (callback: (filePath: string) => void) => () => void
  onMenuExportConfig: (callback: () => void) => () => void
  onMenuImportConfig: (callback: () => void) => () => void
}
