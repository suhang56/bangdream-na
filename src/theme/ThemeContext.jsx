import { useCallback, useEffect, useState } from 'react'
import { themes, DEFAULT_THEME_KEY, isValidThemeKey } from './themes.js'
import { STORAGE_KEY, ThemeContext } from './themeContextValue.js'

function readStoredKey() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw && isValidThemeKey(raw)) return raw
  } catch {
    // localStorage unavailable (private mode, disabled, etc.) — silent fallback
  }
  return DEFAULT_THEME_KEY
}

function applyTokensToRoot(tokens) {
  const root = document.documentElement
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value)
  }
}

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(() => readStoredKey())

  useEffect(() => {
    const theme = themes[themeKey] || themes[DEFAULT_THEME_KEY]
    applyTokensToRoot(theme.tokens)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme.key)
    } catch {
      // silent fallback — theme applied in-memory for this session
    }
  }, [themeKey])

  const setThemeKey = useCallback((next) => {
    if (!isValidThemeKey(next)) {
      setThemeKeyState(DEFAULT_THEME_KEY)
      return
    }
    setThemeKeyState((prev) => (prev === next ? prev : next))
  }, [])

  const theme = themes[themeKey] || themes[DEFAULT_THEME_KEY]

  const value = { themeKey: theme.key, theme, setThemeKey }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
