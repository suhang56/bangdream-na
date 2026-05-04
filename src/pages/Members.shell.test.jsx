import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { cache } from '../lib/cache.js'

vi.mock('../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchMembers: vi.fn(),
  }
})

import { useIsMobile } from '../lib/useBreakpoint.js'
import { fetchMembers } from '../lib/api.js'
import Members from './Members.jsx'

const sampleApiRows = [
  {
    id: 1,
    external_id: '1',
    display_name: 'Kanade',
    city: 'Seattle',
    oshi_character: 'Yukina',
    oshi_band: 'roselia',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 2,
    external_id: '2',
    display_name: 'Sora',
    city: 'Vancouver',
    oshi_character: 'Tomori',
    oshi_band: 'mygo',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 3,
    external_id: '3',
    display_name: 'Mei',
    city: 'Portland',
    oshi_character: null,
    oshi_band: null,
    avatar_url: null,
    expedition_member: 0,
  },
]

beforeEach(() => {
  cache.clear()
  vi.mocked(fetchMembers).mockReset()
  vi.mocked(fetchMembers).mockResolvedValue({
    items: sampleApiRows,
    total: sampleApiRows.length,
  })
})

afterEach(() => {
  cache.clear()
  vi.clearAllMocks()
})

describe('Members shell — breakpoint routing', () => {
  it('mounts mobile track when useIsMobile returns true', async () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    await waitFor(() => {
      expect(container.querySelector('.members-mobile')).not.toBeNull()
    })
    expect(container.querySelector('main.section')).toBeNull()
  })

  it('mounts desktop track when useIsMobile returns false', async () => {
    useIsMobile.mockReturnValue(false)
    const { container } = render(<Members />)
    await waitFor(() => {
      expect(container.querySelector('main.section')).not.toBeNull()
    })
    expect(container.querySelector('.members-mobile')).toBeNull()
  })

  it('passes the full members fixture into desktop track', async () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    await screen.findByText('Kanade')
    expect(screen.getByText('Sora')).toBeInTheDocument()
    expect(screen.getByText('Mei')).toBeInTheDocument()
  })

  it('passes the full members fixture into mobile track', async () => {
    useIsMobile.mockReturnValue(true)
    render(<Members />)
    await screen.findByText('Kanade')
    expect(screen.getByText('Sora')).toBeInTheDocument()
    expect(screen.getByText('Mei')).toBeInTheDocument()
  })

  it('mobile track shows count pill with total/total at start', async () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    await screen.findByText('Kanade')
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /3 \/ 3/,
    )
  })

  it('clicking a band chip filters the visible members (desktop)', async () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    await screen.findByText('Kanade')
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.queryByText('Sora')).not.toBeInTheDocument()
  })

  it('typing in search input debounces filtering (200ms)', async () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    await screen.findByText('Kanade')
    vi.useFakeTimers()
    try {
      const input = screen.getByLabelText('Search')
      fireEvent.change(input, { target: { value: 'Kan' } })
      expect(screen.getByText('Sora')).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(screen.getByText('Kanade')).toBeInTheDocument()
      expect(screen.queryByText('Sora')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('selecting role=Organizers filters to zero (D1 has no role yet)', async () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    await screen.findByText('Kanade')
    fireEvent.click(screen.getByLabelText('Organizers'))
    // R5b: adapter sets all members role='member'; Organizers filter → empty.
    expect(screen.queryByText('Kanade')).not.toBeInTheDocument()
    expect(screen.queryByText('Sora')).not.toBeInTheDocument()
    expect(screen.queryByText('Mei')).not.toBeInTheDocument()
  })

  it('mobile count pill reflects filtered shown / total', async () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    await screen.findByText('Kanade')
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /1 \/ 3/,
    )
  })

  it('availableBands skips members with empty/missing oshiBand', async () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    await screen.findByText('Kanade')
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "Poppin'Party" }),
    ).not.toBeInTheDocument()
  })

  it('exactly one main element renders regardless of which track mounts', async () => {
    useIsMobile.mockReturnValue(false)
    const { container, rerender } = render(<Members />)
    await screen.findByText('Kanade')
    expect(container.querySelectorAll('main').length).toBe(1)
    useIsMobile.mockReturnValue(true)
    rerender(<Members />)
    expect(container.querySelectorAll('main').length).toBe(1)
  })
})
