import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import HeroPeekCarousel from './HeroPeekCarousel.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const mkPost = (i, overrides = {}) => ({
  id: 'p' + i,
  image: '/p' + i + '.jpg',
  title: 'Post ' + i,
  datePosted: '2025-04-' + String(i).padStart(2, '0'),
  ...overrides,
})

describe('<HeroPeekCarousel />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }))
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when posts empty', () => {
    const { container } = renderWithProviders(<HeroPeekCarousel posts={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when posts non-array (edge)', () => {
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={null} />,
    )
    expect(container.firstChild).toBeNull()
    const r2 = renderWithProviders(<HeroPeekCarousel posts={undefined} />)
    expect(r2.container.firstChild).toBeNull()
  })

  it('single post renders <figure> with no carousel role, no arrows, no thumbs', () => {
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={[mkPost(1)]} />,
    )
    expect(container.querySelector('.hero-peek--solo')).not.toBeNull()
    expect(container.querySelector('[role="region"]')).toBeNull()
    expect(container.querySelector('.hero-peek__nav')).toBeNull()
    expect(container.querySelector('.hero-peek__thumbs')).toBeNull()
  })

  it('multi-post renders region with carousel roledescription + arrows + thumbs', () => {
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    const { container } = renderWithProviders(<HeroPeekCarousel posts={posts} />)
    const region = container.querySelector('[role="region"]')
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-roledescription')).toBe('carousel')
    expect(container.querySelector('.hero-peek__nav--prev')).not.toBeNull()
    expect(container.querySelector('.hero-peek__nav--next')).not.toBeNull()
    expect(container.querySelectorAll('.hero-peek__thumb').length).toBe(3)
  })

  it('region aria-label uses peek.label translation', () => {
    const posts = [mkPost(1), mkPost(2)]
    setLanguage('zh')
    const { container } = renderWithProviders(<HeroPeekCarousel posts={posts} />)
    const region = container.querySelector('[role="region"]')
    expect(region.getAttribute('aria-label')).toBe('精选帖子')
  })

  it('arrows have translated aria-labels (en)', () => {
    const posts = [mkPost(1), mkPost(2)]
    renderWithProviders(<HeroPeekCarousel posts={posts} />)
    expect(
      screen.getByRole('button', { name: 'Previous post' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next post' }),
    ).toBeInTheDocument()
  })

  it('next arrow click advances index (renders next center post)', async () => {
    const user = userEvent.setup()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} />)
    await user.click(screen.getByRole('button', { name: 'Next post' }))
    // Center slot now shows Post 2 — its thumb is selected
    const activeThumb = screen.getByRole('tab', { selected: true })
    expect(activeThumb.getAttribute('aria-label')).toBe('Go to post 2')
  })

  it('prev arrow from index 0 wraps to last (length-1)', async () => {
    const user = userEvent.setup()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} />)
    await user.click(screen.getByRole('button', { name: 'Previous post' }))
    const activeThumb = screen.getByRole('tab', { selected: true })
    expect(activeThumb.getAttribute('aria-label')).toBe('Go to post 3')
  })

  it('thumb click jumps to that index', async () => {
    const user = userEvent.setup()
    const posts = [mkPost(1), mkPost(2), mkPost(3), mkPost(4)]
    renderWithProviders(<HeroPeekCarousel posts={posts} />)
    const thumbs = screen.getAllByRole('tab')
    await user.click(thumbs[2])
    const activeThumb = screen.getByRole('tab', { selected: true })
    expect(activeThumb.getAttribute('aria-label')).toBe('Go to post 3')
  })

  it('ArrowLeft / ArrowRight key handlers move index', () => {
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={posts} />,
    )
    const region = container.querySelector('[role="region"]')
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 2')
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })

  it('Home / End keys jump to first / last', () => {
    const posts = [mkPost(1), mkPost(2), mkPost(3), mkPost(4), mkPost(5)]
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={posts} />,
    )
    const region = container.querySelector('[role="region"]')
    fireEvent.keyDown(region, { key: 'End' })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 5')
    fireEvent.keyDown(region, { key: 'Home' })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })

  it('auto-advance fires after intervalMs (fake timers)', () => {
    vi.useFakeTimers()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} intervalMs={1000} />)
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 2')
  })

  it('intervalMs <= 0 disables auto-rotate (edge)', () => {
    vi.useFakeTimers()
    const posts = [mkPost(1), mkPost(2)]
    renderWithProviders(<HeroPeekCarousel posts={posts} intervalMs={0} />)
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })

  it('hover pauses auto-advance', () => {
    vi.useFakeTimers()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={posts} intervalMs={1000} />,
    )
    const region = container.querySelector('[role="region"]')
    fireEvent.mouseEnter(region)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })

  it('document.hidden visibility-change pauses auto-advance', () => {
    vi.useFakeTimers()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} intervalMs={1000} />)
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
  })

  it('prefers-reduced-motion: reduce disables auto-rotate (mock matchMedia)', () => {
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} intervalMs={1000} />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })

  it('roving tabindex: only active thumb is tabbable', () => {
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    renderWithProviders(<HeroPeekCarousel posts={posts} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('tabindex')).toBe('0')
    expect(tabs[1].getAttribute('tabindex')).toBe('-1')
    expect(tabs[2].getAttribute('tabindex')).toBe('-1')
  })

  it('aria-live polite present on center slot for multi-post', () => {
    const posts = [mkPost(1), mkPost(2)]
    const { container } = renderWithProviders(<HeroPeekCarousel posts={posts} />)
    expect(
      container.querySelector('.hero-peek__slot--center[aria-live="polite"]'),
    ).not.toBeNull()
  })

  it('two-post: arrows + thumbs render and side peeks repeat', () => {
    const posts = [mkPost(1), mkPost(2)]
    const { container } = renderWithProviders(<HeroPeekCarousel posts={posts} />)
    expect(container.querySelector('.hero-peek__nav--prev')).not.toBeNull()
    expect(container.querySelectorAll('.hero-peek__thumb').length).toBe(2)
  })

  it('touchstart pauses auto-advance for 5 seconds', () => {
    vi.useFakeTimers()
    const posts = [mkPost(1), mkPost(2), mkPost(3)]
    const { container } = renderWithProviders(
      <HeroPeekCarousel posts={posts} intervalMs={1000} />,
    )
    fireEvent.touchStart(container.querySelector('[role="region"]'))
    // While paused (within 5s window), advancing 3s does NOT rotate
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.getByRole('tab', { selected: true }).getAttribute('aria-label'),
    ).toBe('Go to post 1')
  })
})
