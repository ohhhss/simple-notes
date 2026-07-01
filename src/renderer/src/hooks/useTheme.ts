import { useState, useEffect, useCallback, useRef } from 'react'
import type { Theme } from '@shared/types'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [loaded, setLoaded] = useState(false)
  const userOverrideRef = useRef(false)

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }

  const getSystemTheme = (): Theme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  useEffect(() => {
    ;(async () => {
      const saved = await window.notesAPI.getTheme()
      // Check if user has explicitly set a theme before
      // We use localStorage as a flag to know if user has overridden
      const hasOverride = localStorage.getItem('theme-user-override') === 'true'
      userOverrideRef.current = hasOverride
      const initial = hasOverride ? saved : getSystemTheme()
      setThemeState(initial)
      applyTheme(initial)
      setLoaded(true)
    })()

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!userOverrideRef.current) {
        const newTheme: Theme = e.matches ? 'dark' : 'light'
        setThemeState(newTheme)
        applyTheme(newTheme)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      applyTheme(next)
      window.notesAPI.setTheme(next)
      userOverrideRef.current = true
      localStorage.setItem('theme-user-override', 'true')
      return next
    })
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    window.notesAPI.setTheme(t)
    userOverrideRef.current = true
    localStorage.setItem('theme-user-override', 'true')
  }, [])

  return { theme, toggleTheme, setTheme, themeLoaded: loaded }
}
