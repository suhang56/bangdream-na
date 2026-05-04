import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, act, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchMembers: vi.fn(),
  }
})

import { fetchMembers } from '../lib/api.js'
import Members from './Members.jsx'

const sampleApiRows = [
  {
    id: 1,
    external_id: 'a1',
    display_name: 'Alice Anderson',
    city: 'San Francisco, CA',
    oshi_character: 'Yukina Minato',
    oshi_band: 'roselia',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 2,
    external_id: 'b1',
    display_name: 'Bob Brown',
    city: 'Los Angeles, CA',
    oshi_character: null,
    oshi_band: 'mygo',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 3,
    external_id: 'c1',
    display_name: '戸山香澄',
    city: 'New York, NY',
    oshi_character: 'Kasumi Toyama',
    oshi_band: 'popipa',
    avatar_url: null,
    expedition_member: 0,
  },
]

describe('Members page (with sample roster)', () => {
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
  })

  it('renders H1 "Members"', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Members' }),
    ).toBeInTheDocument()
  })

  it('renders one chip per band present in roster', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(await screen.findByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Poppin'Party" })).toBeInTheDocument()
  })

  it('renders all 3 sample members by default', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(
      await screen.findByRole('article', { name: 'Alice Anderson' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bob Brown' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
  })

  it('clicking Roselia chip narrows grid to Roselia oshis', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
    expect(screen.queryByRole('article', { name: '戸山香澄' })).toBeNull()
  })

  it('clicking Organizers radio narrows grid to zero (no organizer in API)', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    fireEvent.click(screen.getByLabelText('Organizers'))
    // R5b: D1 schema does not carry role; adapter sets role='member' for all,
    // so Organizers filter narrows to empty set. Empty-state status appears.
    expect(screen.queryByRole('article', { name: 'Alice Anderson' })).toBeNull()
    expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
  })

  it('search input updates immediately but grid only updates after debounce', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    vi.useFakeTimers()
    try {
      const input = screen.getByLabelText('Search')
      fireEvent.change(input, { target: { value: 'kasumi' } })
      expect(input.value).toBe('kasumi')
      expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(screen.queryByRole('article', { name: 'Alice Anderson' })).toBeNull()
      expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('typing fast then clearing before debounce yields no flicker', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    vi.useFakeTimers()
    try {
      const input = screen.getByLabelText('Search')
      fireEvent.change(input, { target: { value: 'kasumi' } })
      act(() => {
        vi.advanceTimersByTime(50)
      })
      fireEvent.change(input, { target: { value: '' } })
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
      expect(screen.getByRole('article', { name: 'Bob Brown' })).toBeInTheDocument()
      expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('combined chip + search narrow correctly to one match', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    vi.useFakeTimers()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
      fireEvent.change(screen.getByLabelText('Search'), {
        target: { value: 'Yukina' },
      })
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
      expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('zero-result filter shows empty message with role="status"', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    vi.useFakeTimers()
    try {
      fireEvent.change(screen.getByLabelText('Search'), {
        target: { value: 'no-such-thing' },
      })
      act(() => {
        vi.advanceTimersByTime(250)
      })
      const status = screen.getByRole('status')
      expect(status).toBeInTheDocument()
      expect(status.textContent).toContain('No members')
    } finally {
      vi.useRealTimers()
    }
  })

  it('subtitle is present and announces community context', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByRole('article', { name: 'Alice Anderson' })
    expect(screen.getByText(/BanG Dream! NA community/)).toBeInTheDocument()
  })

  it('shows LoadingState while pending', async () => {
    let resolveFetch
    vi.mocked(fetchMembers).mockImplementation(
      () => new Promise((r) => { resolveFetch = r }),
    )
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveFetch({ items: sampleApiRows, total: sampleApiRows.length })
    await waitFor(() => {
      expect(screen.queryByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    })
  })

  it('shows ErrorState with retry on fetch reject', async () => {
    vi.mocked(fetchMembers).mockRejectedValueOnce(new Error('5xx'))
    renderWithProviders(<Members />, { route: '/members' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
