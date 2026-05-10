import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/theme.css'
// tokens.css MUST load AFTER theme.css so the bf-* paper-palette body rule
// wins the cascade over theme.css's legacy `body { background: var(--color-bg) }`
// (HIGH-1 fix — see PR #111 reviewer notes).
import './theme/tokens.css'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
