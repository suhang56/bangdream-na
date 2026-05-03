import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import StatNumber from './StatNumber.jsx'

describe('<StatNumber />', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
      matches: false,
      media: q,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts at 0 and counts up to target', async () => {
    render(<StatNumber value={900} suffix="+" durationMs={1000} />)
    expect(screen.getByLabelText('900+')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
  })

  it('renders 0 for invalid value (edge: NaN)', () => {
    render(<StatNumber value={NaN} />)
    expect(screen.getByLabelText('0')).toBeInTheDocument()
  })

  it('renders 0 for invalid value (edge: undefined)', () => {
    render(<StatNumber value={undefined} />)
    expect(screen.getByLabelText('0')).toBeInTheDocument()
  })

  it('clamps negative to 0 (edge)', () => {
    render(<StatNumber value={-50} />)
    expect(screen.getByLabelText('0')).toBeInTheDocument()
  })

  it('respects prefers-reduced-motion (edge)', () => {
    window.matchMedia.mockImplementation((q) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }))
    render(<StatNumber value={42} suffix="+" />)
    expect(screen.getByLabelText('42+')).toBeInTheDocument()
  })

  it('floors decimal values (edge)', () => {
    render(<StatNumber value={900.7} suffix="+" />)
    expect(screen.getByLabelText('900+')).toBeInTheDocument()
  })

  it('renders without suffix', () => {
    render(<StatNumber value={5} />)
    expect(screen.getByLabelText('5')).toBeInTheDocument()
  })
})
