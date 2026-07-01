import { useMemo, createElement, Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Note } from '../../../shared/types'

export interface SearchResult {
  note: Note
  score: number
  titleMatches: { start: number; end: number }[]
  contentMatches: { start: number; end: number }[]
  tagMatches: string[]
  snippet: string
}

export interface SearchOptions {
  keyword: string
  tag: string | null
  dateFrom: number | null
  dateTo: number | null
  dateField: 'updated' | 'created'
  inTrash: boolean
}

// Escape regex special chars
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Find all match positions (case insensitive)
function findMatches(text: string, keyword: string): { start: number; end: number }[] {
  if (!keyword) return []
  const matches: { start: number; end: number }[] = []
  try {
    const re = new RegExp(escapeRegex(keyword), 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + keyword.length })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  } catch { /* ignore */ }
  return matches
}

// Build a context snippet around first content match
function buildSnippet(content: string, matches: { start: number; end: number }[], keyword: string): string {
  if (!keyword || matches.length === 0) {
    const clean = content.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim()
    return clean.length > 100 ? clean.slice(0, 100) + '...' : clean
  }
  const first = matches[0]
  const radius = 40
  const start = Math.max(0, first.start - radius)
  const end = Math.min(content.length, first.end + radius)
  let snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
  return snippet.replace(/\n+/g, ' ')
}

export function useSearch(notes: Note[], options: SearchOptions): SearchResult[] {
  return useMemo(() => {
    const { keyword, tag, dateFrom, dateTo, dateField, inTrash } = options
    const kw = keyword.trim().toLowerCase()

    let pool = notes.filter(n => inTrash ? !!n.deletedAt : !n.deletedAt)

    // Tag filter
    if (tag) {
      pool = pool.filter(n => n.tags.includes(tag))
    }

    // Date filter
    if (dateFrom !== null) {
      pool = pool.filter(n => n[dateField] >= dateFrom)
    }
    if (dateTo !== null) {
      pool = pool.filter(n => n[dateField] <= dateTo)
    }

    // Keyword search
    if (!kw) {
      // No keyword - return all matching filters sorted by date desc
      return pool.map(note => ({
        note,
        score: note[dateField],
        titleMatches: [],
        contentMatches: [],
        tagMatches: [],
        snippet: buildSnippet(note.content, [], '')
      })).sort((a, b) => b.score - a.score)
    }

    const results: SearchResult[] = []
    for (const note of pool) {
      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()
      const titleMatches = findMatches(note.title, kw)
      const contentMatches = findMatches(note.content, kw)
      const tagMatches = note.tags.filter(t => t.toLowerCase().includes(kw))

      const hasHit = titleMatches.length > 0 || contentMatches.length > 0 || tagMatches.length > 0
      if (!hasHit) continue

      // Score: title hits weighted much higher, tag hits, then content hits + frequency
      let score = 0
      score += titleMatches.length * 100
      score += tagMatches.length * 50
      score += Math.min(contentMatches.length, 20) * 10
      // Recency bonus
      score += Math.log10(1 + note.updated / 1e12)

      results.push({
        note,
        score,
        titleMatches,
        contentMatches,
        tagMatches,
        snippet: buildSnippet(note.content, contentMatches, kw)
      })
    }

    results.sort((a, b) => b.score - a.score)
    return results
  }, [notes, options.keyword, options.tag, options.dateFrom, options.dateTo, options.dateField, options.inTrash])
}

// Highlight text by wrapping matches in <mark>
export function highlightText(text: string, matches: { start: number; end: number }[]): ReactNode {
  if (!matches || matches.length === 0) return text
  const sorted = [...matches].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = 0
  sorted.forEach((m, i) => {
    if (m.start > cursor) parts.push(text.slice(cursor, m.start))
    parts.push(createElement('mark', { key: i, className: 'hl-mark' }, text.slice(m.start, m.end)))
    cursor = m.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return createElement(Fragment, null, ...parts)
}

// Highlight snippet (case-insensitive keyword-based)
export function highlightSnippet(snippet: string, keyword: string): ReactNode {
  if (!keyword.trim()) return snippet
  try {
    const kw = keyword.trim()
    const re = new RegExp(`(${escapeRegex(kw)})`, 'gi')
    const parts = snippet.split(re)
    return createElement(
      Fragment,
      null,
      ...parts.map((p, i) =>
        p.toLowerCase() === kw.toLowerCase()
          ? createElement('mark', { key: i, className: 'hl-mark' }, p)
          : p
      )
    )
  } catch { return snippet }
}
