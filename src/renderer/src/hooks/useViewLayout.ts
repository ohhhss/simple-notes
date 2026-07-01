import { useState, useEffect, useCallback } from 'react'
import type { ViewMode } from '@shared/types'

export function useViewLayout() {
  const [viewMode, setViewModeState] = useState<ViewMode>('split')
  const [splitRatio, setSplitRatioState] = useState<number>(0.5)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [mode, ratio] = await Promise.all([
        window.notesAPI.getViewMode(),
        window.notesAPI.getSplitRatio()
      ])
      setViewModeState(mode)
      setSplitRatioState(ratio)
      setLoaded(true)
    })()
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    window.notesAPI.setViewMode(mode)
  }, [])

  const setSplitRatio = useCallback((ratio: number) => {
    const clamped = Math.max(0.2, Math.min(0.8, ratio))
    setSplitRatioState(clamped)
  }, [])

  const persistSplitRatio = useCallback((ratio: number) => {
    const clamped = Math.max(0.2, Math.min(0.8, ratio))
    window.notesAPI.setSplitRatio(clamped)
  }, [])

  const toggleViewMode = useCallback(() => {
    setViewModeState(prev => {
      const modes: ViewMode[] = ['split', 'edit', 'preview']
      const idx = modes.indexOf(prev)
      const next = modes[(idx + 1) % modes.length]
      window.notesAPI.setViewMode(next)
      return next
    })
  }, [])

  return {
    viewMode,
    splitRatio,
    setViewMode,
    setSplitRatio,
    persistSplitRatio,
    toggleViewMode,
    layoutLoaded: loaded
  }
}
