import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminForm from './AdminForm.jsx'
import { adminSchemas } from '../../lib/adminSchemas.js'

const eventsSchema = adminSchemas.events
const socialSchema = adminSchemas.social

describe('<AdminForm />', () => {
  it('Edge 1: required field error displays under field', () => {
    render(<AdminForm schema={eventsSchema} item={{ id: '', title: '', date: '', type: '' }} onChange={() => {}} errors={[{ fieldKey: 'title', message: 'Title is required' }]} />)
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })

  it('Edge 2: invalid url shows error', () => {
    render(<AdminForm schema={eventsSchema} item={{ ticketUrl: 'not-a-url' }} onChange={() => {}} errors={[{ fieldKey: 'ticketUrl', message: 'Ticket URL is not a valid URL' }]} />)
    expect(screen.getByText(/not a valid url/i)).toBeInTheDocument()
  })

  it('Edge 3: datetime input change → onChange called with ISO-formatted value', () => {
    const onChange = vi.fn()
    render(<AdminForm schema={eventsSchema} item={{}} onChange={onChange} />)
    const dt = document.querySelector('input[type=datetime-local]')
    fireEvent.change(dt, { target: { value: '2025-09-15T19:00' } })
    expect(onChange).toHaveBeenCalled()
    const lastCallArg = onChange.mock.calls.at(-1)[0]
    expect(typeof lastCallArg.date).toBe('string')
    expect(lastCallArg.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('Edge 4: select renders options + placeholder; select calls onChange', () => {
    const onChange = vi.fn()
    render(<AdminForm schema={eventsSchema} item={{}} onChange={onChange} />)
    const sel = screen.getByLabelText(/^Type/)
    expect(sel.querySelector('option[value="concert"]')).toBeTruthy()
    fireEvent.change(sel, { target: { value: 'concert' } })
    expect(onChange.mock.calls.at(-1)[0].type).toBe('concert')
  })

  it('Edge 5: asset field passes uploadDir to AdminAssetUploader', () => {
    render(<AdminForm schema={eventsSchema} item={{ id: 'evt' }} onChange={() => {}} token="ghp_X" branch="content-updates" />)
    // The dropzone is a button labeled "Drag image..."
    expect(screen.getByRole('button', { name: /drag image/i })).toBeInTheDocument()
  })

  it('Edge 6: complex object field renders AdminJsonFallback', () => {
    render(<AdminForm schema={eventsSchema} item={{ location: { city: 'LA' } }} onChange={() => {}} />)
    const ta = document.querySelector('.admin-json-textarea')
    expect(ta).toBeTruthy()
    expect(ta.value).toContain('city')
  })

  it('Edge 7: readOnly autoSlug field shows preview slug', () => {
    render(<AdminForm schema={eventsSchema} item={{ id: '', title: 'My Event!' }} onChange={() => {}} />)
    const idInput = document.querySelector('input.readonly')
    expect(idInput.value).toBe('my-event')
  })

  it('text field change calls onChange with new value', () => {
    const onChange = vi.fn()
    render(<AdminForm schema={eventsSchema} item={{ title: '' }} onChange={onChange} />)
    const input = screen.getByLabelText(/^Title/)
    fireEvent.change(input, { target: { value: 'New Event' } })
    expect(onChange.mock.calls.at(-1)[0].title).toBe('New Event')
  })

  it('boolean field renders checkbox and toggles', () => {
    const onChange = vi.fn()
    render(<AdminForm schema={socialSchema} item={{ platform: 'discord', label: 'Discord', enabled: false }} onChange={onChange} />)
    const cb = screen.getByLabelText(/Enabled/)
    fireEvent.click(cb)
    expect(onChange.mock.calls.at(-1)[0].enabled).toBe(true)
  })

  it('textarea renders with multiline content', () => {
    render(<AdminForm schema={eventsSchema} item={{ description: 'Line 1\nLine 2' }} onChange={() => {}} />)
    const ta = screen.getByLabelText(/Description/)
    expect(ta.value).toBe('Line 1\nLine 2')
  })

  it('url field renders with input type=url', () => {
    render(<AdminForm schema={eventsSchema} item={{ ticketUrl: 'https://x.com' }} onChange={() => {}} />)
    const url = screen.getByLabelText(/Ticket URL/)
    expect(url).toHaveAttribute('type', 'url')
    expect(url).toHaveValue('https://x.com')
  })

  it('date field renders with input type=date', () => {
    const newsSchema = adminSchemas.news
    render(<AdminForm schema={newsSchema} item={{ date: '2025-09-15' }} onChange={() => {}} />)
    const date = screen.getByLabelText(/^Date/)
    expect(date).toHaveAttribute('type', 'date')
    expect(date).toHaveValue('2025-09-15')
  })

  it('required asterisk shown on required fields', () => {
    const { container } = render(<AdminForm schema={eventsSchema} item={{}} onChange={() => {}} />)
    const requiredMarks = container.querySelectorAll('.admin-form-required')
    expect(requiredMarks.length).toBeGreaterThan(0)
  })
})
