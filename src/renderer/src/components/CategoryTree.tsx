import { useState, useRef, useEffect } from 'react'
import type { Note, Category } from '../../../shared/types'
import { DEFAULT_CATEGORY_ID } from '../../../shared/types'
import { formatTime } from '../utils/formatTime'
import NoteItem from './NoteItem'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'

interface CategoryTreeProps {
  categories: Category[]
  notes: Note[]
  currentNoteId: string | null
  searchKeyword: string
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string) => void
  onToggleCategory: (id: string) => void
  onAddNote: (categoryId: string) => void
  onAddCategory: () => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
  onMoveNote: (noteId: string, categoryId: string) => void
}

interface CategoryHeaderProps {
  category: Category
  noteCount: number
  isActive: boolean
  onToggle: () => void
  onAddNote: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  renameTrigger?: number
}

function CategoryHeader({ category, noteCount, onToggle, onAddNote, onRename, onDelete, onContextMenu, renameTrigger }: CategoryHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(category.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isDefault = category.id === DEFAULT_CATEGORY_ID

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (renameTrigger !== undefined && renameTrigger > 0) {
      setEditing(true)
    }
  }, [renameTrigger])

  const commitRename = () => {
    setEditing(false)
    if (nameValue.trim() && nameValue !== category.name) {
      onRename(nameValue)
    } else {
      setNameValue(category.name)
    }
  }

  return (
    <div className="category-header" onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e) } : undefined}>
      <button className="category-toggle" onClick={onToggle} title={category.collapsed ? '展开' : '折叠'}>
        <svg
          width="10" height="10" viewBox="0 0 10 10"
          style={{ transform: category.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }}
        >
          <path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {editing ? (
        <input
          ref={inputRef}
          className="category-rename-input"
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); setNameValue(category.name) }
          }}
        />
      ) : (
        <span
          className="category-name"
          onDoubleClick={() => { if (!isDefault) setEditing(true) }}
          title={isDefault ? category.name : '双击重命名'}
        >
          {category.name}
        </span>
      )}
      <span className="category-count">{noteCount}</span>
      <div className="category-actions" ref={menuRef}>
        <button className="category-action-btn" onClick={onAddNote} title="在此分类新建笔记">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        {!isDefault && (
          <button className="category-action-btn category-menu-btn" onClick={() => setMenuOpen(o => !o)} title="更多">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        )}
        {menuOpen && (
          <div className="category-menu">
            <button className="category-menu-item" onClick={() => { setEditing(true); setMenuOpen(false) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              重命名
            </button>
            <button className="category-menu-item danger" onClick={() => { onDelete(); setMenuOpen(false) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              删除分类
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CategoryTree(props: CategoryTreeProps) {
  const {
    categories, notes, currentNoteId, searchKeyword,
    onSelectNote, onDeleteNote, onToggleCategory,
    onAddNote, onAddCategory, onRenameCategory, onDeleteCategory, onMoveNote
  } = props

  const [dragOverCat, setDragOverCat] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [catContextMenu, setCatContextMenu] = useState<{ x: number; y: number; catId: string } | null>(null)
  const [renameTrigger, setRenameTrigger] = useState<{ catId: string; nonce: number } | null>(null)

  // Group notes by category, sort by updated desc within each category
  const notesByCat = new Map<string, Note[]>()
  for (const cat of categories) notesByCat.set(cat.id, [])
  for (const note of notes) {
    const cid = note.categoryId && categories.find(c => c.id === note.categoryId) ? note.categoryId : DEFAULT_CATEGORY_ID
    if (!notesByCat.has(cid)) notesByCat.set(cid, [])
    notesByCat.get(cid)!.push(note)
  }
  for (const [, list] of notesByCat) {
    list.sort((a, b) => b.updated - a.updated)
  }

  // When searching, filter notes across all categories and show flat results
  const isSearching = searchKeyword.trim().length > 0
  const keyword = searchKeyword.toLowerCase()
  const filteredNotes = isSearching
    ? notes.filter(n => n.title.toLowerCase().includes(keyword) || n.content.toLowerCase().includes(keyword))
    : []

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/note-id', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCat(catId)
  }

  const handleDrop = (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData('text/note-id')
    if (noteId && noteId) {
      onMoveNote(noteId, catId)
    }
    setDragOverCat(null)
  }

  const handleNoteContextMenu = (e: React.MouseEvent, noteId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, noteId })
  }

  const handleCatContextMenu = (e: React.MouseEvent, catId: string) => {
    setCatContextMenu({ x: e.clientX, y: e.clientY, catId })
  }

  const renderNoteContextMenu = () => {
    if (!contextMenu) return null
    const note = notes.find(n => n.id === contextMenu.noteId)
    if (!note) return null

    const moveItems: ContextMenuItem[] = categories
      .filter(c => c.id !== note.categoryId)
      .map<ContextMenuItem>(c => ({
        label: `移动到 ${c.name}`,
        onClick: () => onMoveNote(note.id, c.id),
      }))

    const items: ContextMenuItem[] = [
      { label: '打开笔记', onClick: () => onSelectNote(note.id) },
      ...(moveItems.length > 0
        ? [{ label: '', separator: true } as ContextMenuItem, ...moveItems]
        : []),
      { label: '', separator: true },
      { label: '删除笔记', danger: true, onClick: () => onDeleteNote(note.id) },
      { label: '', separator: true },
      { label: '复制标题', onClick: () => navigator.clipboard.writeText(note.title || '无标题') },
    ]

    return (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        items={items}
        onClose={() => setContextMenu(null)}
      />
    )
  }

  const renderCatContextMenu = () => {
    if (!catContextMenu) return null
    const cat = categories.find(c => c.id === catContextMenu.catId)
    if (!cat) return null
    const isDefault = cat.id === DEFAULT_CATEGORY_ID

    const items: ContextMenuItem[] = [
      { label: '新建笔记', onClick: () => onAddNote(cat.id) },
      {
        label: '重命名',
        disabled: isDefault,
        onClick: () => setRenameTrigger({ catId: cat.id, nonce: Date.now() }),
      },
      {
        label: '删除分类',
        danger: true,
        disabled: isDefault,
        onClick: () => onDeleteCategory(cat.id),
      },
    ]

    return (
      <ContextMenu
        x={catContextMenu.x}
        y={catContextMenu.y}
        items={items}
        onClose={() => setCatContextMenu(null)}
      />
    )
  }

  if (isSearching) {
    return (
      <>
        <div className="note-list">
          {filteredNotes.length === 0 ? (
            <div className="empty-hint">未找到相关笔记</div>
          ) : (
            <>
              <div className="search-result-hint">找到 {filteredNotes.length} 条相关笔记</div>
              {filteredNotes.map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  active={note.id === currentNoteId}
                  onClick={() => onSelectNote(note.id)}
                  onDelete={() => onDeleteNote(note.id)}
                  formatTime={formatTime}
                  onContextMenu={handleNoteContextMenu}
                />
              ))}
            </>
          )}
        </div>
        {renderNoteContextMenu()}
      </>
    )
  }

  return (
    <div className="note-list category-tree">
      {categories.map(cat => {
        const catNotes = notesByCat.get(cat.id) || []
        const isDragOver = dragOverCat === cat.id
        return (
          <div
            key={cat.id}
            className={`category-group ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, cat.id)}
            onDragLeave={() => setDragOverCat(null)}
            onDrop={e => handleDrop(e, cat.id)}
          >
            <CategoryHeader
              category={cat}
              noteCount={catNotes.length}
              isActive={false}
              onToggle={() => onToggleCategory(cat.id)}
              onAddNote={() => onAddNote(cat.id)}
              onRename={name => onRenameCategory(cat.id, name)}
              onDelete={() => onDeleteCategory(cat.id)}
              onContextMenu={(e) => handleCatContextMenu(e, cat.id)}
              renameTrigger={renameTrigger?.catId === cat.id ? renameTrigger.nonce : undefined}
            />
            {!cat.collapsed && (
              <div className="category-notes">
                {catNotes.length === 0 ? (
                  <div className="category-empty">拖放笔记到此处或点击 + 新建</div>
                ) : (
                  catNotes.map(note => (
                    <div
                      key={note.id}
                      draggable
                      onDragStart={e => handleDragStart(e, note.id)}
                      className="note-draggable"
                    >
                      <NoteItem
                        note={note}
                        active={note.id === currentNoteId}
                        onClick={() => onSelectNote(note.id)}
                        onDelete={() => onDeleteNote(note.id)}
                        formatTime={formatTime}
                        onContextMenu={handleNoteContextMenu}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
      <button className="add-category-btn" onClick={onAddCategory} title="新建分类">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M9 14h6"/></svg>
        新建分类
      </button>
      {renderNoteContextMenu()}
      {renderCatContextMenu()}
    </div>
  )
}
