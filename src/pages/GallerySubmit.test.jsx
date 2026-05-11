import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GallerySubmit from './GallerySubmit.jsx'
import * as api from '../lib/api.js'
import { ApiError } from '../lib/api.js'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/gallery/submit']}>
      <Routes>
        <Route path="/gallery/submit" element={<GallerySubmit />} />
        <Route path="/gallery" element={<div data-testid="gallery-page" />} />
      </Routes>
    </MemoryRouter>,
  )
}

function pngFile(name = 'photo.png', size = 1000) {
  const bytes = new Uint8Array(size)
  // PNG magic so client-side MIME check passes when type is set.
  bytes[0] = 0x89
  bytes[1] = 0x50
  bytes[2] = 0x4e
  bytes[3] = 0x47
  return new File([bytes], name, { type: 'image/png' })
}

function jpegFile(name = 'photo.jpg', size = 1000) {
  const bytes = new Uint8Array(size)
  bytes[0] = 0xff
  bytes[1] = 0xd8
  bytes[2] = 0xff
  return new File([bytes], name, { type: 'image/jpeg' })
}

// Helper: fill all required form fields for happy-path flow. Picks the
// `__custom__` activity option then types a free-form label, matching
// the new required-activity contract.
function fillRequired(testing) {
  const { getByTestId } = testing
  fireEvent.change(getByTestId('gs-file-input'), {
    target: { files: [pngFile()] },
  })
  fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
  fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
  // The custom input appears synchronously after the select change.
  fireEvent.change(getByTestId('gs-event-custom'), { target: { value: 'test event' } })
  fireEvent.click(getByTestId('gs-terms'))
}

beforeEach(() => {
  _resetForTests()
  setLanguage('zh')
  // Default events fetch returns empty list.
  vi.spyOn(api, 'fetchEvents').mockResolvedValue({ items: [], total: 0 })
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = vi.fn(() => 'blob:test')
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = vi.fn()
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GallerySubmit — form rendering', () => {
  it('renders title, dropzone, nickname, caption, terms, submit', () => {
    const { getByText, getByTestId } = renderPage()
    expect(getByText('投稿照片')).toBeTruthy()
    expect(getByTestId('gs-dropzone')).toBeTruthy()
    expect(getByTestId('gs-nickname')).toBeTruthy()
    expect(getByTestId('gs-caption')).toBeTruthy()
    expect(getByTestId('gs-terms')).toBeTruthy()
    expect(getByTestId('gs-submit')).toBeTruthy()
  })

  it('keeps submit disabled when form is empty', () => {
    const { getByTestId } = renderPage()
    const btn = getByTestId('gs-submit')
    expect(btn.disabled).toBe(true)
  })

  it('renders activity select with placeholder + __custom__ option last', () => {
    const { getByTestId } = renderPage()
    const select = getByTestId('gs-event')
    const options = Array.from(select.querySelectorAll('option'))
    // empty placeholder + custom sentinel (when no events available)
    expect(options.length).toBe(2)
    expect(options[0].value).toBe('')
    expect(options[options.length - 1].value).toBe('__custom__')
  })

  it('renders takenOn date input', () => {
    const { getByTestId } = renderPage()
    const input = getByTestId('gs-taken-on')
    expect(input).toBeTruthy()
    expect(input.getAttribute('type')).toBe('date')
  })

  it('field order in DOM: dropzone -> nickname -> activity -> date -> notes -> terms -> submit', () => {
    const { getByTestId } = renderPage()
    const ids = [
      'gs-dropzone',
      'gs-nickname',
      'gs-event',
      'gs-taken-on',
      'gs-caption',
      'gs-terms',
      'gs-submit',
    ]
    const elements = ids.map((id) => getByTestId(id))
    for (let i = 0; i < elements.length - 1; i += 1) {
      const a = elements[i]
      const b = elements[i + 1]
      // a should appear before b in document order.
      expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('renders Notes label (说明), not the old Caption label', () => {
    const { container } = renderPage()
    expect(container.textContent).toContain('说明')
    expect(container.textContent).not.toContain('图片说明')
  })
})

describe('GallerySubmit — client-side validation', () => {
  it('rejects > 8 MB file with inline error', async () => {
    const { getByTestId, findByText } = renderPage()
    const fileInput = getByTestId('gs-file-input')
    const big = jpegFile('big.jpg', 9 * 1024 * 1024)
    fireEvent.change(fileInput, { target: { files: [big] } })
    expect(await findByText(/文件超过 8 MB/)).toBeTruthy()
    expect(getByTestId('gs-submit').disabled).toBe(true)
  })

  it('rejects unsupported file type with inline error', async () => {
    const { getByTestId, findByText } = renderPage()
    const fileInput = getByTestId('gs-file-input')
    const pdf = new File([new Uint8Array(100)], 'doc.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(fileInput, { target: { files: [pdf] } })
    expect(await findByText(/仅支持 JPG/)).toBeTruthy()
  })

  it('accepts valid PNG and shows preview', async () => {
    const { getByTestId, findByText } = renderPage()
    const fileInput = getByTestId('gs-file-input')
    fireEvent.change(fileInput, { target: { files: [pngFile('a.png', 5000)] } })
    expect(await findByText('a.png')).toBeTruthy()
  })

  it('shows caption counter going red over 200 chars', async () => {
    const { getByTestId, findByText } = renderPage()
    const caption = getByTestId('gs-caption')
    fireEvent.change(caption, { target: { value: 'x'.repeat(201) } })
    expect(await findByText(/说明最长 200/)).toBeTruthy()
  })

  it('keeps submit disabled when terms unchecked', async () => {
    const { getByTestId } = renderPage()
    fireEvent.change(getByTestId('gs-file-input'), {
      target: { files: [pngFile()] },
    })
    fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    fireEvent.change(getByTestId('gs-event-custom'), { target: { value: 'evt' } })
    expect(getByTestId('gs-submit').disabled).toBe(true)
  })

  it('keeps submit disabled when activity unset (required)', async () => {
    const { getByTestId } = renderPage()
    fireEvent.change(getByTestId('gs-file-input'), {
      target: { files: [pngFile()] },
    })
    fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
    fireEvent.click(getByTestId('gs-terms'))
    expect(getByTestId('gs-submit').disabled).toBe(true)
  })

  it('keeps submit disabled when __custom__ picked but free-form empty', async () => {
    const { getByTestId } = renderPage()
    fireEvent.change(getByTestId('gs-file-input'), {
      target: { files: [pngFile()] },
    })
    fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    fireEvent.click(getByTestId('gs-terms'))
    expect(getByTestId('gs-submit').disabled).toBe(true)
  })

  it('enables submit when all required fields (incl. activity) valid + terms checked', async () => {
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
  })
})

describe('GallerySubmit — combobox state machine', () => {
  it('picking __custom__ reveals the free-form text input', async () => {
    const { getByTestId, queryByTestId } = renderPage()
    expect(queryByTestId('gs-event-custom')).toBeNull()
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    await waitFor(() => {
      expect(getByTestId('gs-event-custom')).toBeTruthy()
    })
  })

  it('switching from __custom__ to event row hides custom input and clears value', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      items: [{ id: 11, slug: 'a-show', title_zh: 'TEST 演出', title_en: 'TEST' }],
      total: 1,
    })
    const { getByTestId, queryByTestId } = renderPage()
    await waitFor(() => {
      expect(getByTestId('gs-event').querySelectorAll('option').length).toBe(3)
    })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    fireEvent.change(getByTestId('gs-event-custom'), {
      target: { value: 'temporary text' },
    })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '11' } })
    expect(queryByTestId('gs-event-custom')).toBeNull()
    // Switch back to custom: input is empty (no preservation).
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    await waitFor(() => {
      expect(getByTestId('gs-event-custom').value).toBe('')
    })
  })

  it('submits event_label when __custom__ picked + free-form text typed', async () => {
    const submitSpy = vi
      .spyOn(api, 'submitGalleryPhoto')
      .mockResolvedValue({ id: 1, status: 'pending', submitted_at: 1 })
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1)
    })
    const arg = submitSpy.mock.calls[0][0]
    expect(arg.eventLabel).toBe('test event')
    expect(arg.eventId).toBeUndefined()
  })

  it('submits event_id when an event row is picked', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      items: [{ id: 42, slug: 'a-show', title_zh: 'TEST 演出', title_en: 'TEST' }],
      total: 1,
    })
    const submitSpy = vi
      .spyOn(api, 'submitGalleryPhoto')
      .mockResolvedValue({ id: 2, status: 'pending', submitted_at: 1 })
    const { getByTestId } = renderPage()
    await waitFor(() => {
      expect(getByTestId('gs-event').querySelectorAll('option').length).toBe(3)
    })
    fireEvent.change(getByTestId('gs-file-input'), {
      target: { files: [pngFile()] },
    })
    fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '42' } })
    fireEvent.click(getByTestId('gs-terms'))
    await waitFor(() => {
      expect(getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(getByTestId('gs-submit'))
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1)
    })
    const arg = submitSpy.mock.calls[0][0]
    expect(arg.eventId).toBe('42')
    expect(arg.eventLabel).toBeUndefined()
  })

  it('whitespace-only free-form keeps submit disabled', async () => {
    const { getByTestId } = renderPage()
    fireEvent.change(getByTestId('gs-file-input'), {
      target: { files: [pngFile()] },
    })
    fireEvent.change(getByTestId('gs-nickname'), { target: { value: 'alice' } })
    fireEvent.change(getByTestId('gs-event'), { target: { value: '__custom__' } })
    fireEvent.change(getByTestId('gs-event-custom'), {
      target: { value: '      ' },
    })
    fireEvent.click(getByTestId('gs-terms'))
    expect(getByTestId('gs-submit').disabled).toBe(true)
  })
})

describe('GallerySubmit — date input', () => {
  it('submits takenOn=YYYY-MM-DD when date input filled', async () => {
    const submitSpy = vi
      .spyOn(api, 'submitGalleryPhoto')
      .mockResolvedValue({ id: 3, status: 'pending', submitted_at: 1 })
    const testing = renderPage()
    fillRequired(testing)
    fireEvent.change(testing.getByTestId('gs-taken-on'), {
      target: { value: '2024-03-15' },
    })
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1)
    })
    expect(submitSpy.mock.calls[0][0].takenOn).toBe('2024-03-15')
  })

  it('takenOn omitted when blank', async () => {
    const submitSpy = vi
      .spyOn(api, 'submitGalleryPhoto')
      .mockResolvedValue({ id: 4, status: 'pending', submitted_at: 1 })
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1)
    })
    expect(submitSpy.mock.calls[0][0].takenOn).toBeUndefined()
  })
})

describe('GallerySubmit — submission flow', () => {
  it('happy path: calls submitGalleryPhoto and shows success state', async () => {
    const submitSpy = vi
      .spyOn(api, 'submitGalleryPhoto')
      .mockResolvedValue({ id: 7, status: 'pending', submitted_at: 12345 })
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    expect(await testing.findByText('再投一张')).toBeTruthy()
    expect(submitSpy).toHaveBeenCalledTimes(1)
    const arg = submitSpy.mock.calls[0][0]
    expect(arg.nickname).toBe('alice')
  })

  it('shows rate-limit error on 429', async () => {
    vi.spyOn(api, 'submitGalleryPhoto').mockRejectedValue(
      new ApiError('rate', { status: 429, code: 'rate_limited' }),
    )
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    expect(await testing.findByText(/提交过于频繁/)).toBeTruthy()
  })

  it('shows server-side 415 format mismatch when PDF passed magic-byte check', async () => {
    vi.spyOn(api, 'submitGalleryPhoto').mockRejectedValue(
      new ApiError('mismatch', {
        status: 415,
        code: 'unsupported_media_type',
      }),
    )
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    expect(await testing.findByText(/文件格式不符/)).toBeTruthy()
  })

  it('renders network error when fetch fails', async () => {
    vi.spyOn(api, 'submitGalleryPhoto').mockRejectedValue(new Error('offline'))
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    expect(await testing.findByText(/网络异常/)).toBeTruthy()
  })

  it('reset button on success returns to empty form', async () => {
    vi.spyOn(api, 'submitGalleryPhoto').mockResolvedValue({
      id: 1,
      status: 'pending',
      submitted_at: 1,
    })
    const testing = renderPage()
    fillRequired(testing)
    await waitFor(() => {
      expect(testing.getByTestId('gs-submit').disabled).toBe(false)
    })
    fireEvent.click(testing.getByTestId('gs-submit'))
    await testing.findByText('再投一张')
    fireEvent.click(testing.getByText('再投一张'))
    await waitFor(() => {
      expect(testing.getByTestId('gs-nickname').value).toBe('')
    })
    expect(testing.getByTestId('gs-terms').checked).toBe(false)
  })
})

describe('GallerySubmit — event dropdown', () => {
  it('populates event options from /api/events upcoming (+ placeholder + __custom__ sentinel)', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      items: [
        { id: 11, slug: 'a-show', title_zh: 'TEST 演出', title_en: 'TEST' },
        { id: 12, slug: 'b-show', title_zh: '另一场', title_en: null },
      ],
      total: 2,
    })
    const { getByTestId } = renderPage()
    await waitFor(() => {
      const select = getByTestId('gs-event')
      const options = Array.from(select.querySelectorAll('option'))
      // placeholder + 2 events + __custom__ sentinel = 4
      expect(options.length).toBe(4)
      expect(options[options.length - 1].value).toBe('__custom__')
    })
  })
})
