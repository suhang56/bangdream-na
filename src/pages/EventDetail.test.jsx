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

describe('<EventDetail />', () => {
  let fetchSpy
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    fetchSpy = vi.spyOn(api, 'fetchEventBySlug')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows not-found state when API returns null', async () => {
    fetchSpy.mockResolvedValue(null)
    renderAt('/events/missing-event')
    await waitFor(() => {
      expect(screen.getByText('未找到这个活动')).toBeInTheDocument()
    })
  })

  it('renders title + ticket button when event exists', async () => {
    fetchSpy.mockResolvedValue({
      id: 1,
      slug: 'roselia-la',
      title_zh: 'Roselia LA Live',
      title_en: null,
      description_md: '北美巡演',
      hero_image_url: 'https://cdn/x.png',
      start_at: 1_780_000_000,
      end_at: null,
      venue: 'Wiltern',
      city: 'Los Angeles',
      ticket_url: 'https://example.com/buy',
      band_theme: 'Roselia',
    })
    renderAt('/events/roselia-la')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Roselia LA Live' })).toBeInTheDocument()
    })
    const ticketBtn = screen.getByRole('link', { name: '购票' })
    expect(ticketBtn.getAttribute('href')).toBe('https://example.com/buy')
    expect(ticketBtn.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('omits ticket button when ticket_url is empty', async () => {
    fetchSpy.mockResolvedValue({
      id: 2,
      slug: 'free-meet',
      title_zh: 'Free Meet',
      title_en: null,
      description_md: '',
      hero_image_url: null,
      start_at: 1_780_000_000,
      end_at: null,
      venue: null,
      city: 'Tokyo',
      ticket_url: '',
      band_theme: null,
    })
    renderAt('/events/free-meet')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Free Meet' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: '购票' })).toBeNull()
  })
})
