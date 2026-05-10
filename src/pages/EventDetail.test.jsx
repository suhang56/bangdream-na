import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EventDetail from './EventDetail.jsx'
import * as api from '../lib/api.js'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/events/:slug" element={<EventDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<EventDetail /> — PR #110 slug regression', () => {
  let fetchSpy
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    fetchSpy = vi.spyOn(api, 'fetchEventBySlug')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls fetchEventBySlug with slug string from URL (not id)', async () => {
    fetchSpy.mockResolvedValue(null)
    renderAt('/events/roselia-la')
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('roselia-la')
    })
  })

  it('does NOT call fetchEventBySlug with a numeric argument', async () => {
    fetchSpy.mockResolvedValue(null)
    renderAt('/events/mygo-tour-2099')
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const arg = fetchSpy.mock.calls[0][0]
      expect(/^\d+$/.test(String(arg))).toBe(false)
    })
  })
})

describe('<EventDetail /> — bf-helper layout', () => {
  let fetchSpy
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    fetchSpy = vi.spyOn(api, 'fetchEventBySlug')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function fullEventRow(overrides = {}) {
    return {
      id: 1,
      slug: overrides.slug ?? 'roselia-la',
      title_zh: overrides.title ?? 'Roselia LA Live',
      title_en: null,
      description_md: overrides.description ?? '北美巡演',
      hero_image_url: overrides.image ?? null,
      start_at: 1_780_000_000,
      end_at: null,
      venue: overrides.venue ?? 'Wiltern',
      city: overrides.city ?? 'Los Angeles',
      ticket_url: overrides.ticketUrl ?? 'https://example.com/buy',
      band_theme: null,
      ...overrides._raw,
    }
  }

  it('renders bf-helper box containing ticket link when ticket_url present', async () => {
    fetchSpy.mockResolvedValue(fullEventRow())
    const { container } = renderAt('/events/roselia-la')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Roselia LA Live' })).toBeInTheDocument()
    })
    const helpers = container.querySelectorAll('.bf-helper')
    expect(helpers.length).toBeGreaterThan(0)
    const ticketLink = container.querySelector('.bf-helper a[href="https://example.com/buy"]')
    expect(ticketLink).not.toBeNull()
    expect(ticketLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders bf-helper box for location', async () => {
    fetchSpy.mockResolvedValue(fullEventRow({ city: 'Chicago', venue: 'United Center' }))
    const { container } = renderAt('/events/some-event')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    const helpers = container.querySelectorAll('.bf-helper')
    expect(helpers.length).toBeGreaterThan(0)
    const allText = Array.from(helpers).map((h) => h.textContent).join(' ')
    expect(allText).toMatch(/Chicago|United Center/)
  })

  it('omits ticket helper when ticket_url is empty', async () => {
    fetchSpy.mockResolvedValue(fullEventRow({ ticketUrl: '' }))
    const { container } = renderAt('/events/free-meet')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    const ticketLink = container.querySelector('.bf-helper a[href^="http"]')
    expect(ticketLink).toBeNull()
  })

  it('renders hero image when hero_image_url present', async () => {
    fetchSpy.mockResolvedValue(fullEventRow({ image: 'https://cdn.example.com/hero.jpg' }))
    const { container } = renderAt('/events/some-event')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    const img = container.querySelector('img[src="https://cdn.example.com/hero.jpg"]')
    expect(img).not.toBeNull()
  })

  it('shows not-found state when API returns null', async () => {
    fetchSpy.mockResolvedValue(null)
    renderAt('/events/missing-event')
    await waitFor(() => {
      expect(screen.getByText('未找到这个活动')).toBeInTheDocument()
    })
  })

  it('renders back link to /events', async () => {
    fetchSpy.mockResolvedValue(fullEventRow())
    const { container } = renderAt('/events/roselia-la')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    const backLink = container.querySelector('a[href="/events"]')
    expect(backLink).not.toBeNull()
  })
})
