import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminNav from './AdminNav.jsx'

const ITEMS = [
  { key: 'events', title: '活动' },
  { key: 'members', title: '成员' },
  { key: 'news', title: '公告' },
  { key: 'featuredPosts', title: '首页轮播' },
  { key: 'socialLinks', title: '社交平台' },
  { key: '__site_settings__', title: '站点信息' },
  { key: 'aboutSections', title: '关于页' },
]

describe('<AdminNav />', () => {
  it('renders all 7 schema buttons in Chinese', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} items={ITEMS} />)
    for (const label of ['活动', '成员', '公告', '首页轮播', '社交平台', '站点信息', '关于页']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks active key with aria-current=page', () => {
    render(<AdminNav activeKey="news" onSelect={() => {}} items={ITEMS} />)
    expect(screen.getByRole('button', { name: '公告' })).toHaveAttribute('aria-current', 'page')
  })

  it('clicking a schema button calls onSelect with key', () => {
    const onSelect = vi.fn()
    render(<AdminNav activeKey="events" onSelect={onSelect} items={ITEMS} />)
    fireEvent.click(screen.getByRole('button', { name: '成员' }))
    expect(onSelect).toHaveBeenCalledWith('members')
  })

  it('renders the AdminBrandPanel (后台 wordmark)', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} items={ITEMS} />)
    expect(screen.getByText('后台')).toBeInTheDocument()
    expect(screen.getByText('BD!NA 后台')).toBeInTheDocument()
  })

  it('uses Chinese aria-label for nav region', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} items={ITEMS} />)
    expect(screen.getByLabelText('后台分区')).toBeInTheDocument()
  })

  it('renders sign-out button at the bottom of the sidebar', () => {
    render(
      <AdminNav
        activeKey="events"
        onSelect={() => {}}
        onSignOut={() => {}}
        items={ITEMS}
      />,
    )
    expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
  })

  it('clicking sign-out calls onSignOut', () => {
    const onSignOut = vi.fn()
    render(
      <AdminNav
        activeKey="events"
        onSelect={() => {}}
        onSignOut={onSignOut}
        items={ITEMS}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('sign-out is the last interactive element (sidebar bottom)', () => {
    const { container } = render(
      <AdminNav
        activeKey="events"
        onSelect={() => {}}
        onSignOut={() => {}}
        items={ITEMS}
      />,
    )
    const buttons = container.querySelectorAll('button')
    const last = buttons[buttons.length - 1]
    expect(last).toHaveTextContent('登出')
  })

  it('does not render View Site / open PR (now in AdminTopBar)', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} items={ITEMS} />)
    expect(screen.queryByRole('link', { name: /查看网站|view site/i })).toBeNull()
    expect(screen.queryByText(/无待合并 PR|no open pr/i)).toBeNull()
  })

  it('each nav button has a decorative ◆ glyph (aria-hidden)', () => {
    const { container } = render(
      <AdminNav activeKey="events" onSelect={() => {}} items={ITEMS} />,
    )
    const glyphs = container.querySelectorAll('.admin-nav-glyph')
    expect(glyphs.length).toBe(7)
    for (const g of glyphs) {
      expect(g).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('renders nothing in the nav region when items is omitted', () => {
    const { container } = render(
      <AdminNav activeKey="events" onSelect={() => {}} />,
    )
    const navButtons = container.querySelectorAll('nav[aria-label="后台分区"] button')
    expect(navButtons.length).toBe(0)
  })
})
