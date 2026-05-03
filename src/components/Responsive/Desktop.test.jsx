import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Desktop from './Desktop.jsx'
import { useIsMobile } from '../../lib/useBreakpoint.js'

vi.mock('../../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

describe('<Desktop />', () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReset()
  })

  it('renders children when useIsMobile() === false', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(
      <Desktop>
        <span>visible</span>
      </Desktop>,
    )
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('renders nothing when useIsMobile() === true (inverse of Mobile)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(
      <Desktop>
        <span>hidden</span>
      </Desktop>,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('hidden')).toBeNull()
  })

  it('renders string children when desktop (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { container } = render(<Desktop>just text</Desktop>)
    expect(container).toHaveTextContent('just text')
  })

  it('renders multiple element children when desktop (edge — fragment passthrough)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(
      <Desktop>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Desktop>,
    )
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
  })

  it('renders nothing for multiple children when mobile (edge — symmetry)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(
      <Desktop>
        <span>a</span>
        <span>b</span>
      </Desktop>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when children is undefined and useIsMobile=true (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { container } = render(<Desktop />)
    expect(container.firstChild).toBeNull()
  })

  it('does not throw when children is undefined and useIsMobile=false (edge)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    expect(() => render(<Desktop />)).not.toThrow()
  })
})
