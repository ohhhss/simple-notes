import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import SearchPanel from './components/SearchPanel'
import { useNotes } from './hooks/useNotes'
import { useTheme } from './hooks/useTheme'
import { useViewLayout } from './hooks/useViewLayout'
import { useEffect, useCallback, useState, useRef } from 'react'
import type { ExportFormat, OpenedFile, AppData } from '@shared/types'
import { DEFAULT_CATEGORY_ID } from '@shared/types'

type SidebarView = 'notes' | 'trash'

export default function App() {
  const {
    notes, categories, currentNoteId, currentNote, loaded,
    activeNotes, trashedNotes, allTags,
    setCurrentNoteId,
    addNote, updateNote, setNoteTags, deleteNote, restoreNote, permanentlyDeleteNote, emptyTrash,
    addCategory, deleteCategory, renameCategory, toggleCategory, setNoteCategory,
    reloadFromData,
    persistNow
  } = useNotes()

  const { theme, toggleTheme, themeLoaded } = useTheme()
  const { viewMode, splitRatio, setViewMode, setSplitRatio, persistSplitRatio } = useViewLayout()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [sidebarView, setSidebarView] = useState<SidebarView>('notes')
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [openedFile, setOpenedFile] = useState<OpenedFile | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const dragCounterRef = useRef(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

  // Determine active note (opened file or current)
  const activeNote = openedFile
    ? {
        id: '__opened__',
        title: openedFile.title,
        content: openedFile.content,
        tags: [] as string[],
        created: Date.now(),
        updated: Date.now(),
        categoryId: DEFAULT_CATEGORY_ID,
        filePath: openedFile.filePath
      }
    : currentNote

  const isTrashedView = !openedFile && !!activeNote?.deletedAt

  const handleOpenFile = useCallback(async () => {
    const file = await window.notesAPI.openFile()
    if (file) {
      setOpenedFile(file)
      setSidebarView('notes')
      setGlobalSearchOpen(false)
    }
  }, [])

  const handleNewNote = useCallback(() => {
    setOpenedFile(null)
    addNote(DEFAULT_CATEGORY_ID)
    setSidebarView('notes')
  }, [addNote])

  const handleAddNoteToCategory = useCallback((categoryId: string) => {
    setOpenedFile(null)
    addNote(categoryId)
  }, [addNote])

  const handleSelectNote = useCallback((id: string) => {
    setOpenedFile(null)
    setCurrentNoteId(id)
    // Auto switch sidebar view to trash if selecting a trashed note
    const target = notes.find(n => n.id === id)
    if (target?.deletedAt) setSidebarView('trash')
  }, [setCurrentNoteId, notes])

  const handleDeleteNote = useCallback((id: string) => {
    // Check if note is in trash - then permanent delete with confirm; else soft delete
    const n = notes.find(x => x.id === id)
    if (n?.deletedAt) {
      setConfirmDeleteId(id)
    } else {
      deleteNote(id)
      setSidebarView('notes')
    }
  }, [notes, deleteNote])

  const handleConfirmPermanentDelete = useCallback(() => {
    if (confirmDeleteId) {
      permanentlyDeleteNote(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }, [confirmDeleteId, permanentlyDeleteNote])

  const handleRestore = useCallback((id: string) => {
    restoreNote(id)
    setSidebarView('notes')
  }, [restoreNote])

  const handlePermanentDelete = useCallback((id: string) => {
    permanentlyDeleteNote(id)
  }, [permanentlyDeleteNote])

  const handleExport = useCallback(async (format: ExportFormat) => {
    const note = activeNote
    if (!note) return
    const defaultPath = openedFile?.filePath
      ? openedFile.filePath.replace(/\.[^.]+$/, '.' + format)
      : undefined
    const success = await window.notesAPI.exportNote(note.title || '无标题', note.content, format, defaultPath)
    if (success) {
      window.notesAPI.showNotification('导出成功', `笔记已导出为 ${format.toUpperCase()} 文件`)
    }
  }, [activeNote, openedFile])

  const handleSaveToNotes = useCallback(() => {
    if (!openedFile) return
    const newNote = addNote(DEFAULT_CATEGORY_ID)
    updateNote(newNote.id, {
      title: openedFile.title || '无标题',
      content: openedFile.content
    })
    setOpenedFile(null)
    setSidebarView('notes')
    setSaveStatus('saved')
    window.notesAPI.showNotification('保存成功', `笔记「${openedFile.title || '无标题'}」已保存到笔记列表`)
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [openedFile, addNote, updateNote])

  const handleSave = useCallback(() => {
    if (openedFile) {
      handleSaveToNotes()
      return
    }
    if (currentNoteId) {
      persistNow()
      setSaveStatus('saved')
      window.notesAPI.showNotification('保存成功', '笔记已保存')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [openedFile, currentNoteId, persistNow, handleSaveToNotes])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    dragCounterRef.current = 0
    const files = Array.from(e.dataTransfer.files)
    const supported = files.filter(f => /\.(md|txt|docx)$/i.test(f.name))
    if (supported.length === 0) return
    const file = supported[0]
    const ext = file.name.match(/\.(\w+)$/i)?.[1].toLowerCase()
    if (ext === 'md' || ext === 'txt') {
      try {
        const content = await file.text()
        const title = file.name.replace(/\.[^.]+$/, '')
        const filePath = (file as File & { path?: string }).path || file.name
        setOpenedFile({ title, content, filePath, format: ext as ExportFormat })
        setSidebarView('notes')
        setGlobalSearchOpen(false)
      } catch {
        // ignore read errors
      }
    } else if (ext === 'docx') {
      const filePath = (file as File & { path?: string }).path
      if (filePath) {
        const opened = await window.notesAPI.openFileByPath(filePath)
        if (opened) {
          setOpenedFile(opened)
          setSidebarView('notes')
          setGlobalSearchOpen(false)
        }
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const hasFiles = e.dataTransfer.types.includes('Files')
    if (hasFiles) {
      dragCounterRef.current++
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setDragOver(false)
    }
  }, [])

  const handleExportConfig = useCallback(async () => {
    const success = await window.notesAPI.exportConfig()
    if (success) {
      window.notesAPI.showNotification('备份成功', '笔记数据已导出为 JSON 文件')
    }
  }, [])

  const handleImportConfig = useCallback(async () => {
    const data = await window.notesAPI.importConfig()
    if (data) {
      reloadFromData(data)
      window.notesAPI.showNotification('导入成功', `已恢复 ${data.notes.length} 条笔记`)
    }
  }, [reloadFromData])

  const handleTitleChange = useCallback((v: string) => {
    if (openedFile) {
      setOpenedFile(prev => prev ? { ...prev, title: v || '无标题' } : null)
    } else if (currentNoteId) {
      updateNote(currentNoteId, { title: v || '无标题' })
    }
  }, [openedFile, currentNoteId, updateNote])

  const handleContentChange = useCallback((v: string) => {
    if (openedFile) {
      setOpenedFile(prev => prev ? { ...prev, content: v } : null)
    } else if (currentNoteId) {
      updateNote(currentNoteId, { content: v })
    }
  }, [openedFile, currentNoteId, updateNote])

  const handleTagsChange = useCallback((tags: string[]) => {
    if (currentNoteId && !openedFile) {
      setNoteTags(currentNoteId, tags)
    }
  }, [currentNoteId, openedFile, setNoteTags])

  const handleCloseOpenedFile = useCallback(() => {
    setOpenedFile(null)
  }, [])

  const handleOpenGlobalSearch = useCallback(() => {
    setGlobalSearchOpen(true)
  }, [])

  const handleSelectFromSearch = useCallback((id: string) => {
    setOpenedFile(null)
    setCurrentNoteId(id)
    const target = notes.find(n => n.id === id)
    if (target?.deletedAt) setSidebarView('trash')
    else setSidebarView('notes')
  }, [setCurrentNoteId, notes])

  // Register menu event listeners
  useEffect(() => {
    if (!themeLoaded || !loaded) return
    const unsubs = [
      window.notesAPI.onMenuNewNote(handleNewNote),
      window.notesAPI.onMenuOpenFile(handleOpenFile),
      window.notesAPI.onMenuSave(handleSave),
      window.notesAPI.onMenuToggleTheme(() => toggleTheme()),
      window.notesAPI.onMenuExport((fmt: ExportFormat) => handleExport(fmt)),
      window.notesAPI.onMenuViewMode((mode) => setViewMode(mode)),
      window.notesAPI.onMenuSearch(() => setGlobalSearchOpen(true)),
      window.notesAPI.onMenuExportConfig(handleExportConfig),
      window.notesAPI.onMenuImportConfig(handleImportConfig)
    ]
    return () => unsubs.forEach(u => u())
  }, [themeLoaded, loaded, handleNewNote, handleOpenFile, handleSave, toggleTheme, handleExport, setViewMode, handleExportConfig, handleImportConfig])

  // Ctrl+F should open global search (when not in input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        setGlobalSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!loaded || !themeLoaded) {
    return <div className="welcome">加载中...</div>
  }

  return (
    <div
      className="container"
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>松开以打开文件</p>
            <span>支持 .md / .txt / .docx</span>
          </div>
        </div>
      )}
      <Sidebar
        view={sidebarView}
        onChangeView={setSidebarView}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        onOpenGlobalSearch={handleOpenGlobalSearch}
        onAddNote={handleNewNote}
        onOpenFile={handleOpenFile}
        categories={categories}
        notes={notes}
        activeNotes={activeNotes}
        trashedNotes={trashedNotes}
        currentNoteId={openedFile ? '__opened__' : currentNoteId}
        onSelectNote={handleSelectNote}
        onDeleteNote={handleDeleteNote}
        onToggleCategory={toggleCategory}
        onAddNoteToCategory={handleAddNoteToCategory}
        onAddCategory={() => { addCategory() }}
        onRenameCategory={renameCategory}
        onDeleteCategory={deleteCategory}
        onMoveNote={setNoteCategory}
        onRestoreNote={handleRestore}
        onPermanentlyDeleteNote={handlePermanentDelete}
        onEmptyTrash={emptyTrash}
      />
      <div className="right">
        {!activeNote ? (
          <div className="welcome" data-testid="welcome">
            <h1>简单笔记</h1>
            <p>点击左侧分类旁的 + 新建笔记，或使用「打开」按钮导入文件</p>
            <div className="welcome-actions">
              <button className="welcome-btn primary" onClick={handleNewNote}>＋ 新建笔记</button>
              <button className="welcome-btn" onClick={handleOpenFile}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                打开文件
              </button>
              <button className="welcome-btn" onClick={handleOpenGlobalSearch}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginRight: 6}}>
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                搜索笔记
              </button>
            </div>
            <p className="welcome-tip">Markdown 实时预览 · 可拖拽分栏 · 目录分类 · 标签管理 · 回收站 · 全局搜索 · md/txt/docx 导入导出 · 手动保存与自动保存</p>
          </div>
        ) : (
          <Editor
            note={activeNote}
            theme={theme}
            viewMode={viewMode}
            splitRatio={splitRatio}
            isOpenedFile={!!openedFile}
            isTrashed={isTrashedView}
            saveStatus={saveStatus}
            onCloseOpenedFile={handleCloseOpenedFile}
            onSave={handleSave}
            onSaveToNotes={handleSaveToNotes}
            onRestore={isTrashedView && currentNoteId ? () => handleRestore(currentNoteId) : undefined}
            onPermanentDelete={isTrashedView && currentNoteId ? () => handlePermanentDelete(currentNoteId) : undefined}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            onTagsChange={handleTagsChange}
            onExport={handleExport}
            onToggleTheme={toggleTheme}
            onSetViewMode={setViewMode}
            onSetSplitRatio={setSplitRatio}
            onPersistSplitRatio={persistSplitRatio}
            onOpenFile={handleOpenFile}
            onNewNote={handleNewNote}
            onOpenSearch={handleOpenGlobalSearch}
          />
        )}
      </div>
      {globalSearchOpen && (
        <SearchPanel
          notes={notes}
          categories={categories}
          allTags={allTags}
          onSelectNote={handleSelectFromSearch}
          onClose={() => setGlobalSearchOpen(false)}
          initialQuery={searchKeyword}
        />
      )}
      <div className="tip">Ctrl+N 新建 · Ctrl+O 打开 · Ctrl+S 保存 · Ctrl+Shift+F 搜索 · 拖拽中间分隔条调整布局 · 删除的笔记在回收站保留30天 · 拖拽文件到窗口可直接打开 · 外部文件可保存到笔记列表</div>
      {confirmDeleteId && (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>彻底删除这条笔记？</h4>
            <p>笔记「{notes.find(n => n.id === confirmDeleteId)?.title || '无标题'}」将被永久删除，无法恢复。</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmDeleteId(null)}>取消</button>
              <button className="btn-danger" onClick={handleConfirmPermanentDelete}>彻底删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
