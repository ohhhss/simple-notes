import CategoryTree from './CategoryTree'
import TrashBin from './TrashBin'
import type { Note, Category } from '../../../shared/types'

type SidebarView = 'notes' | 'trash'

interface SidebarProps {
  view: SidebarView
  onChangeView: (v: SidebarView) => void
  searchKeyword: string
  onSearchKeywordChange: (v: string) => void
  onOpenGlobalSearch: () => void
  onAddNote: () => void
  categories: Category[]
  notes: Note[]
  activeNotes: Note[]
  trashedNotes: Note[]
  currentNoteId: string | null
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string) => void
  onToggleCategory: (id: string) => void
  onAddNoteToCategory: (categoryId: string) => void
  onAddCategory: () => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
  onMoveNote: (noteId: string, categoryId: string) => void
  onOpenFile: () => void
  onRestoreNote: (id: string) => void
  onPermanentlyDeleteNote: (id: string) => void
  onEmptyTrash: () => void
}

export default function Sidebar(props: SidebarProps) {
  const {
    view, onChangeView,
    searchKeyword, onSearchKeywordChange, onOpenGlobalSearch,
    onAddNote,
    categories, activeNotes, trashedNotes, currentNoteId,
    onSelectNote, onDeleteNote,
    onToggleCategory, onAddNoteToCategory, onAddCategory,
    onRenameCategory, onDeleteCategory, onMoveNote,
    onOpenFile,
    onRestoreNote, onPermanentlyDeleteNote, onEmptyTrash
  } = props

  return (
    <div className="left">
      <div className="left-head">
        <h2>简单笔记</h2>
        <div className="head-actions">
          <button className="icon-btn" onClick={onOpenFile} title="打开文件 (Ctrl+O)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button className="add-btn" onClick={onAddNote} title="新建笔记 (Ctrl+N)">+ 新建</button>
        </div>
      </div>
      <div className="search">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder={view === 'trash' ? '在回收站中搜索...' : '搜索笔记...'}
          value={searchKeyword}
          onChange={e => onSearchKeywordChange(e.target.value)}
          onFocus={onOpenGlobalSearch}
          data-testid="search-input"
        />
        <button
          className="search-global-btn"
          onClick={onOpenGlobalSearch}
          title="全局搜索 (Ctrl+Shift+F)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
          </svg>
        </button>
      </div>
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${view === 'notes' ? ' active' : ''}`}
          onClick={() => onChangeView('notes')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          笔记 <span className="tab-count">{activeNotes.length}</span>
        </button>
        <button
          className={`sidebar-tab${view === 'trash' ? ' active' : ''}`}
          onClick={() => onChangeView('trash')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
          </svg>
          回收站{trashedNotes.length > 0 && <span className="tab-count danger">{trashedNotes.length}</span>}
        </button>
      </div>

      {view === 'notes' ? (
        <CategoryTree
          categories={categories}
          notes={activeNotes}
          currentNoteId={currentNoteId}
          searchKeyword={searchKeyword}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
          onToggleCategory={onToggleCategory}
          onAddNote={onAddNoteToCategory}
          onAddCategory={onAddCategory}
          onRenameCategory={onRenameCategory}
          onDeleteCategory={onDeleteCategory}
          onMoveNote={onMoveNote}
        />
      ) : (
        <TrashBin
          trashedNotes={searchKeyword.trim()
            ? trashedNotes.filter(n =>
                n.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                n.content.toLowerCase().includes(searchKeyword.toLowerCase())
              )
            : trashedNotes}
          categories={categories}
          onRestore={onRestoreNote}
          onPermanentlyDelete={onPermanentlyDeleteNote}
          onEmptyTrash={onEmptyTrash}
          onClose={() => onChangeView('notes')}
          onSelectNote={onSelectNote}
        />
      )}
    </div>
  )
}
