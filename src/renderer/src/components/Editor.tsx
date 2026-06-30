import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { formatTime } from '../utils/formatTime'
import { renderMarkdown } from '../utils/markdown'
import type { Note } from '@shared/types'
import type { SaveState } from '../hooks/useNotes'
import type { ExportFormat, Theme } from '@shared/types'

interface EditorProps {
  note: Note
  saveState: SaveState
  theme: Theme
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onExport: (format: ExportFormat) => void
  onToggleTheme: () => void
}

// 简单的 Markdown 语法高亮：将标记字符包裹为高亮 span
function highlightMarkdown(text: string): string {
  if (!text) return ''
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = text.split('\n')
  return lines
    .map(rawLine => {
      // 代码块标记 ```
      if (/^```/.test(rawLine)) {
        return `<span class="md-code-fence">${esc(rawLine)}</span>`
      }
      // 标题 #
      const h = rawLine.match(/^(#{1,6})\s+(.*)$/)
      if (h) {
        return `<span class="md-hash">${esc(h[1])}</span> ${inlineHighlight(esc(h[2]))}`
      }
      // 引用 >
      if (rawLine.startsWith('>')) {
        const rest = rawLine.slice(1).replace(/^\s/, '')
        return `<span class="md-quote">${esc('>')}</span> ${inlineHighlight(esc(rest))}`
      }
      // 列表项 - 或 * 或 +
      const ul = rawLine.match(/^(\s*)([-*+])(\s+)(.*)$/)
      if (ul) {
        return `${esc(ul[1])}<span class="md-list">${esc(ul[2])}</span>${esc(ul[3])}${inlineHighlight(esc(ul[4]))}`
      }
      // 有序列表 数字.
      const ol = rawLine.match(/^(\s*)(\d+\.)(\s+)(.*)$/)
      if (ol) {
        return `${esc(ol[1])}<span class="md-list">${esc(ol[2])}</span>${esc(ol[3])}${inlineHighlight(esc(ol[4]))}`
      }
      // 分割线
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(rawLine.trim())) {
        return `<span class="md-hr">${esc(rawLine)}</span>`
      }
      return inlineHighlight(esc(rawLine))
    })
    .join('\n')
}

function inlineHighlight(s: string): string {
  // 先解码已转义的内容以便匹配，再做行内高亮
  return s
    // 粗体 **text**
    .replace(/\*\*([^*]+)\*\*/g, '<span class="md-bold">**$1**</span>')
    // 斜体 *text*
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<span class="md-italic">*$2*</span>')
    // 粗体 __text__
    .replace(/__([^_]+)__/g, '<span class="md-bold">__$1__</span>')
    // 斜体 _text_
    .replace(/(^|[^_])_([^_]+)_/g, '$1<span class="md-italic">_$2_</span>')
    // 行内代码 `code`
    .replace(/`([^`]+)`/g, '<span class="md-inline-code">`$1`</span>')
    // 链接 [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="md-link">[</span>$1<span class="md-link">]($2)</span>')
    // 图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="md-image">![$1]($2)</span>')
}

export default function Editor({
  note,
  saveState,
  theme,
  onTitleChange,
  onContentChange,
  onExport,
  onToggleTheme
}: EditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const highlightedContent = useMemo(
    () => highlightMarkdown(note.content),
    [note.content]
  )

  const previewHtml = useMemo(
    () => renderMarkdown(note.content),
    [note.content]
  )

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [note.id])

  // 同步滚动
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // 点击外部关闭导出菜单
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  const saveText =
    saveState === 'saving' ? '保存中...' :
    saveState === 'saved' ? '已保存' : ''

  const handleExport = (fmt: ExportFormat) => {
    setShowExportMenu(false)
    onExport(fmt)
  }

  return (
    <div className="editor">
      <div className="right-head">
        <div className="head-left">
          <span className="update-time">最后更新: {formatTime(note.updated)}</span>
          <span className={`save-ind${saveState === 'saving' ? ' saving' : ''}`}>
            {saveText}
          </span>
        </div>
        <div className="head-right">
          <div className="export-wrap" ref={exportMenuRef}>
            <button
              className="icon-btn"
              onClick={() => setShowExportMenu(v => !v)}
              title="导出笔记"
              data-testid="export-btn"
            >
              导出 ▾
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleExport('md')}>Markdown (.md)</button>
                <button onClick={() => handleExport('txt')}>纯文本 (.txt)</button>
                <button onClick={() => handleExport('docx')}>Word 文档 (.docx)</button>
              </div>
            )}
          </div>
          <button
            className="icon-btn theme-toggle-btn"
            onClick={onToggleTheme}
            title="切换昼夜主题 (Ctrl+Shift+L)"
            data-testid="theme-toggle"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
      <input
        ref={titleRef}
        type="text"
        className="title"
        placeholder="笔记标题"
        value={note.title}
        onChange={e => onTitleChange(e.target.value)}
        data-testid="title-input"
      />
      <div className="editor-split">
        <div className="edit-pane">
          <div className="pane-label">编辑</div>
          <div className="textarea-wrap">
            <pre
              ref={highlightRef}
              className="highlight-layer"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
            <textarea
              ref={textareaRef}
              className="content"
              placeholder="开始写点什么... (支持 Markdown 语法)"
              value={note.content}
              onChange={e => onContentChange(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              data-testid="content-input"
            />
          </div>
        </div>
        <div className="preview-pane">
          <div className="pane-label">预览</div>
          <div
            className="markdown-preview"
            data-testid="markdown-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  )
}
