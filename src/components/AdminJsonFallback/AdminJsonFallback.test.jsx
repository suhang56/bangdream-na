import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminJsonFallback from './AdminJsonFallback.jsx'

const FIELD = { key: 'location', label: 'Location', type: 'object', complex: true, help: '{"city":"LA"}' }

describe('<AdminJsonFallback />', () => {
  it('Edge 5: initial render with object value shows JSON.stringify with 2-space indent', () => {
    render(<AdminJsonFallback field={FIELD} value={{ a: 1 }} onChange={() => {}} />)
    const ta = screen.getByRole('textbox')
    expect(ta.value).toBe('{\n  "a": 1\n}')
  })

  it('Edge 1: valid JSON typed + blur calls onChange with parsed value', async () => {
    const onChange = vi.fn()
    render(<AdminJsonFallback field={FIELD} value={null} onChange={onChange} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '{"city":"LA"}' } })
    fireEvent.blur(ta)
    expect(onChange).toHaveBeenCalledWith({ city: 'LA' })
  })

  it('Edge 2: invalid JSON + blur shows error and does NOT call onChange', () => {
    const onChange = vi.fn()
    render(<AdminJsonFallback field={FIELD} value={null} onChange={onChange} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '{not valid' } })
    fireEvent.blur(ta)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid json/i)
  })

  it('Edge 3: empty textarea + blur calls onChange with null', () => {
    const onChange = vi.fn()
    render(<AdminJsonFallback field={FIELD} value={{ x: 1 }} onChange={onChange} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '' } })
    fireEvent.blur(ta)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('Edge 4: multibyte content parses + round-trips', () => {
    const onChange = vi.fn()
    render(<AdminJsonFallback field={FIELD} value={null} onChange={onChange} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '[{"q":"中文?","a":"日本語"}]' } })
    fireEvent.blur(ta)
    expect(onChange).toHaveBeenCalledWith([{ q: '中文?', a: '日本語' }])
  })

  it('Edge 6: re-blur after fixing error clears error and calls onChange', () => {
    const onChange = vi.fn()
    render(<AdminJsonFallback field={FIELD} value={null} onChange={onChange} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '{ invalid' } })
    fireEvent.blur(ta)
    expect(screen.queryByRole('alert')).toBeInTheDocument()
    fireEvent.change(ta, { target: { value: '{"ok":true}' } })
    fireEvent.blur(ta)
    expect(onChange).toHaveBeenCalledWith({ ok: true })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows hint text when no error', () => {
    render(<AdminJsonFallback field={FIELD} value={null} onChange={() => {}} />)
    expect(screen.getByText(FIELD.help)).toBeInTheDocument()
  })

  it('Tab key inserts two spaces', async () => {
    const user = userEvent.setup()
    render(<AdminJsonFallback field={FIELD} value={null} onChange={() => {}} />)
    const ta = screen.getByRole('textbox')
    await user.click(ta)
    await user.tab()
    // userEvent.tab moves focus, not insert. So use fireEvent for keyDown directly:
    fireEvent.change(ta, { target: { value: 'a' } })
    fireEvent.keyDown(ta, { key: 'Tab' })
    // The custom Tab handler converts to two spaces; with the textarea's selection at end:
    expect(ta.value.includes('  ')).toBe(true)
  })

  it('aria-invalid true when parseError present', () => {
    render(<AdminJsonFallback field={FIELD} value={null} onChange={() => {}} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: '{ bad' } })
    fireEvent.blur(ta)
    expect(ta).toHaveAttribute('aria-invalid', 'true')
  })

  it('externalError prop renders error', () => {
    render(<AdminJsonFallback field={FIELD} value={{}} onChange={() => {}} error="external woe" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/external woe/i)
  })

  it('reseeds text when value prop changes externally', () => {
    const { rerender } = render(<AdminJsonFallback field={FIELD} value={{ a: 1 }} onChange={() => {}} />)
    expect(screen.getByRole('textbox').value).toBe('{\n  "a": 1\n}')
    rerender(<AdminJsonFallback field={FIELD} value={{ b: 2 }} onChange={() => {}} />)
    expect(screen.getByRole('textbox').value).toBe('{\n  "b": 2\n}')
  })
})
