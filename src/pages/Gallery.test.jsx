import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { cache } from '../lib/cache.js'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchGallery: vi.fn(),
  }
})

vi.mock('yet-another-react-lightbox/styles.css', () => ({}))
vi.mock('yet-another-react-lightbox/plugins/captions.css', () => ({}))
vi.mock('yet-another-react-lightbox', () => ({
  default: (props) =>
    props.open ? <div data-testid="lightbox">open</div> : null,
}))
vi.mock('yet-another-react-lightbox/plugins/captions', () => ({
  default: function Captions() { return null },
}))

import { fetchGallery } from '../lib/api.js'
import Gallery from './Gallery.jsx'

function row({ id, eventSlug, eventTitleZh, album, takenAt }) {
  return {
    id,
    image_url: `https://cdn/x-${id}.jpg`,
    caption: '',
    taken_at: takenAt ?? null,
    event_id: eventSlug ? id : null,
    event_slug: eventSlug ?? null,
    event_title_zh: eventTitleZh ?? null,
    album: album ?? null,
    sort_order: 0,
    created_at: id,
    updated_at: id,
  }
}

beforeEach(() => {
  cache.clear()
  vi.mocked(fetchGallery).mockReset()
  _resetForTests()
})
afterEach(() => {
  cache.clear()
  _resetForTests()
})

describe('<Gallery />', () => {
  it('renders LoadingState while fetch pending', () => {
    vi.mocked(fetchGallery).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<Gallery />, { route: '/gallery' })
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('renders grouped sections after fetch resolves', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲活动', takenAt: 1000 }),
        row({ id: 2, album: '随手', takenAt: 2000 }),
      ],
      total: 2,
    })
    renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(2)
    })
    expect(screen.getByText('甲活动')).toBeTruthy()
    expect(screen.getByText('随手')).toBeTruthy()
  })

  it('dropdown selection narrows to a single group', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
        row({ id: 2, album: '相册', takenAt: 2000 }),
      ],
      total: 2,
    })
    renderWithProviders(<Gallery />, { route: '/gallery' })
    await screen.findByText('甲')
    const select = screen.getByLabelText('Filter by album')
    fireEvent.change(select, { target: { value: 'event-a' } })
    expect(screen.getByText('甲')).toBeTruthy()
    expect(screen.queryByText('相册')).toBeNull()
  })

  it('clear button on active-filter pill restores 全部', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
        row({ id: 2, album: '相册', takenAt: 2000 }),
      ],
      total: 2,
    })
    renderWithProviders(<Gallery />, { route: '/gallery?album=event-a' })
    await screen.findByText('甲')
    expect(screen.queryByText('相册')).toBeNull()
    const clearBtn = screen.getByLabelText('Clear filter')
    fireEvent.click(clearBtn)
    await waitFor(() => expect(screen.getByText('相册')).toBeTruthy())
  })

  it('clicking a group header narrows filter to that group', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
        row({ id: 2, album: '相册', takenAt: 2000 }),
      ],
      total: 2,
    })
    renderWithProviders(<Gallery />, { route: '/gallery' })
    const header = await screen.findByText('甲')
    // The header is wrapped in a button; click the parent button.
    fireEvent.click(header.closest('button'))
    await waitFor(() => expect(screen.queryByText('相册')).toBeNull())
    expect(screen.getByText('甲')).toBeTruthy()
  })

  it('URL ?album=<id> applies filter on mount', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
        row({ id: 2, album: '相册', takenAt: 2000 }),
      ],
      total: 2,
    })
    renderWithProviders(<Gallery />, { route: '/gallery?album=album-album' })
    await screen.findByText('相册')
    expect(screen.queryByText('甲')).toBeNull()
  })

  it('renders empty state when API returns 0 items', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({ items: [], total: 0 })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    // Wait for the empty-state <p> to appear (post-loading). Query by class
    // so the assertion isn't locale-dependent and works for desktop+mobile
    // tracks both. Avoids the trap where waitFor on an absent button passes
    // during the loading state too.
    await waitFor(() => {
      const empty =
        container.querySelector('.gallery-page__empty') ||
        container.querySelector('.gallery-page-mobile__empty')
      expect(empty).not.toBeNull()
    })
    const empty =
      container.querySelector('.gallery-page__empty') ||
      container.querySelector('.gallery-page-mobile__empty')
    expect(empty?.textContent?.length ?? 0).toBeGreaterThan(0)
  })

  it('renders empty-after-filter when URL param matches no group', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1 })],
      total: 1,
    })
    renderWithProviders(<Gallery />, { route: '/gallery?album=does-not-exist' })
    await waitFor(() => {
      expect(screen.queryByText('甲')).toBeNull()
    })
    expect(screen.getByText('No photos match this filter.')).toBeTruthy()
  })

  it('opens lightbox on thumb click', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, album: 'a', takenAt: 1 })],
      total: 1,
    })
    setLanguage('zh')
    renderWithProviders(<Gallery />, { route: '/gallery' })
    const btn = await screen.findByRole('button', { name: /第 1 张照片/ })
    fireEvent.click(btn)
    expect(screen.getByTestId('lightbox')).toBeTruthy()
  })

  it('hash anchor #event-slug scrolls into the matching group on mount', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, eventSlug: 'meet-2024', eventTitleZh: '聚会', takenAt: 1 })],
      total: 1,
    })
    const scrollSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '#event-meet-2024' },
    })
    Element.prototype.scrollIntoView = scrollSpy
    renderWithProviders(<Gallery />, { route: '/gallery' })
    await screen.findByText('聚会')
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
  })
})
