import { useRef } from 'react'

export interface ToolbarAction {
  id: string
  label: string
  title: string
  icon: React.ReactNode
  group: number
  wrap?: { before: string; after: string; placeholder?: string }
  prefix?: string
  suffix?: string
  block?: string
}

// SVG icons
const IconImage = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const IconLink = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

export const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: 'h1', label: 'H1', title: '一级标题 (Ctrl+1)', icon: 'H1', group: 1, prefix: '# ' },
  { id: 'h2', label: 'H2', title: '二级标题 (Ctrl+2)', icon: 'H2', group: 1, prefix: '## ' },
  { id: 'h3', label: 'H3', title: '三级标题 (Ctrl+3)', icon: 'H3', group: 1, prefix: '### ' },
  { id: 'bold', label: 'B', title: '加粗 (Ctrl+B)', icon: <b>B</b>, group: 2, wrap: { before: '**', after: '**', placeholder: '粗体文字' } },
  { id: 'italic', label: 'I', title: '斜体 (Ctrl+I)', icon: <i>I</i>, group: 2, wrap: { before: '*', after: '*', placeholder: '斜体文字' } },
  { id: 'code', label: '</>', title: '行内代码 (Ctrl+E)', icon: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{'</>'}</span>, group: 2, wrap: { before: '`', after: '`', placeholder: '代码' } },
  { id: 'ul', label: '•', title: '无序列表', icon: '•', group: 3, prefix: '- ' },
  { id: 'ol', label: '1.', title: '有序列表', icon: '1.', group: 3, prefix: '1. ' },
  { id: 'quote', label: '❝', title: '引用块', icon: <span style={{ fontSize: '14px' }}>❝</span>, group: 3, prefix: '> ' },
  { id: 'task', label: '☐', title: '任务列表', icon: '☐', group: 3, prefix: '- [ ] ' },
  { id: 'codeblock', label: '{ }', title: '代码块', icon: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{'{ }'}</span>, group: 4, block: '```\n```' },
  { id: 'hr', label: '—', title: '分割线', icon: '—', group: 4, block: '\n---\n' },
  { id: 'link', label: '链接', title: '插入链接', icon: IconLink, group: 5, wrap: { before: '[', after: '](https://)', placeholder: '链接文字' } },
  { id: 'image', label: '图片', title: '插入图片', icon: IconImage, group: 5, wrap: { before: '![', after: '](https://)', placeholder: '图片描述' } }
]

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onContentChange: (v: string) => void
  content: string
}

export default function Toolbar({ textareaRef, onContentChange, content }: ToolbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const insertAtCursor = (action: ToolbarAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let newText = ''
    let cursorPos = 0

    if (action.wrap) {
      const text = selectedText || action.wrap.placeholder || ''
      newText = action.wrap.before + text + action.wrap.after
      cursorPos = start + action.wrap.before.length + text.length
    } else if (action.prefix) {
      const prefix = action.prefix
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
      return
    } else if (action.block) {
      newText = action.block
      cursorPos = start + newText.indexOf('\n') + 1
      if (start > 0 && content[start - 1] !== '\n') {
        newText = '\n' + newText
        cursorPos += 1
      }
    }

    const newContent = content.substring(0, start) + newText + content.substring(end)
    onContentChange(newContent)

    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(cursorPos, cursorPos)
      }
    })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault()
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  const groups: ToolbarAction[][] = []
  let currentGroup = -1
  TOOLBAR_ACTIONS.forEach(a => {
    if (a.group !== currentGroup) {
      currentGroup = a.group
      groups.push([])
    }
    groups[groups.length - 1].push(a)
  })

  return (
    <div className="toolbar" ref={scrollRef} onWheel={handleWheel}>
      {groups.map((group, gi) => (
        <div key={gi} className="toolbar-group">
          {group.map(action => (
            <button
              key={action.id}
              className="toolbar-btn"
              title={action.title}
              onClick={() => insertAtCursor(action)}
              data-action={action.id}
            >
              {action.icon}
            </button>
          ))}
          {gi < groups.length - 1 && <div className="toolbar-divider" />}
        </div>
      ))}
    </div>
  )
}
