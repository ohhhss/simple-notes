import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

const mockNotes: unknown[] = []
const mockSave = vi.fn(async () => {})
const mockLoad = vi.fn(async () => mockNotes)
const mockOnMenuNewNote = vi.fn(() => () => {})
const mockOnMenuToggleTheme = vi.fn(() => () => {})
const mockOnMenuExport = vi.fn(() => () => {})
const mockGetTheme = vi.fn(async () => 'light')
const mockSetTheme = vi.fn(async () => {})
const mockExportNote = vi.fn(async () => true)

vi.stubGlobal('notesAPI', {
  loadNotes: mockLoad,
  saveNotes: mockSave,
  onMenuNewNote: mockOnMenuNewNote,
  onMenuToggleTheme: mockOnMenuToggleTheme,
  onMenuExport: mockOnMenuExport,
  getTheme: mockGetTheme,
  setTheme: mockSetTheme,
  exportNote: mockExportNote
})

vi.stubGlobal('confirm', vi.fn(() => true))
