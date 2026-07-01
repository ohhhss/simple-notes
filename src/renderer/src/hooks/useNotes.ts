import { useState, useEffect, useCallback, useRef } from 'react'
import type { Note, Category } from '../../../shared/types'
import { DEFAULT_CATEGORY_ID, TRASH_RETENTION_DAYS } from '../../../shared/types'

// Extract tags from note content: lines or inline #tags (not headings)
// Returns tags from both explicit tags field AND #tags in content (merged)
export function extractTagsFromContent(content: string): string[] {
  const tags = new Set<string>()
  // Match #tag patterns - not at start of line (those are headings)
  // Tags: #word where word contains Chinese/English/numbers, preceded by space or start
  const inlineRegex = /(?:^|\s)#([^\s#.,;:!?，。；：！？、）\)】\]]+)/gm
  let m
  while ((m = inlineRegex.exec(content)) !== null) {
    const tag = m[1].trim()
    // Skip heading-like patterns (line starting with #)
    const beforeMatch = content.substring(Math.max(0, m.index - 1), m.index)
    if (tag && /\S/.test(tag) && tag.length <= 20) {
      tags.add(tag)
    }
    void beforeMatch
  }
  return Array.from(tags)
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load unified data on mount + clean expired trash
  useEffect(() => {
    ;(async () => {
      const data = await window.notesAPI.loadAppData()
      // Clean expired trash notes
      const now = Date.now()
      const expireThreshold = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
      const cleanedNotes = data.notes.filter(n => !(n.deletedAt && n.deletedAt < expireThreshold))
      const hasChanges = cleanedNotes.length !== data.notes.length
      // Ensure default category exists
      let cats = data.categories
      if (!cats.find(c => c.id === DEFAULT_CATEGORY_ID)) {
        cats = [{ id: DEFAULT_CATEGORY_ID, name: '默认笔记', collapsed: false, created: Date.now() }, ...cats]
      }
      // Migrate missing tags
      for (const n of cleanedNotes) {
        if (!Array.isArray(n.tags)) n.tags = []
      }
      setNotes(cleanedNotes)
      setCategories(cats)
      if (cleanedNotes.length > 0) {
        // Select first non-deleted note
        const firstActive = cleanedNotes.find(n => !n.deletedAt)
        setCurrentNoteId(firstActive ? firstActive.id : null)
      }
      setLoaded(true)
      if (hasChanges) {
        window.notesAPI.saveAppData({ notes: cleanedNotes, categories: cats })
      }
    })()
  }, [])

  // Persist with debounce using latest state via ref
  const stateRef = useRef({ notes, categories })
  useEffect(() => { stateRef.current = { notes, categories } }, [notes, categories])

  const schedulePersist = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const { notes: n, categories: c } = stateRef.current
      window.notesAPI.saveAppData({ notes: n, categories: c })
    }, 400)
  }, [])

  // Update notes with persist
  const updateNotes = useCallback((updater: (prev: Note[]) => Note[]) => {
    setNotes(prev => {
      const next = updater(prev)
      // Defer persist so categories state is fresh too
      schedulePersist()
      return next
    })
  }, [schedulePersist])

  const updateCategories = useCallback((updater: (prev: Category[]) => Category[]) => {
    setCategories(prev => {
      const next = updater(prev)
      schedulePersist()
      return next
    })
  }, [schedulePersist])

  // Force persist immediately (for external actions)
  const persistNow = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    window.notesAPI.saveAppData({ notes: stateRef.current.notes, categories: stateRef.current.categories })
  }, [])

  const addNote = useCallback((categoryId: string = DEFAULT_CATEGORY_ID) => {
    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: '未命名笔记',
      content: '',
      tags: [],
      created: Date.now(),
      updated: Date.now(),
      categoryId
    }
    updateNotes(prev => [newNote, ...prev])
    setCurrentNoteId(newNote.id)
    // Auto-expand the target category
    updateCategories(prev => prev.map(c => c.id === categoryId ? { ...c, collapsed: false } : c))
    return newNote
  }, [updateNotes, updateCategories])

  const addCategory = useCallback((name: string = '新分类') => {
    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || '新分类',
      collapsed: false,
      created: Date.now()
    }
    updateCategories(prev => [...prev, newCat])
    return newCat
  }, [updateCategories])

  const deleteCategory = useCallback((id: string) => {
    if (id === DEFAULT_CATEGORY_ID) return
    updateCategories(prev => prev.filter(c => c.id !== id))
    updateNotes(prev => prev.map(n => n.categoryId === id ? { ...n, categoryId: DEFAULT_CATEGORY_ID } : n))
  }, [updateCategories, updateNotes])

  const renameCategory = useCallback((id: string, name: string) => {
    if (id === DEFAULT_CATEGORY_ID) return
    const trimmed = name.trim()
    if (!trimmed) return
    updateCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c))
  }, [updateCategories])

  const toggleCategory = useCallback((id: string) => {
    updateCategories(prev => prev.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c))
  }, [updateCategories])

  const setNoteCategory = useCallback((noteId: string, categoryId: string) => {
    updateNotes(prev => prev.map(n => n.id === noteId ? { ...n, categoryId, updated: Date.now() } : n))
  }, [updateNotes])

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    updateNotes(prev => prev.map(note => {
      if (note.id !== id) return note
      const merged = { ...note, ...updates, updated: Date.now() }
      // Merge tags: explicit tags + extracted from content
      if (updates.content !== undefined || updates.tags !== undefined) {
        const contentTags = extractTagsFromContent(updates.content !== undefined ? updates.content : note.content)
        const explicitTags = updates.tags !== undefined ? updates.tags : note.tags
        const tagSet = new Set<string>([...explicitTags, ...contentTags])
        merged.tags = Array.from(tagSet)
      }
      return merged
    }))
  }, [updateNotes])

  const setNoteTags = useCallback((id: string, tags: string[]) => {
    updateNotes(prev => prev.map(n => {
      if (n.id !== id) return n
      const contentTags = extractTagsFromContent(n.content)
      const tagSet = new Set<string>([...tags, ...contentTags])
      return { ...n, tags: Array.from(tagSet), updated: Date.now() }
    }))
  }, [updateNotes])

  // Move to trash (soft delete)
  const deleteNote = useCallback((id: string) => {
    updateNotes(prev => prev.map(n => n.id === id ? { ...n, deletedAt: Date.now() } : n))
    // Select next available non-deleted note
    setCurrentNoteId(curr => {
      if (curr !== id) return curr
      const rest = stateRef.current.notes.filter(n => n.id !== id && !n.deletedAt)
      return rest.length > 0 ? rest[0].id : null
    })
  }, [updateNotes])

  // Restore from trash
  const restoreNote = useCallback((id: string) => {
    updateNotes(prev => {
      const note = prev.find(n => n.id === id)
      if (!note) return prev
      const { deletedAt: _removed, ...rest } = note
      void _removed
      // Ensure category exists; if not, move to default
      const catExists = stateRef.current.categories.some(c => c.id === note.categoryId)
      return prev.map(n => n.id === id
        ? { ...rest, categoryId: catExists ? note.categoryId : DEFAULT_CATEGORY_ID, updated: Date.now() }
        : n
      )
    })
  }, [updateNotes])

  // Permanently delete
  const permanentlyDeleteNote = useCallback((id: string) => {
    updateNotes(prev => prev.filter(n => n.id !== id))
    setCurrentNoteId(curr => {
      if (curr !== id) return curr
      const rest = stateRef.current.notes.filter(n => n.id !== id && !n.deletedAt)
      return rest.length > 0 ? rest[0].id : null
    })
  }, [updateNotes])

  // Empty all trash
  const emptyTrash = useCallback(() => {
    updateNotes(prev => prev.filter(n => !n.deletedAt))
  }, [updateNotes])

  const currentNote = notes.find(n => n.id === currentNoteId) || null

  // Derived data
  const activeNotes = notes.filter(n => !n.deletedAt)
  const trashedNotes = notes.filter(n => !!n.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))

  // Get all unique tags from active notes
  const allTags = (() => {
    const set = new Set<string>()
    for (const n of activeNotes) {
      for (const t of n.tags) set.add(t)
    }
    return Array.from(set).sort()
  })()

  // Reload from external data (e.g. after config import)
  const reloadFromData = useCallback((data: { notes: Note[]; categories: Category[] }) => {
    const cats = data.categories.find(c => c.id === DEFAULT_CATEGORY_ID)
      ? data.categories
      : [{ id: DEFAULT_CATEGORY_ID, name: '默认笔记', collapsed: false, created: Date.now() }, ...data.categories]
    const ns = data.notes.map(n => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [] }))
    setNotes(ns)
    setCategories(cats)
    setCurrentNoteId(ns.find(n => !n.deletedAt)?.id ?? null)
    // Persist immediately
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    window.notesAPI.saveAppData({ notes: ns, categories: cats })
  }, [])

  return {
    notes, categories, currentNoteId, currentNote, loaded,
    activeNotes, trashedNotes, allTags,
    setCurrentNoteId,
    addNote, updateNote, setNoteTags, deleteNote, restoreNote, permanentlyDeleteNote, emptyTrash,
    addCategory, deleteCategory, renameCategory, toggleCategory, setNoteCategory,
    persistNow, reloadFromData
  }
}
