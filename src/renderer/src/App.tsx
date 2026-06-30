import Sidebar from './components/Sidebar'
import NoteItem from './components/NoteItem'
import Editor from './components/Editor'
import TestPanel from './components/TestPanel'
import { useNotes } from './hooks/useNotes'
import { useTheme } from './hooks/useTheme'
import { useEffect, useCallback } from 'react'
import type { ExportFormat } from '@shared/types'

export default function App() {
  const {
    notes,
    filteredNotes,
    currentNote,
    searchKeyword,
    setSearchKeyword,
    saveState,
    loaded,
    addNote,
    deleteNote,
    updateCurrentNote,
    selectNote,
    reloadNotes
  } = useNotes()

  const { theme, toggleTheme, themeLoaded } = useTheme()

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!currentNote) return
    await window.notesAPI.exportNote(currentNote.title || '无标题', currentNote.content, format)
  }, [currentNote])

  // 菜单主题切换事件
  useEffect(() => {
    if (!themeLoaded) return
    const cleanup = window.notesAPI.onMenuToggleTheme(() => toggleTheme())
    return cleanup
  }, [toggleTheme, themeLoaded])

  // 菜单导出事件
  useEffect(() => {
    const cleanup = window.notesAPI.onMenuExport((format: ExportFormat) => {
      handleExport(format)
    })
    return cleanup
  }, [handleExport])

  if (!loaded || !themeLoaded) {
    return <div className="welcome">加载中...</div>
  }

  return (
    <div className="container">
      <Sidebar
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        onAddNote={addNote}
      >
        {filteredNotes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            active={note.id === currentNote?.id}
            onSelect={selectNote}
            onDelete={deleteNote}
          />
        ))}
      </Sidebar>
      <div className="right">
        {!currentNote ? (
          <div className="welcome" data-testid="welcome">
            <img src="/logo.svg" alt="简单笔记" className="welcome-logo" />
            <h1>简单笔记</h1>
            <p>选择一条笔记或点击新建开始记录</p>
            <p className="welcome-tip">支持 Markdown 实时预览 · 昼夜主题 · 多格式导出</p>
          </div>
        ) : (
          <Editor
            note={currentNote}
            saveState={saveState}
            theme={theme}
            onTitleChange={v => updateCurrentNote({ title: v || '无标题' })}
            onContentChange={v => updateCurrentNote({ content: v })}
            onExport={handleExport}
            onToggleTheme={toggleTheme}
          />
        )}
      </div>
      <div className="tip">快捷键: Ctrl+N 新建 | Ctrl+S 保存 | Ctrl+Shift+L 切换主题</div>
      <TestPanel
        notes={notes}
        addNote={addNote}
        deleteNote={deleteNote}
        selectNote={selectNote}
        reloadNotes={reloadNotes}
      />
    </div>
  )
}
