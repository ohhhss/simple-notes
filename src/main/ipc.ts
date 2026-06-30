import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Note, Theme, ExportFormat } from '../shared/types'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, LevelFormat } from 'docx'

function getNotesPath(): string {
  return join(app.getPath('userData'), 'notes.json')
}

function getThemePath(): string {
  return join(app.getPath('userData'), 'theme.json')
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, match => match)
    .replace(/^---+$/gm, '─'.repeat(40))
    .replace(/\|/g, '  ')
}

function mdToDocxParagraphs(md: string): Paragraph[] {
  const lines = md.split('\n')
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trimEnd()

    // Heading
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      const level = hMatch[1].length
      const text = hMatch[2]
      const headingLevels = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
        HeadingLevel.HEADING_5,
        HeadingLevel.HEADING_6
      ]
      paragraphs.push(new Paragraph({
        heading: headingLevels[level - 1],
        children: [new TextRun({ text, bold: true })]
      }))
      continue
    }

    // Horizontal rule
    if (/^-{3,}$|^\*{3,}$/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '─'.repeat(40), color: '999999' })]
      }))
      continue
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const text = trimmed.replace(/^>\s?/, '')
      paragraphs.push(new Paragraph({
        indent: { left: 720 },
        children: [new TextRun({ text, italics: true, color: '666666' })]
      }))
      continue
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun(ulMatch[1])]
      }))
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      paragraphs.push(new Paragraph({
        numbering: { reference: 'notes-numbering', level: 0 },
        children: [new TextRun(olMatch[1])]
      }))
      continue
    }

    // Empty line
    if (trimmed === '') {
      paragraphs.push(new Paragraph({ children: [] }))
      continue
    }

    // Code block line
    if (trimmed.startsWith('```')) {
      continue
    }

    // Regular paragraph - process inline formatting
    const runs: TextRun[] = []
    const inlineRegex = /(\*\*.+?\*\*|__.+?__|\*.+?\*|_.+?_|`.+?`)/g
    let lastIndex = 0
    let match
    while ((match = inlineRegex.exec(trimmed)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun(trimmed.slice(lastIndex, match.index)))
      }
      const token = match[0]
      if (token.startsWith('**') || token.startsWith('__')) {
        runs.push(new TextRun({ text: token.slice(2, -2), bold: true }))
      } else if (token.startsWith('*') || token.startsWith('_')) {
        runs.push(new TextRun({ text: token.slice(1, -1), italics: true }))
      } else if (token.startsWith('`')) {
        runs.push(new TextRun({ text: token.slice(1, -1), font: 'Consolas' }))
      }
      lastIndex = match.index + token.length
    }
    if (lastIndex < trimmed.length) {
      runs.push(new TextRun(trimmed.slice(lastIndex)))
    }
    paragraphs.push(new Paragraph({ children: runs }))
  }

  return paragraphs
}

async function exportNoteHandler(
  _event: Electron.IpcMainInvokeEvent,
  title: string,
  content: string,
  format: ExportFormat
): Promise<boolean> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return false

  const safeTitle = (title || '无标题').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)

  const filters: Record<ExportFormat, { name: string; extensions: string[] }> = {
    md: { name: 'Markdown 文件', extensions: ['md'] },
    txt: { name: '纯文本文件', extensions: ['txt'] },
    docx: { name: 'Word 文档', extensions: ['docx'] }
  }

  const result = await dialog.showSaveDialog(win, {
    title: '导出笔记',
    defaultPath: `${safeTitle}.${format}`,
    filters: [filters[format], { name: '所有文件', extensions: ['*'] }]
  })

  if (result.canceled || !result.filePath) return false

  try {
    if (format === 'md') {
      await fs.writeFile(result.filePath, content, 'utf-8')
    } else if (format === 'txt') {
      await fs.writeFile(result.filePath, stripMarkdown(content), 'utf-8')
    } else if (format === 'docx') {
      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'notes-numbering',
              levels: [
                {
                  level: 0,
                  format: LevelFormat.DECIMAL,
                  text: '%1.',
                  alignment: 'start',
                  style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                }
              ]
            }
          ]
        },
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                heading: HeadingLevel.TITLE,
                children: [new TextRun({ text: title || '无标题', bold: true, size: 48 })]
              }),
              ...mdToDocxParagraphs(content)
            ]
          }
        ]
      })
      const blob = await Packer.toBuffer(doc)
      await fs.writeFile(result.filePath, blob)
    }
    return true
  } catch (err) {
    dialog.showErrorBox('导出失败', String(err))
    return false
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('notes:load', async (): Promise<Note[]> => {
    try {
      const data = await fs.readFile(getNotesPath(), 'utf-8')
      const notes = JSON.parse(data)
      return Array.isArray(notes) ? notes : []
    } catch {
      return []
    }
  })

  ipcMain.handle('notes:save', async (_event, notes: Note[]): Promise<void> => {
    await fs.writeFile(getNotesPath(), JSON.stringify(notes, null, 2), 'utf-8')
  })

  ipcMain.handle('theme:get', async (): Promise<Theme> => {
    try {
      const data = await fs.readFile(getThemePath(), 'utf-8')
      const t = JSON.parse(data)
      return (t === 'dark' || t === 'light') ? t : 'light'
    } catch {
      return 'light'
    }
  })

  ipcMain.handle('theme:set', async (_event, theme: Theme): Promise<void> => {
    await fs.writeFile(getThemePath(), JSON.stringify(theme), 'utf-8')
  })

  ipcMain.handle('note:export', exportNoteHandler)
}
