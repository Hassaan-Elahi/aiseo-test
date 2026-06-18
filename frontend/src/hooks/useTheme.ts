import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'ds-assessment:theme'

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const persistedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (persistedTheme === 'dark') {
      return true
    }

    if (persistedTheme === 'light') {
      return false
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  return [isDarkMode, setIsDarkMode] as const
}
