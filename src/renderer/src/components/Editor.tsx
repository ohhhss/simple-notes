import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { formatTime } from '../utils/formatTime'
import { renderMarkdown } from '../utils/markdown'
import Toolbar from './Toolbar'
import type { Note } from '@shared/types'
import type { ExportFormat, Theme, ViewMode } from '@shared/types'

interface EditorProps {
  note: Note
  theme: Theme
  viewMode: ViewMode
  splitRatio: number
  isOpenedFile: boolean
  isTrashed?: boolean
  saveStatus?: 'idle' | 'saved'
  onCloseOpenedFile?: () => void
  onSave?: () => void
  onSaveToNotes?: () => void
  onRestore?: () => void
  onPermanentDelete?: () => void
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onTagsChange: (tags: string[]) => void
  onExport: (format: ExportFormat) => void
  onToggleTheme: () => void
  onSetViewMode: (mode: ViewMode) => void
  onSetSplitRatio: (ratio: number) => void
  onPersistSplitRatio: (ratio: number) => void
  onOpenFile: () => void
  onNewNote: () => void
  onOpenSearch?: () => void
}

// Markdown syntax highlight for editor
function highlightMarkdown(text: string): string {
  if (!text) return ''
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = text.split('\n')
  return lines
    .map(rawLine => {
      if (/^```/.test(rawLine)) {
        return `<span class="md-code-fence">${esc(rawLine)}</span>`
      }
      const h = rawLine.match(/^(#{1,6})\s+(.*)$/)
      if (h) {
        return `<span class="md-hash">${esc(h[1])}</span> ${inlineHighlight(esc(h[2]))}`
      }
      if (rawLine.startsWith('>')) {
        const rest = rawLine.slice(1).replace(/^\s/, '')
        return `<span class="md-quote">${esc('>')}</span> ${inlineHighlight(esc(rest))}`
      }
      const taskMatch = rawLine.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/)
      if (taskMatch) {
        return `${esc(taskMatch[1])}<span class="md-list">${esc('- [' + taskMatch[2] + ']')}</span> ${inlineHighlight(esc(taskMatch[3]))}`
      }
      const ul = rawLine.match(/^(\s*)([-*+])(\s+)(.*)$/)
      if (ul) {
        return `${esc(ul[1])}<span class="md-list">${esc(ul[2])}</span>${esc(ul[3])}${inlineHighlight(esc(ul[4]))}`
      }
      const ol = rawLine.match(/^(\s*)(\d+\.)(\s+)(.*)$/)
      if (ol) {
        return `${esc(ol[1])}<span class="md-list">${esc(ol[2])}</span>${esc(ol[3])}${inlineHighlight(esc(ol[4]))}`
      }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(rawLine.trim())) {
        return `<span class="md-hr">${esc(rawLine)}</span>`
      }
      return inlineHighlight(esc(rawLine))
    })
    .join('\n')
}

function inlineHighlight(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<span class="md-bold">**$1**</span>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<span class="md-italic">*$2*</span>')
    .replace(/__([^_]+)__/g, '<span class="md-bold">__$1__</span>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<span class="md-italic">_$2_</span>')
    .replace(/~~([^~]+)~~/g, '<span class="md-strike">~~$1~~</span>')
    .replace(/`([^`]+)`/g, '<span class="md-inline-code">`$1`</span>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="md-link">[</span>$1<span class="md-link">]($2)</span>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="md-image">![$1]($2)</span>')
}

const VIEW_MODE_ICONS: Record<ViewMode, { label: string; hint: string }> = {
  split: { label: '分屏', hint: '分屏模式' },
  edit: { label: '编辑', hint: '仅编辑模式' },
  preview: { label: '预览', hint: '仅预览模式' }
}

const IconSplit = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
)
const IconEdit = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconPreview = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconSun = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const IconFolder = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconSave = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IconPlus = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)
const IconClose = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
)
const IconSaveNote = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IconSaveToList = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  split: IconSplit, edit: IconEdit, preview: IconPreview
}

export default function Editor({
  note, theme, viewMode, splitRatio, isOpenedFile, isTrashed, saveStatus,
  onCloseOpenedFile, onSave, onSaveToNotes,
  onRestore, onPermanentDelete,
  onTitleChange, onContentChange, onTagsChange, onExport, onToggleTheme,
  onSetViewMode, onSetSplitRatio, onPersistSplitRatio,
  onOpenFile, onNewNote, onOpenSearch
}: EditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const tagsInputRef = useRef<HTMLInputElement>(null)
  const isDraggingRef = useRef(false)
  const isSyncingScrollRef = useRef(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [tagInputValue, setTagInputValue] = useState('')
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmPermDelete, setConfirmPermDelete] = useState(false)

  // Sync tag input when switching notes
  useEffect(() => { setTagInputValue('') }, [note.id])

  const highlightedContent = useMemo(() => highlightMarkdown(note.content), [note.content])
  const previewHtml = useMemo(() => renderMarkdown(note.content), [note.content])

  useEffect(() => {
    // Focus title for new empty notes
    if (!isOpenedFile && note.title === '未命名笔记' && note.content === '') {
      titleRef.current?.focus()
      titleRef.current?.select()
    }
  }, [note.id, isOpenedFile])

  const handleEditorScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
    if (viewMode === 'split' && previewRef.current && textareaRef.current && !isSyncingScrollRef.current) {
      isSyncingScrollRef.current = true
      const ta = textareaRef.current, pv = previewRef.current
      const taMax = ta.scrollHeight - ta.clientHeight, pvMax = pv.scrollHeight - pv.clientHeight
      if (taMax > 0 && pvMax > 0) pv.scrollTop = (ta.scrollTop / taMax) * pvMax
      requestAnimationFrame(() => { isSyncingScrollRef.current = false })
    }
  }, [viewMode])

  const handlePreviewScroll = useCallback(() => {
    if (viewMode === 'split' && previewRef.current && textareaRef.current && !isSyncingScrollRef.current) {
      isSyncingScrollRef.current = true
      const ta = textareaRef.current, pv = previewRef.current
      const taMax = ta.scrollHeight - ta.clientHeight, pvMax = pv.scrollHeight - pv.clientHeight
      if (pvMax > 0 && taMax > 0) ta.scrollTop = (pv.scrollTop / pvMax) * taMax
      requestAnimationFrame(() => { isSyncingScrollRef.current = false })
    }
  }, [viewMode])

  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  // ESC 统一关闭：确认弹窗（优先）与导出下拉菜单
  useEffect(() => {
    if (!confirmPermDelete && !showExportMenu) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmPermDelete) {
        setConfirmPermDelete(false)
      } else if (showExportMenu) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [confirmPermDelete, showExportMenu])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width))
      onSetSplitRatio(ratio)
    }
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        const ratio = (() => {
          if (!splitContainerRef.current) return 0.5
          const rect = splitContainerRef.current.getBoundingClientRect()
          // Compute from current state instead of mouse
          return splitRatio
        })()
        onPersistSplitRatio(Math.max(0.2, Math.min(0.8, ratio)))
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onSetSplitRatio, onPersistSplitRatio, splitRatio])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    setDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleExportClick = (fmt: ExportFormat) => {
    setShowExportMenu(false)
    onExport(fmt)
  }

  const showEditor = viewMode === 'split' || viewMode === 'edit'
  const showPreview = viewMode === 'split' || viewMode === 'preview'
  const editorFlex = viewMode === 'split' ? splitRatio : viewMode === 'edit' ? 1 : 0
  const previewFlex = viewMode === 'split' ? (1 - splitRatio) : viewMode === 'preview' ? 1 : 0

  const fileName = isOpenedFile && note.filePath ? note.filePath.split(/[\\/]/).pop() : ''

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '')
    if (!t) return
    if (note.tags.includes(t)) return
    onTagsChange([...note.tags, t])
  }

  const removeTag = (t: string) => {
    onTagsChange(note.tags.filter(x => x !== t))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      if (tagInputValue.trim()) {
        e.preventDefault()
        addTag(tagInputValue)
        setTagInputValue('')
      }
    } else if (e.key === 'Backspace' && !tagInputValue && note.tags.length > 0) {
      removeTag(note.tags[note.tags.length - 1])
    }
  }

  const handleTagBlur = () => {
    if (tagInputValue.trim()) {
      addTag(tagInputValue)
      setTagInputValue('')
    }
  }

  // 编辑器格式化快捷键：Ctrl/Cmd + B/I/E/K (包裹) 与 1/2/3 (行首前缀)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.ctrlKey || e.metaKey
    if (!isMod) return

    const textarea = textareaRef.current
    if (!textarea) return

    const content = note.content
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const wrap = (before: string, after: string, placeholder: string) => {
      e.preventDefault()
      const selectedText = content.substring(start, end)
      const text = selectedText || placeholder
      const newText = before + text + after
      const newContent = content.substring(0, start) + newText + content.substring(end)
      onContentChange(newContent)
      const cursorPos = start + before.length + text.length
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(cursorPos, cursorPos)
        }
      })
    }

    const prefixLine = (prefix: string) => {
      e.preventDefault()
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const lineEnd = content.indexOf('\n', end)
      const actualEnd = lineEnd === -1 ? content.length : lineEnd
      const beforeLine = content.substring(0, lineStart)
      const lineContent = content.substring(lineStart, actualEnd)
      const afterLine = content.substring(actualEnd)
      const newContent = beforeLine + prefix + lineContent + afterLine
      onContentChange(newContent)
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          const newPos = start + prefix.length
          ta.focus()
          ta.setSelectionRange(newPos, newPos)
        }
      })
    }

    switch (e.key.toLowerCase()) {
      case 'b':
        wrap('**', '**', '粗体文字')
        break
      case 'i':
        wrap('*', '*', '斜体文字')
        break
      case 'e':
        wrap('`', '`', '代码')
        break
      case 'k':
        wrap('[', '](https://)', '链接文字')
        break
      case '1':
        prefixLine('# ')
        break
      case '2':
        prefixLine('## ')
        break
      case '3':
        prefixLine('### ')
        break
      default:
        break
    }
  }

  return (
    <div className={`editor${isTrashed ? ' editor-trashed' : ''}`}>
      {isTrashed && (
        <div className="trash-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          <span>此笔记位于回收站中</span>
          {onRestore && (
            <button className="banner-btn restore" onClick={onRestore}>还原笔记</button>
          )}
          {onPermanentDelete && (
            <button className="banner-btn delete-perm" onClick={() => setConfirmPermDelete(true)}>彻底删除</button>
          )}
        </div>
      )}
      <div className="right-head">
        <div className="head-left">
          <button className="head-btn" onClick={onNewNote} title="新建笔记 (Ctrl+Shift+N)">
            <span className="btn-icon">{IconPlus}</span> 新建笔记
          </button>
          <button className="head-btn" onClick={onOpenFile} title="打开文件 (Ctrl+O)">
            <span className="btn-icon">{IconFolder}</span> 打开
          </button>
          {!isTrashed && (
            <button
              className={`head-btn${isOpenedFile ? ' save-to-list-btn' : ''}`}
              onClick={isOpenedFile ? onSaveToNotes : onSave}
              title={isOpenedFile ? '保存到笔记列表 (Ctrl+S)' : '保存笔记 (Ctrl+S)'}
              data-testid="save-btn"
            >
              <span className="btn-icon">{isOpenedFile ? IconSaveToList : IconSaveNote}</span>
              {isOpenedFile ? '保存到笔记' : '保存'}
            </button>
          )}
          <div className="head-sep" />
          <div className="export-wrap" ref={exportMenuRef}>
            <button
              className="head-btn"
              onClick={() => setShowExportMenu(v => !v)}
              title="导出笔记"
              data-testid="export-btn"
            >
              <span className="btn-icon">{IconSave}</span> 导出
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleExportClick('md')}>
                  <span className="menu-ico markdown-ico">MD</span> Markdown (.md)
                </button>
                <button onClick={() => handleExportClick('txt')}>
                  <span className="menu-ico text-ico">TXT</span> 纯文本 (.txt)
                </button>
                <button onClick={() => handleExportClick('docx')}>
                  <span className="menu-ico word-ico">W</span> Word 文档 (.docx)
                </button>
              </div>
            )}
          </div>
          <div className="head-sep" />
          <span className="update-time">{formatTime(note.updated)}</span>
          {saveStatus === 'saved' && <span className="save-ind">已保存</span>}
          {isOpenedFile && fileName && (
            <span className="file-badge" title={note.filePath}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4, flexShrink: 0}}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {fileName}
              {onCloseOpenedFile && (
                <button className="file-badge-close" onClick={onCloseOpenedFile} title="关闭外部文件">{IconClose}</button>
              )}
            </span>
          )}
        </div>
        <div className="head-right">
          {onOpenSearch && (
            <button
              className="head-btn icon-only"
              onClick={onOpenSearch}
              title="全局搜索 (Ctrl+Shift+F)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          )}
          <div className="view-mode-switch">
            {(['split', 'edit', 'preview'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`vm-btn${viewMode === mode ? ' active' : ''}`}
                onClick={() => onSetViewMode(mode)}
                title={VIEW_MODE_ICONS[mode].hint}
              >
                <span className="vm-icon">{MODE_ICONS[mode]}</span>
                <span className="vm-label">{VIEW_MODE_ICONS[mode].label}</span>
              </button>
            ))}
          </div>
          <button
            className="head-btn icon-only theme-btn"
            onClick={onToggleTheme}
            title="切换昼夜主题 (Ctrl+Shift+L)"
            data-testid="theme-toggle"
          >
            {theme === 'light' ? IconMoon : IconSun}
          </button>
        </div>
      </div>

      {showEditor && !isTrashed && (
        <Toolbar
          textareaRef={textareaRef}
          onContentChange={onContentChange}
          content={note.content}
        />
      )}

      <input
        ref={titleRef}
        type="text"
        className={`title${isTrashed ? ' trashed-title' : ''}`}
        placeholder="无标题笔记"
        value={note.title}
        onChange={e => onTitleChange(e.target.value)}
        disabled={isTrashed}
        data-testid="title-input"
      />

      {!isTrashed && (
        <div className="tags-row">
          <span className="tags-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </span>
          <div className="tags-list">
            {note.tags.map(t => (
              <span key={t} className="tag-chip">
                #{t}
                <button className="tag-remove" onClick={() => removeTag(t)} title="移除标签">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </span>
            ))}
            <input
              ref={tagsInputRef}
              className="tag-input"
              type="text"
              value={tagInputValue}
              onChange={e => setTagInputValue(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleTagBlur}
              placeholder={note.tags.length === 0 ? '添加标签，回车或空格确认' : ''}
            />
          </div>
        </div>
      )}

      <div className="editor-split" ref={splitContainerRef}>
        {showEditor && (
          <div className="edit-pane" style={{ flex: editorFlex }}>
            <div className="pane-label">
              <span className="pane-dot" /> Markdown
            </div>
            <div className="textarea-wrap">
              <pre
                ref={highlightRef}
                className="highlight-layer"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
              <textarea
                ref={textareaRef}
                className={`content${isTrashed ? ' content-readonly' : ''}`}
                placeholder="开始用 Markdown 书写你的想法...
工具栏可快速插入标题、列表、代码块、链接、图片等"
                value={note.content}
                onChange={e => onContentChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                onScroll={handleEditorScroll}
                readOnly={isTrashed}
                spellCheck={false}
                data-testid="content-input"
              />
            </div>
          </div>
        )}

        {showEditor && showPreview && (
          <div
            className={`split-divider${dragging ? ' active' : ''}`}
            onMouseDown={handleDividerMouseDown}
            title="拖拽调整宽度"
          >
            <div className="divider-grip" />
          </div>
        )}

        {showPreview && (
          <div className="preview-pane" style={{ flex: previewFlex }}>
            <div className="pane-label">
              <span className="pane-dot preview-dot" /> 预览
            </div>
            <div
              ref={previewRef}
              className="markdown-preview"
              data-testid="markdown-preview"
              onScroll={handlePreviewScroll}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
      {confirmPermDelete && onPermanentDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmPermDelete(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>彻底删除这条笔记？</h4>
            <p>笔记「{note.title || '无标题'}」将被永久删除，无法恢复。</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmPermDelete(false)}>取消</button>
              <button className="btn-danger" onClick={() => { onPermanentDelete(); setConfirmPermDelete(false) }}>彻底删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
