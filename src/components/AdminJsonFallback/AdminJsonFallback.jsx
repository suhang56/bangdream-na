import { useState, useEffect, useId, useRef } from 'react'
import './AdminJsonFallback.css'

function pretty(value) {
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export default function AdminJsonFallback({ field, value, onChange, error: externalError }) {
  const [text, setText] = useState(() => pretty(value))
  const [parseError, setParseError] = useState(null)
  const initialPretty = useRef(pretty(value))
  const helpId = useId()
  const errorId = useId()

  useEffect(() => {
    // Re-sync when value prop changes externally (e.g. switching items)
    const next = pretty(value)
    if (next !== text && pretty(JSON.parse(text || 'null')) !== next) {
      // value changed externally — reset
    }
    // Only re-sync if parent value changed and is not a result of our own onChange
    // (heuristic: text is currently equal to a previous render's parsed shape)
    // For simplicity reseed when value changes and text is in sync with prior pretty.
    if (next !== initialPretty.current) {
      setText(next)
      setParseError(null)
      initialPretty.current = next
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(textValue) {
    const trimmed = textValue.trim()
    if (trimmed === '') {
      // Empty input → null
      onChange?.(null)
      setParseError(null)
      return
    }
    try {
      const parsed = JSON.parse(textValue)
      setParseError(null)
      onChange?.(parsed)
    } catch (e) {
      setParseError(e.message)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = text.slice(0, start) + '  ' + text.slice(end)
      setText(next)
      // restore caret after tab insertion
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  const showError = parseError ?? externalError ?? null
  const valid = !showError && text.trim() !== ''

  return (
    <div className={`admin-json-fallback ${showError ? 'has-error' : ''} ${valid ? 'is-valid' : ''}`}>
      <textarea
        className="admin-json-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={onKeyDown}
        rows={Math.max(6, Math.min(20, text.split('\n').length + 2))}
        spellCheck="false"
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? errorId : (field?.help ? helpId : undefined)}
      />
      {showError ? (
        <p className="admin-json-status error" id={errorId} role="alert" aria-live="polite">
          ✗ 无效 JSON：{showError}
        </p>
      ) : valid ? (
        <p className="admin-json-status ok">✓ JSON 格式正确</p>
      ) : null}
      {field?.help && !showError && (
        <p className="admin-json-help" id={helpId}>{field.help}</p>
      )}
    </div>
  )
}
