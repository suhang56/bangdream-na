import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import PlatformTileRow from './PlatformTileRow.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const FULL = [
  {
    platform: 'discord',
    label: 'Discord',
    url: 'https://discord.gg/abc',
    qrImage: null,
    enabled: true,
  },
  {
    platform: 'qq',
    label: 'QQ群',
    url: 'https://qm.qq.com/q/abc',
    qrImage: null,
    enabled: true,
  },
  {
    platform: 'xiaohongshu',
    label: '小红书',
    url: 'https://xhslink.com/abc',
    qrImage: null,
    enabled: true,
  },
  {
    platform: 'x',
    label: 'X',
    url: 'https://x.com/abc',
    qrImage: null,
    enabled: true,
  },
  {
    platform: 'wechat',
    label: '微信',
    url: '',
    qrImage: null,
    enabled: false,
  },
]

describe('<PlatformTileRow />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('returns null when social is empty array (edge)', () => {
    const { container } = renderWithProviders(<PlatformTileRow social={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when social is non-array (edge)', () => {
    const { container } = renderWithProviders(<PlatformTileRow social={null} />)
    expect(container.firstChild).toBeNull()
    const r2 = renderWithProviders(<PlatformTileRow social={undefined} />)
    expect(r2.container.firstChild).toBeNull()
  })

  it('renders 5 tiles with data-platform attrs', () => {
    const { container } = renderWithProviders(
      <PlatformTileRow social={FULL} />,
    )
    expect(container.querySelectorAll('.platform-tile').length).toBe(5)
    const platforms = Array.from(
      container.querySelectorAll('.platform-tile'),
    ).map((n) => n.getAttribute('data-platform'))
    expect(platforms).toEqual(['discord', 'qq', 'xiaohongshu', 'x', 'wechat'])
  })

  it('active tiles render as <a> with target=_blank rel=noopener', () => {
    renderWithProviders(<PlatformTileRow social={FULL} />)
    const discord = screen.getByRole('link', { name: 'Discord' })
    expect(discord).toHaveAttribute('target', '_blank')
    expect(discord).toHaveAttribute('rel', 'noopener noreferrer')
    expect(discord).toHaveAttribute('href', 'https://discord.gg/abc')
  })

  it('disabled tile renders as <span aria-disabled> with comingSoon title', () => {
    const { container } = renderWithProviders(
      <PlatformTileRow social={FULL} />,
    )
    const wechat = container.querySelector(
      '.platform-tile[data-platform="wechat"]',
    )
    expect(wechat.tagName).toBe('SPAN')
    expect(wechat.getAttribute('aria-disabled')).toBe('true')
    expect(wechat.getAttribute('title')).toBe('Coming soon')
  })

  it('disabled tile shows ZH "敬请期待" tooltip when lang=zh', () => {
    setLanguage('zh')
    const { container } = renderWithProviders(
      <PlatformTileRow social={FULL} />,
    )
    const wechat = container.querySelector(
      '.platform-tile[data-platform="wechat"]',
    )
    expect(wechat.getAttribute('title')).toBe('敬请期待')
  })

  it('platform labels switch to ZH when language is zh', () => {
    setLanguage('zh')
    renderWithProviders(<PlatformTileRow social={FULL} />)
    expect(screen.getByRole('link', { name: '小红书' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'QQ群' })).toBeInTheDocument()
  })

  it('platform labels switch to EN when language is en (small red book)', () => {
    setLanguage('en')
    renderWithProviders(<PlatformTileRow social={FULL} />)
    expect(screen.getByRole('link', { name: 'Xiaohongshu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'QQ' })).toBeInTheDocument()
  })

  it('section has VH heading labelled by platforms.heading', () => {
    const { container } = renderWithProviders(
      <PlatformTileRow social={FULL} />,
    )
    const heading = container.querySelector('#platform-tile-row-heading')
    expect(heading).not.toBeNull()
    expect(heading.textContent).toBe('Communities')
  })

  it('QR-only state: button toggles popover open + close', async () => {
    const user = userEvent.setup()
    const wechatQr = [
      {
        platform: 'wechat',
        label: '微信',
        url: '',
        qrImage: '/wechat-qr.png',
        enabled: true,
      },
    ]
    renderWithProviders(<PlatformTileRow social={wechatQr} />)
    const btn = screen.getByRole('button', { name: 'WeChat' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    await user.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('QR popover Escape closes', async () => {
    const user = userEvent.setup()
    const wechatQr = [
      {
        platform: 'wechat',
        label: '微信',
        url: '',
        qrImage: '/wechat-qr.png',
        enabled: true,
      },
    ]
    renderWithProviders(<PlatformTileRow social={wechatQr} />)
    const btn = screen.getByRole('button', { name: 'WeChat' })
    await user.click(btn)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('QR popover click-outside closes', async () => {
    const user = userEvent.setup()
    const wechatQr = [
      {
        platform: 'wechat',
        label: '微信',
        url: '',
        qrImage: '/wechat-qr.png',
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={wechatQr} />,
    )
    const btn = screen.getByRole('button', { name: 'WeChat' })
    await user.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(container)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('enabled=true but url="" + no qrImage falls to disabled (edge)', () => {
    const partial = [
      {
        platform: 'wechat',
        label: '微信',
        url: '',
        qrImage: null,
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={partial} />,
    )
    const tile = container.querySelector('.platform-tile')
    expect(tile.tagName).toBe('SPAN')
    expect(tile.getAttribute('aria-disabled')).toBe('true')
  })

  it('http:// (non-https) URL falls to disabled (edge)', () => {
    const insecure = [
      {
        platform: 'discord',
        label: 'Discord',
        url: 'http://insecure.example',
        qrImage: null,
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={insecure} />,
    )
    const tile = container.querySelector('.platform-tile')
    expect(tile.tagName).toBe('SPAN')
  })

  it('unknown platform name still renders text-only tile (edge)', () => {
    const unknown = [
      {
        platform: 'twitter',
        label: 'Twitter',
        url: 'https://twitter.com/abc',
        qrImage: null,
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={unknown} />,
    )
    const tile = container.querySelector(
      '.platform-tile[data-platform="twitter"]',
    )
    expect(tile).not.toBeNull()
    expect(tile.tagName).toBe('A')
    expect(tile.querySelector('svg')).toBeNull()
    expect(tile.querySelector('.platform-tile__label').textContent).toBe(
      'Twitter',
    )
  })

  it('forum tile in enabled state renders <a data-platform="forum"> with external attrs', () => {
    const forumActive = [
      {
        platform: 'forum',
        label: '论坛',
        url: 'https://forum.bangdream.org',
        qrImage: null,
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={forumActive} />,
    )
    const tile = container.querySelector(
      '.platform-tile[data-platform="forum"]',
    )
    expect(tile).not.toBeNull()
    expect(tile.tagName).toBe('A')
    expect(tile.getAttribute('href')).toBe('https://forum.bangdream.org')
    expect(tile.getAttribute('target')).toBe('_blank')
    expect(tile.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('forum tile renders ForumSvg glyph when active', () => {
    const forumActive = [
      {
        platform: 'forum',
        label: '论坛',
        url: 'https://forum.bangdream.org',
        qrImage: null,
        enabled: true,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={forumActive} />,
    )
    const svg = container.querySelector('[data-platform="forum"] svg')
    expect(svg).not.toBeNull()
  })

  it('forum tile in disabled state renders <span aria-disabled> with comingSoon title', () => {
    const forumDisabled = [
      {
        platform: 'forum',
        label: '论坛',
        url: 'https://forum.bangdream.org',
        qrImage: null,
        enabled: false,
      },
    ]
    const { container } = renderWithProviders(
      <PlatformTileRow social={forumDisabled} />,
    )
    const tile = container.querySelector(
      '.platform-tile[data-platform="forum"]',
    )
    expect(tile.tagName).toBe('SPAN')
    expect(tile.getAttribute('aria-disabled')).toBe('true')
    expect(tile.getAttribute('title')).toBe('Coming soon')
  })

  it('forum tile shows 论坛 label in zh', () => {
    setLanguage('zh')
    const forumActive = [
      {
        platform: 'forum',
        label: '论坛',
        url: 'https://forum.bangdream.org',
        qrImage: null,
        enabled: true,
      },
    ]
    renderWithProviders(<PlatformTileRow social={forumActive} />)
    expect(screen.getByRole('link', { name: '论坛' })).toBeInTheDocument()
  })

  it('forum tile shows Forum label in en', () => {
    setLanguage('en')
    const forumActive = [
      {
        platform: 'forum',
        label: '论坛',
        url: 'https://forum.bangdream.org',
        qrImage: null,
        enabled: true,
      },
    ]
    renderWithProviders(<PlatformTileRow social={forumActive} />)
    expect(screen.getByRole('link', { name: 'Forum' })).toBeInTheDocument()
  })
})
