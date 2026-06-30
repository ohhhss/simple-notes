import { useState, useEffect, useCallback } from 'react'
import type { Theme } from '@shared/types'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const saved = await window.notesAPI.getTheme()
      setThemeState(saved)
      applyTheme(saved)
      setLoaded(true)
    })()
  }, [])

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      applyTheme(next)
      window.notesAPI.setTheme(next)
      return next
    })
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    window.notesAPI.setTheme(t)
  }, [])

  return { theme, toggleTheme, setTheme, themeLoaded: loaded }
}
