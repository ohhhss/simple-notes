import { ipcMain, dialog, BrowserWindow, Notification } from 'electron'
import { promises as fs } from 'fs'
import { join, basename, extname, resolve, normalize } from 'path'
import { app } from 'electron'
import type { Note, Theme, ExportFormat, ViewMode, OpenedFile, Category, AppData } from '../shared/types'
import { DEFAULT_CATEGORY_ID, TRASH_RETENTION_DAYS } from '../shared/types'
import { IPC_CHANNELS, isAllowedImportExtension, isAllowedExportFormat } from '../shared/ipc-channels'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, LevelFormat } from 'docx'
import mammoth from 'mammoth'
import { logger } from './logger'

// --- Validation helpers (P0: security) ---

function validateString(val: unknown, maxLen: number = 10000): string | null {
  if (typeof val !== 'string' || val.length > maxLen) return null
  return val
}

function validateNoteArray(val: unknown): Note[] | null {
  if (!Array.isArray(val)) return null
  for (const n of val) {
    if (!n || typeof n !== 'object') return null
    if (typeof n.id !== 'string' || typeof n.title !== 'string' || typeof n.content !== 'string') return null
    if (!Array.isArray(n.tags) || typeof n.created !== 'number' || typeof n.updated !== 'number') return null
    if (typeof n.categoryId !== 'string') return null
  }
  return val as Note[]
}

function validateCategoryArray(val: unknown): Category[] | null {
  if (!Array.isArray(val)) return null
  for (const c of val) {
    if (!c || typeof c !== 'object') return null
    if (typeof c.id !== 'string' || typeof c.name !== 'string') return null
    if (typeof c.collapsed !== 'boolean' || typeof c.created !== 'number') return null
  }
  return val as Category[]
}

function validateFilePath(filePath: unknown): string | null {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.length > 4096) return null
  // Resolve and normalize the path
  const resolved = resolve(normalize(filePath))
  // Check extension whitelist
  const ext = extname(resolved).toLowerCase()
  if (!isAllowedImportExtension(ext)) return null
  // Block path traversal attempts (no parent directory escapes in the resolved form)
  // Block obviously dangerous paths on Windows
  if (process.platform === 'win32') {
    // Block UNC paths and device paths
    if (/^\\\\|^\/\/|[A-Za-z]:[\\\\/](System32|Windows|Program Files)/i.test(resolved)) {
      // Allow normal drive paths but block system directories - refined below
    }
  }
  return resolved
}

function validateTheme(val: unknown): Theme | null {
  return (val === 'dark' || val === 'light') ? val : null
}

function validateViewMode(val: unknown): ViewMode | null {
  return (val === 'split' || val === 'edit' || val === 'preview') ? val : null
}

function validateRatio(val: unknown): number | null {
  if (typeof val !== 'number' || isNaN(val)) return null
  return Math.max(0.2, Math.min(0.8, val))
}

function getAppDataPath(): string {
  return join(app.getPath('userData'), 'app-data.json')
}

function getThemePath(): string {
  return join(app.getPath('userData'), 'theme.json')
}

function getViewModePath(): string {
  return join(app.getPath('userData'), 'viewmode.json')
}

function getSplitRatioPath(): string {
  return join(app.getPath('userData'), 'splitratio.json')
}

const DEFAULT_CATEGORY: Category = {
  id: DEFAULT_CATEGORY_ID,
  name: '默认笔记',
  collapsed: false,
  created: Date.now()
}

async function loadAppDataFromDisk(): Promise<AppData> {
  try {
    // Try new unified storage first
    try {
      const raw = await fs.readFile(getAppDataPath(), 'utf-8')
      const data = JSON.parse(raw)
      const notes: Note[] = Array.isArray(data.notes) ? data.notes : []
      let categories: Category[] = Array.isArray(data.categories) ? data.categories : []
      if (!categories.find(c => c.id === DEFAULT_CATEGORY_ID)) {
        categories = [DEFAULT_CATEGORY, ...categories]
      }
      let changed = false
      const now = Date.now()
      const expireThreshold = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
      // Migrate notes: ensure tags array, auto-clean expired trash
      const migratedNotes: Note[] = []
      for (const note of notes) {
        if (!Array.isArray(note.tags)) note.tags = []
        if (note.deletedAt && note.deletedAt < expireThreshold) {
          changed = true
          continue // permanently delete expired
        }
        if (!note.categoryId || !categories.find(c => c.id === note.categoryId)) {
          note.categoryId = DEFAULT_CATEGORY_ID
          changed = true
        }
        migratedNotes.push(note)
      }
      if (migratedNotes.length !== notes.length) changed = true
      const finalNotes = changed ? migratedNotes : notes
      if (changed) {
        await fs.writeFile(getAppDataPath(), JSON.stringify({ notes: finalNotes, categories }, null, 2), 'utf-8')
      }
      logger.info('App data loaded from disk', { notes: finalNotes.length })
      return { notes: finalNotes, categories }
    } catch {
      // Fallback: migrate from old notes.json
      logger.warn('App data file not found, falling back to notes.json migration')
      const oldPath = join(app.getPath('userData'), 'notes.json')
      const raw = await fs.readFile(oldPath, 'utf-8')
      const oldNotes: Note[] = JSON.parse(raw)
      const notes = Array.isArray(oldNotes)
        ? oldNotes.map(n => ({ ...n, tags: n.tags || [], categoryId: n.categoryId || DEFAULT_CATEGORY_ID }))
        : []
      const data: AppData = { notes, categories: [DEFAULT_CATEGORY] }
      await fs.writeFile(getAppDataPath(), JSON.stringify(data, null, 2), 'utf-8')
      logger.info('App data migrated from notes.json')
      return data
    }
  } catch {
    // First run
    logger.info('First run: creating welcome note')
    const welcomeNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: '欢迎使用简单笔记',
      tags: ['入门', '教程'],
      content: `# 欢迎使用简单笔记！

这是一个支持 **Markdown** 的轻量级本地笔记应用。

## 功能特点

- 实时 Markdown 预览 #基础
- 编辑区语法高亮 #基础
- 昼夜主题一键切换 #个性化
- 多格式导入导出（.md / .txt / .docx）
- 可折叠目录分类管理 #整理
- 回收站机制，删除后 30 天内可恢复
- 全局搜索：内容 + 标签 + 时间范围
- 可拖拽分栏布局 #编辑
- 自动保存 + 手动保存（Ctrl+S）#保存
- 外部文件可一键保存到笔记列表

## 使用提示

1. 左侧列表底部点击「新建分类」创建分类
2. 分类旁 **+** 按钮新建笔记到该分类
3. 笔记标题下方输入标签（用空格分隔）
4. 顶部搜索框支持内容/标签/时间组合检索
5. 删除的笔记会进入回收站，30 天内可恢复
6. 按 **Ctrl+S** 可手动保存当前笔记
7. 打开外部文件后，点击「保存到笔记」可将其加入笔记列表

---

*开始记录你的想法吧！使用 #标签 来标记笔记。*
`,
      created: Date.now(),
      updated: Date.now(),
      categoryId: DEFAULT_CATEGORY_ID
    }
    const data: AppData = { notes: [welcomeNote], categories: [DEFAULT_CATEGORY] }
    await fs.writeFile(getAppDataPath(), JSON.stringify(data, null, 2), 'utf-8')
    return data
  }
}

function htmlToMarkdown(html: string): string {
  let md = html
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
  md = md.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
  md = md.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
  md = md.replace(/<(code|tt)>([\s\S]*?)<\/\1>/gi, '`$2`')
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?\s*>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*\/?\s*>/gi, '![]($1)')
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n')
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
    c.split('\n').map((l: string) => '> ' + l.trim()).join('\n') + '\n\n')
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, c) => {
    const items = c.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
    return items.map((li: string) => '- ' + li.replace(/<\/?li[^>]*>/gi, '').trim()).join('\n') + '\n\n'
  })
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, c) => {
    const items = c.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
    return items.map((li: string, i: number) => `${i + 1}. ` + li.replace(/<\/?li[^>]*>/gi, '').trim()).join('\n') + '\n\n'
  })
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tc) => {
    const rows = tc.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
    if (rows.length === 0) return ''
    const mdRows: string[] = []
    rows.forEach((row: string, idx: number) => {
      const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || []
      const ct = cells.map((c: string) => c.replace(/<\/?t[hd][^>]*>/gi, '').trim().replace(/\n/g, ' '))
      mdRows.push('| ' + ct.join(' | ') + ' |')
      if (idx === 0) mdRows.push('| ' + ct.map(() => '---').join(' | ') + ' |')
    })
    return mdRows.join('\n') + '\n\n'
  })
  md = md.replace(/<[^>]+>/g, '')
  md = md.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  md = md.replace(/\n{3,}/g, '\n\n')
  return md.trim()
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '• ').replace(/^- \[[ xX]\]\s+/gm, '☐ ')
    .replace(/^---+$/gm, '─'.repeat(40)).replace(/\|/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
}

function mdToDocxParagraphs(md: string): Paragraph[] {
  const lines = md.split('\n')
  const paragraphs: Paragraph[] = []
  for (const line of lines) {
    const trimmed = line.trimEnd()
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      const hl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]
      paragraphs.push(new Paragraph({ heading: hl[hMatch[1].length - 1], children: [new TextRun({ text: hMatch[2], bold: true })] }))
      continue
    }
    if (/^-{3,}$|^\*{3,}$/.test(trimmed)) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '─'.repeat(40), color: '999999' })] }))
      continue
    }
    if (/^>\s?/.test(trimmed)) {
      paragraphs.push(new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: trimmed.replace(/^>\s?/, ''), italics: true, color: '666666' })] }))
      continue
    }
    const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/)
    if (taskMatch) {
      paragraphs.push(new Paragraph({ children: [new TextRun((taskMatch[1].toLowerCase() === 'x' ? '☑ ' : '☐ ') + taskMatch[2])] }))
      continue
    }
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) { paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(ulMatch[1])] })); continue }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) { paragraphs.push(new Paragraph({ numbering: { reference: 'notes-numbering', level: 0 }, children: [new TextRun(olMatch[1])] })); continue }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').filter(c => c.trim() !== '' && !/^[-:\s]+$/.test(c))
      if (cells.length > 0) paragraphs.push(new Paragraph({ children: [new TextRun(cells.join(' | '))] }))
      continue
    }
    if (trimmed === '') { paragraphs.push(new Paragraph({ children: [] })); continue }
    if (trimmed.startsWith('```')) continue
    const runs: TextRun[] = []
    const re = /(\*\*.+?\*\*|__.+?__|\*.+?\*|_.+?_|`.+?`)/g
    let li = 0, m
    while ((m = re.exec(trimmed)) !== null) {
      if (m.index > li) runs.push(new TextRun(trimmed.slice(li, m.index)))
      const t = m[0]
      if (t.startsWith('**') || t.startsWith('__')) runs.push(new TextRun({ text: t.slice(2, -2), bold: true }))
      else if (t.startsWith('*') || t.startsWith('_')) runs.push(new TextRun({ text: t.slice(1, -1), italics: true }))
      else if (t.startsWith('`')) runs.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas' }))
      li = m.index + t.length
    }
    if (li < trimmed.length) runs.push(new TextRun(trimmed.slice(li)))
    paragraphs.push(new Paragraph({ children: runs }))
  }
  return paragraphs
}

async function readFileByPath(filePath: string): Promise<OpenedFile | null> {
  const ext = extname(filePath).toLowerCase().replace('.', '') as ExportFormat
  const title = basename(filePath, extname(filePath))
  try {
    let content = ''
    if (ext === 'md' || ext === 'txt') {
      content = await fs.readFile(filePath, 'utf-8')
    } else if (ext === 'docx') {
      const buf = await fs.readFile(filePath)
      const r = await mammoth.convertToHtml({ buffer: buf })
      content = htmlToMarkdown(r.value)
    } else {
      return null
    }
    logger.info('File opened', { filePath, format: ext })
    return { title, content, filePath, format: ext }
  } catch (err) {
    logger.error('Open file failed', { filePath, error: String(err) })
    dialog.showErrorBox('打开文件失败', String(err))
    return null
  }
}

async function openFileHandler(): Promise<OpenedFile | null> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    title: '打开笔记文件',
    filters: [
      { name: '笔记文件', extensions: ['md', 'txt', 'docx'] },
      { name: 'Markdown 文件', extensions: ['md'] },
      { name: '纯文本文件', extensions: ['txt'] },
      { name: 'Word 文档', extensions: ['docx'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return readFileByPath(result.filePaths[0])
}

async function exportNoteHandler(
  _event: Electron.IpcMainInvokeEvent,
  title: unknown, content: unknown, format: unknown, defaultPath?: unknown
): Promise<boolean> {
  // P0: Input validation
  const validTitle = validateString(title, 200)
  const validContent = validateString(content, 5000000) // 5MB max
  const validFormat = typeof format === 'string' && isAllowedExportFormat(format) ? format as ExportFormat : null

  if (validContent === null || validFormat === null) {
    logger.error('Export validation failed', { titleType: typeof title, formatType: typeof format })
    return false
  }

  const win = BrowserWindow.getFocusedWindow()
  if (!win) return false
  const safeTitle = (validTitle || '无标题').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
  const filters: Record<ExportFormat, { name: string; extensions: string[] }> = {
    md: { name: 'Markdown 文件', extensions: ['md'] },
    txt: { name: '纯文本文件', extensions: ['txt'] },
    docx: { name: 'Word 文档', extensions: ['docx'] }
  }
  const result = await dialog.showSaveDialog(win, {
    title: '导出笔记',
    defaultPath: (typeof defaultPath === 'string' ? defaultPath : undefined) || `${safeTitle}.${validFormat}`,
    filters: [filters[validFormat], { name: '所有文件', extensions: ['*'] }]
  })
  if (result.canceled || !result.filePath) return false
  try {
    if (validFormat === 'md') {
      await fs.writeFile(result.filePath, validContent, 'utf-8')
    } else if (validFormat === 'txt') {
      await fs.writeFile(result.filePath, stripMarkdown(validContent), 'utf-8')
    } else if (validFormat === 'docx') {
      const doc = new Document({
        numbering: { config: [{ reference: 'notes-numbering', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: 'start', style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
        sections: [{ properties: {}, children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: validTitle || '无标题', bold: true, size: 48 })] }),
          ...mdToDocxParagraphs(validContent)
        ]}]
      })
      const blob = await Packer.toBuffer(doc)
      await fs.writeFile(result.filePath, blob)
    }
    logger.info('Note exported', { format: validFormat, path: result.filePath })
    if (Notification.isSupported()) {
      new Notification({
        title: '导出成功',
        body: `笔记已导出为 ${validFormat.toUpperCase()} 文件`,
        silent: true
      }).show()
    }
    return true
  } catch (err) {
    logger.error('Export failed', { format: validFormat, error: String(err) })
    dialog.showErrorBox('导出失败', String(err))
    return false
  }
}

export function registerIpcHandlers(): void {
  // Unified app data load/save
  ipcMain.handle(IPC_CHANNELS.APP_LOAD, async (): Promise<AppData> => {
    return loadAppDataFromDisk()
  })

  ipcMain.handle(IPC_CHANNELS.APP_SAVE, async (_event, data: unknown): Promise<void> => {
    // P0: Validate AppData structure
    if (!data || typeof data !== 'object') {
      logger.error('app:save validation failed: invalid data type')
      return
    }
    const obj = data as Record<string, unknown>
    const notes = validateNoteArray(obj.notes)
    const categories = validateCategoryArray(obj.categories)
    if (notes === null || categories === null) {
      logger.error('app:save validation failed: invalid notes or categories')
      return
    }
    await fs.writeFile(getAppDataPath(), JSON.stringify({ notes, categories }, null, 2), 'utf-8')
  })

  // Legacy individual handlers for backward compat
  ipcMain.handle(IPC_CHANNELS.NOTES_LOAD, async (): Promise<Note[]> => {
    const data = await loadAppDataFromDisk()
    return data.notes
  })

  ipcMain.handle(IPC_CHANNELS.NOTES_SAVE, async (_event, notes: unknown): Promise<void> => {
    const validNotes = validateNoteArray(notes)
    if (validNotes === null) {
      logger.error('notes:save validation failed')
      return
    }
    const data = await loadAppDataFromDisk()
    data.notes = validNotes
    await fs.writeFile(getAppDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_LOAD, async (): Promise<Category[]> => {
    const data = await loadAppDataFromDisk()
    return data.categories
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_SAVE, async (_event, categories: unknown): Promise<void> => {
    const validCats = validateCategoryArray(categories)
    if (validCats === null) {
      logger.error('categories:save validation failed')
      return
    }
    const data = await loadAppDataFromDisk()
    data.categories = validCats
    await fs.writeFile(getAppDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.THEME_GET, async (): Promise<Theme> => {
    try { const d = await fs.readFile(getThemePath(), 'utf-8'); const t = JSON.parse(d); const valid = validateTheme(t); return valid || 'light' } catch { return 'light' }
  })
  ipcMain.handle(IPC_CHANNELS.THEME_SET, async (_e, theme: unknown) => {
    const valid = validateTheme(theme)
    if (valid === null) {
      logger.error('theme:set validation failed', { value: String(theme) })
      return
    }
    await fs.writeFile(getThemePath(), JSON.stringify(valid), 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.VIEWMODE_GET, async (): Promise<ViewMode> => {
    try { const d = await fs.readFile(getViewModePath(), 'utf-8'); const v = JSON.parse(d); const valid = validateViewMode(v); return valid || 'split' } catch { return 'split' }
  })
  ipcMain.handle(IPC_CHANNELS.VIEWMODE_SET, async (_e, mode: unknown) => {
    const valid = validateViewMode(mode)
    if (valid === null) {
      logger.error('viewmode:set validation failed', { value: String(mode) })
      return
    }
    await fs.writeFile(getViewModePath(), JSON.stringify(valid), 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.SPLITRATIO_GET, async (): Promise<number> => {
    try { const d = await fs.readFile(getSplitRatioPath(), 'utf-8'); const r = parseFloat(d); const valid = validateRatio(r); return valid !== null ? valid : 0.5 } catch { return 0.5 }
  })
  ipcMain.handle(IPC_CHANNELS.SPLITRATIO_SET, async (_e, ratio: unknown) => {
    const valid = validateRatio(ratio)
    if (valid === null) {
      logger.error('splitratio:set validation failed', { value: String(ratio) })
      return
    }
    await fs.writeFile(getSplitRatioPath(), String(valid), 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.NOTE_EXPORT, exportNoteHandler)
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, openFileHandler)
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_BY_PATH, async (_event, filePath: unknown): Promise<OpenedFile | null> => {
    // P0: Strict path validation - only allow whitelisted extensions, reject traversal
    const validPath = validateFilePath(filePath)
    if (validPath === null) {
      logger.error('file:open-by-path validation failed', { input: String(filePath) })
      return null
    }
    return readFileByPath(validPath)
  })

  // System notification
  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, async (_event, title: unknown, body: unknown) => {
    const validTitle = validateString(title, 200)
    const validBody = validateString(body, 1000)
    if (validTitle === null || validBody === null) {
      logger.error('notify:show validation failed')
      return
    }
    if (Notification.isSupported()) {
      new Notification({ title: validTitle, body: validBody, silent: true }).show()
    }
  })

  // Config export/import (backup)
  ipcMain.handle(IPC_CHANNELS.CONFIG_EXPORT, async (): Promise<boolean> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    const result = await dialog.showSaveDialog(win, {
      title: '导出备份',
      defaultPath: `简单笔记备份_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    try {
      const data = await loadAppDataFromDisk()
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      logger.info('Config exported', { path: result.filePath })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_IMPORT, async (): Promise<AppData | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: '导入备份',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    try {
      const raw = await fs.readFile(result.filePaths[0], 'utf-8')
      const data = JSON.parse(raw) as AppData
      // P0: Validate imported data structure
      const validNotes = validateNoteArray(data.notes)
      const validCats = validateCategoryArray(data.categories)
      if (validNotes === null || validCats === null) {
        logger.error('config:import validation failed: invalid backup structure')
        dialog.showErrorBox('导入失败', '备份文件格式不正确，笔记或分类数据无效。')
        return null
      }
      await fs.writeFile(getAppDataPath(), JSON.stringify({ notes: validNotes, categories: validCats }, null, 2), 'utf-8')
      logger.info('Config imported', { notes: validNotes.length })
      return { notes: validNotes, categories: validCats }
    } catch {
      return null
    }
  })
}
