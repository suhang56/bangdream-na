import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlatformIcon from './PlatformIcon.jsx'

describe('<PlatformIcon />', () => {
  it('enabled + url renders external link with rel attrs', () => {
    render(
      <PlatformIcon
        platform="discord"
        label="Discord"
        url="https://discord.gg/abc"
        qrImage={null}
        enabled={true}
      />,
    )
    const link = screen.getByRole('link', { name: 'Discord' })
    expect(link).toHaveAttribute('href', 'https://discord.gg/abc')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('enabled + qrImage only renders button that opens popover', async () => {
    const user = userEvent.setup()
    render(
      <PlatformIcon
        platform="qq"
        label="QQ群"
        url=""
        qrImage="/social/qq-qr.png"
        enabled={true}
      />,
    )
    const btn = screen.getByRole('button', { name: 'QQ群' })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByAltText('QQ群 QR code'),
    ).toHaveAttribute('src', '/social/qq-qr.png')
  })

  it('popover closes on Escape (edge)', async () => {
    const user = userEvent.setup()
    render(
      <PlatformIcon
        platform="qq"
        label="QQ群"
        url=""
        qrImage="/social/qq-qr.png"
        enabled={true}
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disabled state renders span with aria-disabled (edge)', () => {
    render(
      <PlatformIcon
        platform="x"
        label="X (Twitter)"
        url=""
        qrImage={null}
        enabled={false}
      />,
    )
    const node = screen.getByText('X (Twitter)').closest('.platform-icon')
    expect(node).toHaveAttribute('aria-disabled', 'true')
    expect(node.classList.contains('platform-icon--disabled')).toBe(true)
  })

  it('enabled but malformed url falls through to disabled (edge)', () => {
    render(
      <PlatformIcon
        platform="discord"
        label="Discord"
        url="not-a-url"
        qrImage={null}
        enabled={true}
      />,
    )
    const node = screen.getByText('Discord').closest('.platform-icon')
    expect(node).toHaveAttribute('aria-disabled', 'true')
  })

  it('http (not https) treated as malformed (edge)', () => {
    render(
      <PlatformIcon
        platform="discord"
        label="Discord"
        url="http://insecure.example.com"
        qrImage={null}
        enabled={true}
      />,
    )
    const node = screen.getByText('Discord').closest('.platform-icon')
    expect(node).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders the platform-specific SVG by data-platform', () => {
    const { container } = render(
      <PlatformIcon
        platform="wechat"
        label="微信"
        url=""
        qrImage={null}
        enabled={false}
      />,
    )
    expect(container.querySelector('[data-platform="wechat"]')).not.toBeNull()
    expect(container.querySelector('.platform-icon-svg')).not.toBeNull()
  })

  it('unknown platform renders without crash, no SVG (edge)', () => {
    const { container } = render(
      <PlatformIcon
        platform="unknown"
        label="Unknown"
        url=""
        qrImage={null}
        enabled={false}
      />,
    )
    expect(container.querySelector('[data-platform="unknown"]')).not.toBeNull()
  })
})
