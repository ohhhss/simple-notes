import { formatTime } from '../utils/formatTime'
import type { Note } from '@shared/types'

interface NoteItemProps {
  note: Note
  active: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function NoteItem({ note, active, onSelect, onDelete }: NoteItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定删除这条笔记吗？')) {
      onDelete(note.id)
    }
  }

  return (
    <div
      className={`item${active ? ' active' : ''}`}
      onClick={() => onSelect(note.id)}
      data-testid={`note-item-${note.id}`}
    >
      <button className="del-btn" onClick={handleDelete} data-testid="delete-btn">删除</button>
      <div className="item-title">{note.title || '无标题'}</div>
      <div className="item-preview">{(note.content || '').substring(0, 40)}</div>
      <div className="item-date">{formatTime(note.updated)}</div>
    </div>
  )
}
