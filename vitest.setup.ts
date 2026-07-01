import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

const noop = () => () => {}
const mockAppData = {
  notes: [],
  categories: [{ id: 'default', name: '默认笔记', collapsed: false, created: Date.now() }]
}

vi.stubGlobal('notesAPI', {
  loadNotes: vi.fn(async () => []),
  saveNotes: vi.fn(async () => {}),
  loadCategories: vi.fn(async () => mockAppData.categories),
  saveCategories: vi.fn(async () => {}),
  loadAppData: vi.fn(async () => mockAppData),
  saveAppData: vi.fn(async () => {}),
  onMenuNewNote: noop,
  onMenuNewFile: noop,
  onMenuOpenFile: noop,
  onMenuSave: noop,
  onMenuToggleTheme: noop,
  onMenuExport: noop,
  onMenuViewMode: noop,
  onMenuSearch: noop,
  onMenuExportConfig: noop,
  onMenuImportConfig: noop,
  onFileDropped: noop,
  getTheme: vi.fn(async () => 'light'),
  setTheme: vi.fn(async () => {}),
  getViewMode: vi.fn(async () => 'split'),
  setViewMode: vi.fn(async () => {}),
  getSplitRatio: vi.fn(async () => 0.5),
  setSplitRatio: vi.fn(async () => {}),
  exportNote: vi.fn(async () => true),
  openFile: vi.fn(async () => null),
  openFileByPath: vi.fn(async () => null),
  exportConfig: vi.fn(async () => true),
  importConfig: vi.fn(async () => null),
  showNotification: vi.fn(async () => {})
})

vi.stubGlobal('confirm', vi.fn(() => true))

// Mock matchMedia for useTheme system-follow
vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
})))
