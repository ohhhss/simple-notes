import { useState, useEffect, useCallback, useRef } from 'react'
import type { Note } from '@shared/types'
import { uid } from '../utils/formatTime'

const DEFAULT_NOTES: Note[] = [
  {
    id: uid(),
    title: '欢迎使用简单笔记',
    content: `# 欢迎使用简单笔记！

这是一个支持 **Markdown** 的轻量级本地笔记应用。

## 功能特点

- 实时 Markdown 预览
- 编辑区语法高亮
- 昼夜主题一键切换
- 多格式导出（Markdown / 纯文本 / Word）
- 自动保存、本地存储
- 全文搜索

## Markdown 语法示例

### 代码块

\`\`\`javascript
function hello() {
  console.log('Hello, Simple Notes!')
}
\`\`\`

### 列表

- 无序列表项 1
- 无序列表项 2
- 无序列表项 3

1. 有序列表项 1
2. 有序列表项 2
3. 有序列表项 3

### 引用

> 这是一段引用文本。
> 可以用于摘录重要内容。

### 链接与图片

[访问 GitHub](https://github.com)

### 表格

| 功能 | 快捷键 |
| --- | --- |
| 新建笔记 | Ctrl+N |
| 保存 | Ctrl+S |
| 切换主题 | Ctrl+Shift+L |

### 分割线

---

*开始记录你的想法吧！*
`,
    created: Date.now(),
    updated: Date.now()
  }
]

export type SaveState = 'idle' | 'saving' | 'saved'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 初始化加载
  useEffect(() => {
    ;(async () => {
      let loadedNotes = await window.notesAPI.loadNotes()
      if (!loadedNotes || loadedNotes.length === 0) {
        loadedNotes = DEFAULT_NOTES
        await window.notesAPI.saveNotes(loadedNotes)
      }
      setNotes(loadedNotes)
      setLoaded(true)
    })()
  }, [])

  const persistNotes = useCallback(async (newNotes: Note[]) => {
    try {
      await window.notesAPI.saveNotes(newNotes)
    } catch (e) {
      console.error('保存笔记失败', e)
    }
  }, [])

  const scheduleAutoSave = useCallback((updatedNotes: Note[]) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      await persistNotes(updatedNotes)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    }, 400)
  }, [persistNotes])

  const addNote = useCallback(() => {
    const newNote: Note = {
      id: uid(),
      title: '',
      content: '',
      created: Date.now(),
      updated: Date.now()
    }
    setNotes(prev => {
      const next = [newNote, ...prev]
      scheduleAutoSave(next)
      return next
    })
    setCurrentId(newNote.id)
    return newNote.id
  }, [scheduleAutoSave])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      persistNotes(next)
      return next
    })
    if (currentId === id) {
      setCurrentId(null)
    }
  }, [currentId, persistNotes])

  const updateCurrentNote = useCallback((patch: { title?: string; content?: string }) => {
    if (!currentId) return
    setNotes(prev => {
      const next = prev.map(n =>
        n.id === currentId
          ? { ...n, ...patch, updated: Date.now() }
          : n
      )
      scheduleAutoSave(next)
      return next
    })
  }, [currentId, scheduleAutoSave])

  const forceSave = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await persistNotes(notes)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1500)
  }, [notes, persistNotes])

  const selectNote = useCallback((id: string | null) => {
    setCurrentId(id)
  }, [])

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        addNote()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        forceSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addNote, forceSave])

  // 菜单新建笔记事件
  useEffect(() => {
    const cleanup = window.notesAPI.onMenuNewNote(() => addNote())
    return cleanup
  }, [addNote])

  // 重新加载笔记（供测试使用）
  const reloadNotes = useCallback(async () => {
    const loadedNotes = await window.notesAPI.loadNotes()
    setNotes(loadedNotes)
  }, [])

  // 过滤并排序笔记
  const filteredNotes = notes
    .filter(n => {
      const kw = searchKeyword.toLowerCase().trim()
      if (!kw) return true
      return n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw)
    })
    .sort((a, b) => b.updated - a.updated)

  const currentNote = notes.find(n => n.id === currentId) ?? null

  return {
    notes,
    filteredNotes,
    currentNote,
    currentId,
    searchKeyword,
    setSearchKeyword,
    saveState,
    loaded,
    addNote,
    deleteNote,
    updateCurrentNote,
    selectNote,
    forceSave,
    reloadNotes,
    setNotes
  }
}
