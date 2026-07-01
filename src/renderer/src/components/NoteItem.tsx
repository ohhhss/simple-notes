import type { Note } from '../../../shared/types'

interface NoteItemProps {
  note: Note
  active: boolean
  onClick: (id: string) => void
  onDelete: (id: string) => void
  formatTime: (ts: number) => string
  isTrashed?: boolean
  onContextMenu?: (e: React.MouseEvent, noteId: string) => void
}

export default function NoteItem({ note, active, onClick, onDelete, formatTime, isTrashed, onContextMenu }: NoteItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(note.id)
  }

  const preview = (note.content || '').replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').substring(0, 50)

  return (
    <div
      className={`item${active ? ' active' : ''}${isTrashed ? ' trashed' : ''}`}
      onClick={() => onClick(note.id)}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e, note.id) } : undefined}
      data-testid={`note-item-${note.id}`}
      title={note.title || '无标题'}
    >
      <button className="del-btn" onClick={handleDelete} data-testid="delete-btn" title={isTrashed ? '彻底删除' : '移入回收站'}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isTrashed ? (
            <>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </>
          ) : (
            <>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L5 6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </>
          )}
        </svg>
      </button>
      <div className="item-title">{note.title || '无标题'}</div>
      {note.tags.length > 0 && (
        <div className="item-tags">
          {note.tags.slice(0, 3).map(t => <span key={t} className="item-tag">#{t}</span>)}
          {note.tags.length > 3 && <span className="item-tag-more">+{note.tags.length - 3}</span>}
        </div>
      )}
      <div className="item-preview">{preview}</div>
      <div className="item-date">{formatTime(note.updated)}</div>
    </div>
  )
}
