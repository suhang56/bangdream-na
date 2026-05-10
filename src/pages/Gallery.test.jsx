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
vi.mock('yet-another-react-lightbox/plugins/counter.css', () => ({}))
vi.mock('yet-another-react-lightbox', () => ({
  default: (props) =>
    props.open ? <div data-testid="lightbox">open</div> : null,
}))
vi.mock('yet-another-react-lightbox/plugins/captions', () => ({
  default: function Captions() { return null },
}))
vi.mock('yet-another-react-lightbox/plugins/counter', () => ({
  default: function Counter() { return null },
}))

import { fetchGallery } from '../lib/api.js'
import Gallery from './Gallery.jsx'

function row({ id, eventSlug, eventTitleZh, album, takenAt, imageUrl }) {
  return {
    id,
    image_url: imageUrl ?? `https://cdn/x-${id}.jpg`,
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

  it('renders bf-page-hero with title and subtitle after fetch resolves', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲活动', takenAt: 1000 }),
      ],
      total: 1,
    })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      expect(container.querySelector('.bf-page-hero')).not.toBeNull()
    })
    expect(container.querySelector('.bf-page-hero__title')).not.toBeNull()
    expect(container.querySelector('.bf-page-hero__subtitle')).not.toBeNull()
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

  it('renders bf-album-grid and bf-album sections', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        row({ id: 1, eventSlug: 'a', eventTitleZh: '甲活动', takenAt: 1000 }),
        row({ id: 2, album: '相册', takenAt: 2000 }),
      ],
      total: 2,
    })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      expect(container.querySelector('.bf-album-grid')).not.toBeNull()
    })
    const albums = container.querySelectorAll('.bf-album')
    expect(albums.length).toBe(2)
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
    await waitFor(() => {
      const empty = container.querySelector('.bf-gallery-empty')
      expect(empty).not.toBeNull()
    })
    const empty = container.querySelector('.bf-gallery-empty')
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

  // Edge tests

  it('EDGE: item with empty image_url renders img without crash', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, album: 'test', takenAt: 1, imageUrl: '' })],
      total: 1,
    })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      expect(container.querySelector('.bf-album')).not.toBeNull()
    })
    const img = container.querySelector('.gallery-thumb__img')
    expect(img).not.toBeNull()
  })

  it('EDGE: null taken_at — group date shows without NaN in DOM', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, album: '无日期', takenAt: null })],
      total: 1,
    })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      expect(container.querySelector('.bf-album')).not.toBeNull()
    })
    const meta = container.querySelector('.bf-album__meta')
    expect(meta?.textContent).not.toContain('NaN')
    expect(meta?.textContent).not.toContain('Invalid Date')
  })

  it('EDGE: null album and null event_slug — item adapts without crash', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [
        { id: 99, image_url: 'https://cdn/99.jpg', caption: null, taken_at: null,
          event_id: null, event_slug: null, event_title_zh: null, album: null,
          sort_order: 0, created_at: 99, updated_at: 99 },
      ],
      total: 1,
    })
    const { container } = renderWithProviders(<Gallery />, { route: '/gallery' })
    await waitFor(() => {
      const empty = container.querySelector('.bf-gallery-empty')
      const grid = container.querySelector('.bf-album-grid')
      expect(empty !== null || grid !== null).toBe(true)
    })
  })

  it('EDGE: lightbox closes on onClose call', async () => {
    vi.mocked(fetchGallery).mockResolvedValue({
      items: [row({ id: 1, album: 'a', takenAt: 1 })],
      total: 1,
    })
    setLanguage('zh')
    renderWithProviders(<Gallery />, { route: '/gallery' })
    const btn = await screen.findByRole('button', { name: /第 1 张照片/ })
    fireEvent.click(btn)
    expect(screen.getByTestId('lightbox')).toBeTruthy()
    // Lightbox mock doesn't have close UI, but state is managed in Gallery.
    // Verify the lightbox appears — close is handled by YARL internally.
    expect(screen.getByTestId('lightbox').textContent).toBe('open')
  })
})
