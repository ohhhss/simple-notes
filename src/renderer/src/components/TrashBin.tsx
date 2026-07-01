import { useState, useEffect } from 'react'
import type { Note, Category } from '../../../shared/types'
import { TRASH_RETENTION_DAYS } from '../../../shared/types'
import { formatDate, formatRelativeTime } from '../utils/formatTime'

interface TrashBinProps {
  trashedNotes: Note[]
  categories: Category[]
  onRestore: (id: string) => void
  onPermanentlyDelete: (id: string) => void
  onEmptyTrash: () => void
  onClose: () => void
  onSelectNote?: (id: string) => void
}

export default function TrashBin({
  trashedNotes, categories, onRestore, onPermanentlyDelete, onEmptyTrash, onClose, onSelectNote
}: TrashBinProps) {
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const catMap = new Map(categories.map(c => [c.id, c.name]))

  useEffect(() => {
    if (!confirmEmpty && !confirmDeleteId) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmEmpty(false)
        setConfirmDeleteId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [confirmEmpty, confirmDeleteId])

  const daysUntilPurge = (deletedAt: number) => {
    return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - (Date.now() - deletedAt) / 86400000))
  }

  const handleEmptyNow = () => {
    onEmptyTrash()
    setConfirmEmpty(false)
  }

  const handlePermanentDelete = (id: string) => {
    onPermanentlyDelete(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="trash-panel">
      <div className="trash-head">
        <button className="trash-back" onClick={onClose} title="返回笔记列表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h3 className="trash-title">回收站</h3>
        <span className="trash-count">{trashedNotes.length} 条</span>
        {trashedNotes.length > 0 && (
          <button className="trash-empty-btn" onClick={() => setConfirmEmpty(true)} title="清空回收站">清空</button>
        )}
      </div>

      <div className="trash-tip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0, marginTop:2}}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>笔记移入回收站后保留 {TRASH_RETENTION_DAYS} 天，到期自动清除。恢复后回到原分类。</span>
      </div>

      <div className="trash-list">
        {trashedNotes.length === 0 ? (
          <div className="trash-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{opacity:0.3, marginBottom:10}}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            <div>回收站是空的</div>
          </div>
        ) : (
          trashedNotes.map(note => {
            const daysLeft = note.deletedAt ? daysUntilPurge(note.deletedAt) : 0
            const expired = daysLeft <= 0
            const catName = catMap.get(note.categoryId) || '默认笔记'
            const preview = note.content.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').slice(0, 80).trim()
            return (
              <div key={note.id} className="trash-item">
                <div
                  className="trash-item-body"
                  onClick={() => onSelectNote?.(note.id)}
                  style={{cursor: onSelectNote ? 'pointer' : 'default'}}
                >
                  <div className="trash-item-title">{note.title || '无标题'}</div>
                  {preview && <div className="trash-item-preview">{preview}...</div>}
                  <div className="trash-item-meta">
                    <span className="trash-cat">{catName}</span>
                    <span>·</span>
                    <span>删除于 {note.deletedAt ? formatRelativeTime(note.deletedAt) : '—'}</span>
                    {!expired ? (
                      <>
                        <span>·</span>
                        <span className="trash-days-left">{daysLeft} 天后清除</span>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <span className="trash-expired">即将清除</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="trash-item-actions">
                  <button className="trash-action restore" onClick={() => onRestore(note.id)} title="还原到原分类">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    还原
                  </button>
                  <button
                    className="trash-action delete"
                    onClick={() => setConfirmDeleteId(note.id)}
                    title="彻底删除（不可恢复）"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                    彻底删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {confirmEmpty && (
        <div className="confirm-overlay" onClick={() => setConfirmEmpty(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>清空回收站？</h4>
            <p>将永久删除回收站中的 {trashedNotes.length} 条笔记，此操作不可恢复。</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmEmpty(false)}>取消</button>
              <button className="btn-danger" onClick={handleEmptyNow}>确认清空</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>彻底删除这条笔记？</h4>
            <p>删除后数据将无法找回。</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmDeleteId(null)}>取消</button>
              <button className="btn-danger" onClick={() => handlePermanentDelete(confirmDeleteId)}>彻底删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
