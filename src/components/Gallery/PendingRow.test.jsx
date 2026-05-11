import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import PendingRow from './PendingRow.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function baseItem(overrides = {}) {
  return {
    id: 1,
    thumbnail_url: 'https://cdn.example.org/submissions/1.jpg',
    r2_key: 'submissions/1.jpg',
    nickname: 'alice',
    caption: 'a caption',
    event: null,
    taken_on: null,
    submitted_at: Math.floor(Date.now() / 1000) - 600,
    status: 'pending',
    ip_hash: 'abc',
    width: 800,
    height: 600,
    size_bytes: 12345,
    content_type: 'image/jpeg',
    reviewed_at: null,
    rejection_reason: null,
    gallery_item_id: null,
    ...overrides,
  }
}

function renderRow(item) {
  return render(
    <ul>
      <PendingRow
        item={item}
        onApprove={() => {}}
        onReject={() => {}}
        approving={false}
        rejecting={false}
        error={null}
      />
    </ul>,
  )
}

beforeEach(() => {
  _resetForTests()
  setLanguage('zh')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PendingRow — taken_on formatting (rendered)', () => {
  it('renders ISO YYYY-MM-DD as YYYY.MM.DD', () => {
    const { container } = renderRow(baseItem({ taken_on: '2024-03-15' }))
    expect(container.textContent).toContain('2024.03.15')
  })

  it('does NOT contain the raw ISO format with hyphens after rendering', () => {
    const { container } = renderRow(baseItem({ taken_on: '2024-03-15' }))
    const line = container.querySelector('.pending-row__taken-on')
    expect(line.textContent).not.toContain('2024-03-15')
  })
})

describe('PendingRow — event cell rendering', () => {
  it('renders event_label with ⚠ warn glyph for label-only rows', () => {
    const { container, getByLabelText } = renderRow(
      baseItem({ event: { label: '私下聚会', verified: false } }),
    )
    expect(container.textContent).toContain('私下聚会')
    const warn = container.querySelector('.pending-row__event-warn')
    expect(warn).toBeTruthy()
    expect(warn.textContent).toBe('⚠')
    expect(warn.getAttribute('role')).toBe('img')
    expect(getByLabelText('未关联到 events 表')).toBeTruthy()
  })

  it('renders event title_zh without ⚠ for event_id rows', () => {
    const { container } = renderRow(
      baseItem({
        event: { id: 11, slug: 'a-show', title_zh: 'TEST 演出' },
      }),
    )
    expect(container.textContent).toContain('TEST 演出')
    expect(container.querySelector('.pending-row__event-warn')).toBeNull()
  })

  it('falls back to slug when title_zh missing on event_id row', () => {
    const { container } = renderRow(
      baseItem({
        event: { id: 11, slug: 'a-show', title_zh: null },
      }),
    )
    expect(container.textContent).toContain('a-show')
    expect(container.querySelector('.pending-row__event-warn')).toBeNull()
  })

  it('renders em-dash and no ⚠ when event is null (legacy row)', () => {
    const { container } = renderRow(baseItem({ event: null }))
    expect(container.textContent).toContain('—')
    expect(container.querySelector('.pending-row__event-warn')).toBeNull()
  })
})

describe('PendingRow — taken_on line', () => {
  it('renders taken_on line with label + reformatted date', () => {
    const { container, getByTestId } = renderRow(
      baseItem({ id: 5, taken_on: '2024-03-15' }),
    )
    const line = getByTestId('pending-row-taken-on-5')
    expect(line).toBeTruthy()
    expect(line.textContent).toContain('拍摄')
    expect(line.textContent).toContain('2024.03.15')
    expect(container.querySelector('.pending-row__taken-on')).toBeTruthy()
  })

  it('omits taken_on line entirely when null', () => {
    const { queryByTestId, container } = renderRow(
      baseItem({ id: 6, taken_on: null }),
    )
    expect(queryByTestId('pending-row-taken-on-6')).toBeNull()
    expect(container.querySelector('.pending-row__taken-on')).toBeNull()
  })
})

describe('PendingRow — ⚠ glyph is Unicode (HC7)', () => {
  it('warn span contains U+26A0 codepoint, not an SVG element', () => {
    const { container } = renderRow(
      baseItem({ event: { label: 'audit', verified: false } }),
    )
    const warn = container.querySelector('.pending-row__event-warn')
    expect(warn.textContent).toBe('⚠')
    expect(warn.querySelector('svg')).toBeNull()
  })
})
