import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeroCarousel from './HeroCarousel.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const NOW = new Date('2026-06-01T00:00:00Z')

const events = [
  {
    id: 'a',
    title: 'Roselia LA',
    date: '2026-07-04T19:00:00Z',
    location: 'LA',
    type: 'concert',
    image: 'https://example.com/a.jpg',
  },
  {
    id: 'b',
    title: 'Mygo NYC',
    date: '2026-08-15T19:00:00Z',
    location: 'NYC',
    type: 'concert',
  },
  {
    id: 'c',
    title: 'Past show',
    date: '2025-01-01',
    location: 'X',
    type: 'concert',
  },
]

describe('<HeroCarousel />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    _resetForTests()
    vi.useRealTimers()
  })

  it('renders nothing when events is empty (edge)', () => {
    const { container } = render(<HeroCarousel events={[]} now={NOW} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only past events (edge)', () => {
    const { container } = render(
      <HeroCarousel events={[events[2]]} now={NOW} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders single upcoming event without prev/next (edge)', () => {
    render(<HeroCarousel events={[events[0]]} now={NOW} />)
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous event/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /next event/i })).toBeNull()
  })

  it('renders 2 upcoming events with prev/next + dots', () => {
    render(<HeroCarousel events={events} now={NOW} />)
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous event/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next event/i })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(2)
  })

  it('clicking next advances the slide', async () => {
    const user = userEvent.setup()
    render(<HeroCarousel events={events} now={NOW} />)
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next event/i }))
    expect(screen.getByText('Mygo NYC')).toBeInTheDocument()
  })

  it('clicking prev wraps backward', async () => {
    const user = userEvent.setup()
    render(<HeroCarousel events={events} now={NOW} />)
    await user.click(screen.getByRole('button', { name: /previous event/i }))
    expect(screen.getByText('Mygo NYC')).toBeInTheDocument()
  })

  it('arrow keys navigate (edge — keyboard nav)', async () => {
    const user = userEvent.setup()
    const { container } = render(<HeroCarousel events={events} now={NOW} />)
    const root = container.querySelector('.hero-carousel')
    root.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Mygo NYC')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
  })

  it('respects max prop', () => {
    const many = Array.from({ length: 10 }).map((_, i) => ({
      ...events[0],
      id: 'x' + i,
      title: 'Event ' + i,
      date: '2026-07-' + (10 + i).toString().padStart(2, '0'),
    }))
    render(<HeroCarousel events={many} max={3} now={NOW} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(3)
  })

  it('respects prefers-reduced-motion (edge)', () => {
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    vi.useFakeTimers({ shouldAdvanceTime: false })
    render(<HeroCarousel events={events} now={NOW} intervalMs={1} />)
    // would advance immediately without reduced-motion guard
    vi.advanceTimersByTime(100)
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
  })

  it('clicking a dot jumps to that slide', async () => {
    const user = userEvent.setup()
    render(<HeroCarousel events={events} now={NOW} />)
    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[1])
    expect(screen.getByText('Mygo NYC')).toBeInTheDocument()
  })

  it('image prop applied as backgroundImage', () => {
    const { container } = render(
      <HeroCarousel events={[events[0]]} now={NOW} />,
    )
    const slide = container.querySelector('.hero-carousel__slide')
    expect(slide.style.backgroundImage).toContain('example.com/a.jpg')
  })
})
