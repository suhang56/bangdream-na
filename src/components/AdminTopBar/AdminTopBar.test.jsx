import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AdminTopBar from './AdminTopBar.jsx'

describe('<AdminTopBar />', () => {
  it('renders the breadcrumb segments in order (list view)', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    const nav = screen.getByLabelText('后台导航路径')
    const segments = within(nav).getAllByText(/.+/)
      .filter((n) => n.classList.contains('admin-topbar-breadcrumb-label'))
      .map((n) => n.textContent)
    expect(segments).toEqual(['后台', '活动'])
  })

  it('renders new-item breadcrumb', () => {
    render(<AdminTopBar schemaKey="events" editing={{ __new: true }} />)
    expect(screen.getByText('新建活动')).toBeInTheDocument()
  })

  it('marks last breadcrumb segment with aria-current="page"', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    const current = screen.getByText('活动')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('hides the save-status pill when status="idle"', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={null}
        saveStatus={{ status: 'idle' }}
       
      />,
    )
    expect(screen.queryByText('保存中…')).toBeNull()
    expect(screen.queryByText(/已保存/)).toBeNull()
    expect(screen.queryByText(/保存失败/)).toBeNull()
  })

  it('shows "保存中…" when saving', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={null}
        saveStatus={{ status: 'saving' }}
       
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('保存中…')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('shows "✓ 已保存 · PR #N" with prNumber', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={null}
        saveStatus={{ status: 'saved', prNumber: 42 }}
       
      />,
    )
    expect(screen.getByText('✓ 已保存 · PR #42')).toBeInTheDocument()
  })

  it('shows "✗ 保存失败" on error', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={null}
        saveStatus={{ status: 'error' }}
       
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('✗ 保存失败')
    expect(status.classList.contains('admin-topbar-status-error')).toBe(true)
  })

  it('renders openPR pill when set', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={null}
        openPR={{ number: 7, htmlUrl: 'https://github.com/x/y/pull/7' }}
       
      />,
    )
    const link = screen.getByRole('link', { name: /PR #7/ })
    expect(link).toHaveAttribute('href', 'https://github.com/x/y/pull/7')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders "无待合并 PR" placeholder when openPR is null', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    expect(screen.getByText('无待合并 PR')).toBeInTheDocument()
  })

  it('"查看网站" link opens in new tab with rel=noopener', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    const link = screen.getByRole('link', { name: /查看网站/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not render a sign-out button (lives in AdminNav per Designer §3.3)', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    expect(screen.queryByRole('button', { name: '登出' })).toBeNull()
  })

  it('top gradient stripe is decorative (aria-hidden)', () => {
    const { container } = render(
      <AdminTopBar schemaKey="events" editing={null} />,
    )
    const stripe = container.querySelector('.admin-topbar-stripe')
    expect(stripe).toHaveAttribute('aria-hidden', 'true')
  })

  it('handles null saveStatus gracefully (idle defaults)', () => {
    render(<AdminTopBar schemaKey="events" editing={null} />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renders edit-view breadcrumb with item title', () => {
    render(
      <AdminTopBar
        schemaKey="events"
        editing={{ id: 'a', title: '春日演唱会' }}
       
      />,
    )
    expect(screen.getByText('春日演唱会')).toBeInTheDocument()
  })
})
