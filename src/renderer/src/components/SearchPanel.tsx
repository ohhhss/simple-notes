import { useState, useEffect, useRef } from 'react'
import type { Note, Category } from '../../../shared/types'
import { TRASH_RETENTION_DAYS } from '../../../shared/types'
import { useSearch, highlightText, highlightSnippet } from '../hooks/useSearch'
import type { SearchOptions } from '../hooks/useSearch'
import { formatDate, formatRelativeTime } from '../utils/formatTime'

interface SearchPanelProps {
  notes: Note[]
  categories: Category[]
  allTags: string[]
  onSelectNote: (id: string) => void
  onClose: () => void
  initialQuery?: string
}

const DATE_FIELD_OPTIONS = [
  { value: 'updated', label: '修改时间' },
  { value: 'created', label: '创建时间' }
] as const

const DATE_PRESETS = [
  { value: 'all', label: '全部', from: null, to: null },
  { value: 'today', label: '今天', from: () => startOfDay(0), to: () => endOfDay(0) },
  { value: '7d', label: '近 7 天', from: () => startOfDay(-6), to: () => endOfDay(0) },
  { value: '30d', label: '近 30 天', from: () => startOfDay(-29), to: () => endOfDay(0) },
  { value: '90d', label: '近 90 天', from: () => startOfDay(-89), to: () => endOfDay(0) }
] as const

function startOfDay(offsetDays: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}
function endOfDay(offsetDays: number): number {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}

export default function SearchPanel({ notes, categories, allTags, onSelectNote, onClose, initialQuery = '' }: SearchPanelProps) {
  const [keyword, setKeyword] = useState(initialQuery)
  const [tag, setTag] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<string>('all')
  const [dateField, setDateField] = useState<'updated' | 'created'>('updated')
  const [dateFrom, setDateFrom] = useState<number | null>(null)
  const [dateTo, setDateTo] = useState<number | null>(null)
  const [inTrash, setInTrash] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const options: SearchOptions = { keyword, tag, dateFrom, dateTo, dateField, inTrash }
  const results = useSearch(notes, options)

  const applyPreset = (presetValue: string) => {
    setDatePreset(presetValue)
    const p = DATE_PRESETS.find(x => x.value === presetValue)
    if (!p) return
    setDateFrom(p.from ? p.from() : null)
    setDateTo(p.to ? p.to() : null)
  }

  const catMap = new Map(categories.map(c => [c.id, c.name]))

  const clearFilters = () => {
    setTag(null)
    setDatePreset('all')
    setDateFrom(null)
    setDateTo(null)
    setInTrash(false)
  }

  const hasFilters = tag !== null || datePreset !== 'all' || inTrash

  return (
    <div className="search-panel" onClick={onClose}>
      <div className="search-panel-inner" onClick={e => e.stopPropagation()}>
        <div className="search-head">
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0, color:'var(--text-muted)'}}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className="search-input-big"
              placeholder="搜索笔记内容、标题..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              data-testid="global-search-input"
            />
            <button className="search-clear" onClick={() => setKeyword('')} title="清空">
              {keyword && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              )}
            </button>
          </div>
          <button className="search-close" onClick={onClose} title="关闭 (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="search-filters">
          <div className="filter-row">
            <span className="filter-label">时间：</span>
            <div className="filter-chips">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`filter-chip${datePreset === p.value ? ' active' : ''}`}
                  onClick={() => applyPreset(p.value)}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">类型：</span>
            <div className="filter-chips">
              <button
                className={`filter-chip${!inTrash ? ' active' : ''}`}
                onClick={() => setInTrash(false)}
              >笔记</button>
              <button
                className={`filter-chip${inTrash ? ' active' : ''}`}
                onClick={() => setInTrash(true)}
              >回收站</button>
            </div>
            <select
              className="filter-select"
              value={dateField}
              onChange={e => setDateField(e.target.value as 'updated' | 'created')}
              disabled={datePreset === 'all'}
            >
              {DATE_FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>按{o.label}</option>)}
            </select>
            <button
              className="filter-advanced"
              onClick={() => setShowAdvanced(s => !s)}
            >{showAdvanced ? '收起标签' : '标签筛选 ▾'}</button>
            {hasFilters && (
              <button className="filter-clear" onClick={clearFilters}>清除筛选</button>
            )}
          </div>
          {showAdvanced && allTags.length > 0 && (
            <div className="filter-row tag-row">
              <span className="filter-label">标签：</span>
              <div className="filter-chips tag-chips">
                <button
                  className={`filter-chip${tag === null ? ' active' : ''}`}
                  onClick={() => setTag(null)}
                >全部</button>
                {allTags.map(t => (
                  <button
                    key={t}
                    className={`filter-chip tag-chip${tag === t ? ' active' : ''}`}
                    onClick={() => setTag(tag === t ? null : t)}
                  >#{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="search-results">
          <div className="search-meta">
            {keyword || hasFilters ? (
              <>找到 <b>{results.length}</b> 条{inTrash ? '回收站' : ''}笔记
              {tag && <> · 标签 <b>#{tag}</b></>}
              </>
            ) : (
              <span style={{color:'var(--text-muted)'}}>输入关键词开始搜索，或使用上方筛选条件浏览</span>
            )}
          </div>
          {results.length === 0 ? (
            <div className="search-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{opacity:0.3, marginBottom:12}}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <div>未找到匹配的笔记</div>
            </div>
          ) : (
            results.map(r => {
              const catName = r.note.deletedAt
                ? '回收站'
                : (catMap.get(r.note.categoryId) || '默认笔记')
              const daysLeft = r.note.deletedAt
                ? Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - (Date.now() - r.note.deletedAt) / 86400000))
                : null
              return (
                <div
                  key={r.note.id}
                  className="search-result-item"
                  onClick={() => { onSelectNote(r.note.id); onClose() }}
                >
                  <div className="result-title">
                    {r.titleMatches.length > 0
                      ? highlightText(r.note.title, r.titleMatches)
                      : r.note.title || '无标题'}
                    {r.note.tags.slice(0, 3).map(t => (
                      <span key={t} className="result-tag-mini">#{t}</span>
                    ))}
                  </div>
                  <div className="result-snippet">
                    {keyword
                      ? highlightSnippet(r.snippet, keyword)
                      : r.snippet}
                  </div>
                  <div className="result-meta">
                    <span className="result-cat">{catName}</span>
                    <span>·</span>
                    <span>{formatDate(r.note.updated)}</span>
                    {daysLeft !== null && (
                      <>
                        <span>·</span>
                        <span className="trash-days">还剩 {daysLeft} 天清除</span>
                      </>
                    )}
                    {r.tagMatches.length > 0 && (
                      <>
                        <span>·</span>
                        <span style={{color:'var(--accent)'}}>匹配标签</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
