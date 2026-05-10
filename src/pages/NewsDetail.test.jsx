import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../theme/ThemeContext.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchNewsBySlug: vi.fn(),
  }
})

import { fetchNewsBySlug } from '../lib/api.js'
import NewsDetail from './NewsDetail.jsx'

function renderWithRoute(slug) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/news/${slug}`]}>
        <Routes>
          <Route path="/news/:id" element={<NewsDetail />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

const sampleApiRow = {
  id: 1,
  slug: 'news-a',
  title_zh: '公告标题',
  title_en: null,
  body_md: 'First paragraph line.\nSecond line of first paragraph.\n\nSecond paragraph here.',
  category: 'announcement',
  hero_image_url: 'https://cdn.bangdream.org/news/a.png',
  tags: [],
  published_at: Math.floor(Date.parse('2026-04-01T00:00:00Z') / 1000),
  created_at: 0,
  updated_at: 0,
}

describe('<NewsDetail /> bf-design', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchNewsBySlug).mockReset()
  })

  afterEach(() => {
    cache.clear()
  })

  it('shows LoadingState while pending', async () => {
    let resolveFetch
    vi.mocked(fetchNewsBySlug).mockImplementation(
      () => new Promise((r) => { resolveFetch = r }),
    )
    const { container } = renderWithRoute('news-a')
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveFetch(sampleApiRow)
    await waitFor(() => {
      expect(container.querySelector('.loading-state')).toBeNull()
    })
  })

  it('renders bf-page-hd section on success', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    const { container } = renderWithRoute('news-a')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(container.querySelector('.bf-page-hd')).not.toBeNull()
  })

  it('renders post heading when fetch resolves', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    renderWithRoute('news-a')
    expect(
      await screen.findByRole('heading', { level: 1, name: '公告标题' }),
    ).toBeInTheDocument()
  })

  it('renders body paragraphs', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    renderWithRoute('news-a')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(screen.getByText(/First paragraph line/)).toBeInTheDocument()
  })

  it('renders not-found state when fetch returns null', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(null)
    renderWithRoute('missing')
    expect(
      await screen.findByRole('heading', { level: 1, name: /未找到/ }),
    ).toBeInTheDocument()
  })

  it('renders ErrorState on rejected fetch with retry button', async () => {
    vi.mocked(fetchNewsBySlug).mockRejectedValueOnce(new Error('500'))
    renderWithRoute('news-a')
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    vi.mocked(fetchNewsBySlug).mockResolvedValueOnce(sampleApiRow)
    await userEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 1, name: '公告标题' }),
    ).toBeInTheDocument()
  })

  it('passes URL slug param to fetchNewsBySlug', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    renderWithRoute('some-encoded-slug')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(fetchNewsBySlug).toHaveBeenCalledWith('some-encoded-slug')
  })

  // Edge 7: URL-encoded Chinese slug
  it('decodes URL-encoded Chinese slug before calling fetch', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    const encoded = encodeURIComponent('北美邦花篮-53萝p')
    renderWithRoute(encoded)
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(fetchNewsBySlug).toHaveBeenCalledWith('北美邦花篮-53萝p')
  })

  it('renders nd-hero-img when hero_image_url present', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    const { container } = renderWithRoute('news-a')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(container.querySelector('.nd-hero-img')).not.toBeNull()
  })

  // Edge 2: missing image
  it('omits hero image when hero_image_url is null', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue({ ...sampleApiRow, hero_image_url: null })
    const { container } = renderWithRoute('news-a')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    expect(container.querySelector('.nd-hero-img')).toBeNull()
  })

  it('renders nd-back link pointing to /news', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue(sampleApiRow)
    const { container } = renderWithRoute('news-a')
    await screen.findByRole('heading', { level: 1, name: '公告标题' })
    const back = container.querySelector('.nd-back')
    expect(back).not.toBeNull()
    expect(back.getAttribute('href')).toBe('/news')
  })

  // Edge 8: malformed date published_at
  it('renders without crash when published_at is null', async () => {
    vi.mocked(fetchNewsBySlug).mockResolvedValue({ ...sampleApiRow, published_at: null })
    renderWithRoute('news-a')
    expect(
      await screen.findByRole('heading', { level: 1, name: '公告标题' }),
    ).toBeInTheDocument()
  })
})
