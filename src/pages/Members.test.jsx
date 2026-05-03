import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'

vi.mock('../data/members.json', () => ({
  default: [
    {
      id: 'a1',
      name: 'Alice Anderson',
      role: 'organizer',
      oshiBand: 'roselia',
      oshiCharacter: 'Yukina Minato',
      city: 'San Francisco, CA',
      bio: 'Roselia stan since 2019.',
    },
    {
      id: 'b1',
      name: 'Bob Brown',
      role: 'member',
      oshiBand: 'mygo',
      city: 'Los Angeles, CA',
      bio: 'MyGO supporter.',
    },
    {
      id: 'c1',
      name: '戸山香澄',
      role: 'member',
      oshiBand: 'popipa',
      oshiCharacter: 'Kasumi Toyama',
      city: 'New York, NY',
      bio: 'Star player fan.',
    },
  ],
}))

import Members from './Members.jsx'

describe('Members page (with sample roster)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders H1 "Members"', () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
  })

  it('renders one chip per band present in roster', () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Poppin'Party" })).toBeInTheDocument()
  })

  it('renders all 3 sample members by default', () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bob Brown' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
  })

  it('clicking Roselia chip narrows grid to Roselia oshis', () => {
    renderWithProviders(<Members />, { route: '/members' })
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
    expect(screen.queryByRole('article', { name: '戸山香澄' })).toBeNull()
  })

  it('clicking Organizers radio narrows grid', () => {
    renderWithProviders(<Members />, { route: '/members' })
    fireEvent.click(screen.getByLabelText('Organizers'))
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
  })

  it('search input updates immediately but grid only updates after debounce', () => {
    renderWithProviders(<Members />, { route: '/members' })
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'kasumi' } })
    expect(input.value).toBe('kasumi')
    // Before debounce fires, all 3 still shown
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    // Advance timer past debounce
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByRole('article', { name: 'Alice Anderson' })).toBeNull()
    expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
  })

  it('typing fast then clearing before debounce yields no flicker', () => {
    renderWithProviders(<Members />, { route: '/members' })
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'kasumi' } })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    fireEvent.change(input, { target: { value: '' } })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    // search cleared before any debounce-fired mutation; all 3 still visible
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bob Brown' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '戸山香澄' })).toBeInTheDocument()
  })

  it('combined chip + role + search narrow correctly to one match', () => {
    renderWithProviders(<Members />, { route: '/members' })
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    fireEvent.click(screen.getByLabelText('Organizers'))
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'Yukina' },
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByRole('article', { name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Bob Brown' })).toBeNull()
  })

  it('zero-result filter shows empty message with role="status"', () => {
    renderWithProviders(<Members />, { route: '/members' })
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'no-such-thing' },
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status.textContent).toContain('No members')
  })

  it('subtitle is present and announces community context', () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(screen.getByText(/BanG Dream! NA community/)).toBeInTheDocument()
  })
})
