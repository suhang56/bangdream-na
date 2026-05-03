import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminNav from './AdminNav.jsx'

describe('<AdminNav />', () => {
  it('renders all 7 schema buttons in Chinese', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} />)
    for (const label of ['活动', '成员', '公告', '首页轮播', '社交平台', '站点信息', '关于页']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks active key with aria-current=page', () => {
    render(<AdminNav activeKey="news" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: '公告' })).toHaveAttribute('aria-current', 'page')
  })

  it('clicking a schema button calls onSelect with key', () => {
    const onSelect = vi.fn()
    render(<AdminNav activeKey="events" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '成员' }))
    expect(onSelect).toHaveBeenCalledWith('members')
  })

  it('renders the AdminBrandPanel (后台 wordmark)', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} />)
    expect(screen.getByText('后台')).toBeInTheDocument()
    expect(screen.getByText('BD!NA 后台')).toBeInTheDocument()
  })

  it('uses Chinese aria-label for nav region', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} />)
    expect(screen.getByLabelText('后台分区')).toBeInTheDocument()
  })

  it('does not render sign-out (now in AdminTopBar)', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: /登出|sign out/i })).toBeNull()
  })

  it('does not render View Site / open PR (now in AdminTopBar)', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} />)
    expect(screen.queryByRole('link', { name: /查看网站|view site/i })).toBeNull()
    expect(screen.queryByText(/无待合并 PR|no open pr/i)).toBeNull()
  })

  it('each nav button has a decorative ◆ glyph (aria-hidden)', () => {
    const { container } = render(<AdminNav activeKey="events" onSelect={() => {}} />)
    const glyphs = container.querySelectorAll('.admin-nav-glyph')
    expect(glyphs.length).toBe(7)
    for (const g of glyphs) {
      expect(g).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
