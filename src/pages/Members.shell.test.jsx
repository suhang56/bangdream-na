import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

// Mock useIsMobile so tests can flip the breakpoint before rendering Members.
vi.mock('../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

// Mock members.json with a small fixture so we don't depend on the real 700+
// roster (and keep tests fast + deterministic).
vi.mock('../data/members.json', () => ({
  default: [
    {
      id: '1',
      name: 'Kanade',
      role: 'organizer',
      oshiBand: 'roselia',
      oshiCharacter: 'Yukina',
      city: 'Seattle',
    },
    {
      id: '2',
      name: 'Sora',
      role: 'member',
      oshiBand: 'mygo',
      oshiCharacter: 'Tomori',
      city: 'Vancouver',
    },
    {
      id: '3',
      name: 'Mei',
      role: 'alumnus',
      city: 'Portland',
    },
  ],
}))

import { useIsMobile } from '../lib/useBreakpoint.js'
import Members from './Members.jsx'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('Members shell — breakpoint routing', () => {
  it('mounts mobile track when useIsMobile returns true', () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    expect(container.querySelector('.members-mobile')).not.toBeNull()
    expect(container.querySelector('main.section')).toBeNull()
  })

  it('mounts desktop track when useIsMobile returns false', () => {
    useIsMobile.mockReturnValue(false)
    const { container } = render(<Members />)
    expect(container.querySelector('.members-mobile')).toBeNull()
    expect(container.querySelector('main.section')).not.toBeNull()
  })

  it('passes the full members fixture into desktop track', () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.getByText('Sora')).toBeInTheDocument()
    expect(screen.getByText('Mei')).toBeInTheDocument()
  })

  it('passes the full members fixture into mobile track', () => {
    useIsMobile.mockReturnValue(true)
    render(<Members />)
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.getByText('Sora')).toBeInTheDocument()
    expect(screen.getByText('Mei')).toBeInTheDocument()
  })

  it('mobile track shows count pill with total/total at start', () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /3 \/ 3/,
    )
  })

  it('clicking a band chip filters the visible members (desktop)', () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.queryByText('Sora')).not.toBeInTheDocument()
  })

  it('typing in search input debounces filtering (200ms)', () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'Kan' } })
    // Before debounce fires: nothing filtered yet (still see Sora)
    expect(screen.getByText('Sora')).toBeInTheDocument()
    // Advance debounce timer
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.queryByText('Sora')).not.toBeInTheDocument()
  })

  it('selecting role=Organizers filters to only organizers', () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    fireEvent.click(screen.getByLabelText('Organizers'))
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.queryByText('Sora')).not.toBeInTheDocument()
    expect(screen.queryByText('Mei')).not.toBeInTheDocument()
  })

  it('mobile count pill reflects filtered shown / total', () => {
    useIsMobile.mockReturnValue(true)
    const { container } = render(<Members />)
    fireEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /1 \/ 3/,
    )
  })

  it('availableBands skips members with empty/missing oshiBand', () => {
    useIsMobile.mockReturnValue(false)
    render(<Members />)
    // Mei has no oshiBand → should not contribute a chip; only roselia + mygo
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "Poppin'Party" }),
    ).not.toBeInTheDocument()
  })

  it('exactly one main element renders regardless of which track mounts', () => {
    useIsMobile.mockReturnValue(false)
    const { container, rerender } = render(<Members />)
    expect(container.querySelectorAll('main').length).toBe(1)
    useIsMobile.mockReturnValue(true)
    rerender(<Members />)
    expect(container.querySelectorAll('main').length).toBe(1)
  })
})
