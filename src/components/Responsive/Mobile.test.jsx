import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Mobile from './Mobile.jsx'
import { useIsMobile } from '../../lib/useBreakpoint.js'

vi.mock('../../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

describe('<Mobile />', () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReset()
  })

  it('renders children when useIsMobile() === true', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(
      <Mobile>
        <span>visible</span>
      </Mobile>,
    )
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('renders nothing when useIsMobile() === false', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(
      <Mobile>
        <span>hidden</span>
      </Mobile>,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('hidden')).toBeNull()
  })

  it('renders string children when mobile (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(<Mobile>just text</Mobile>)
    expect(container).toHaveTextContent('just text')
  })

  it('renders multiple element children when mobile (edge — fragment passthrough)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(
      <Mobile>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Mobile>,
    )
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
  })

  it('renders nothing for multiple children when desktop (edge — symmetry)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(
      <Mobile>
        <span>a</span>
        <span>b</span>
      </Mobile>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when children is undefined and useIsMobile=false (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(<Mobile />)
    expect(container.firstChild).toBeNull()
  })

  it('renders empty fragment when children is undefined and useIsMobile=true (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    expect(() => render(<Mobile />)).not.toThrow()
  })
})
