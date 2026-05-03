import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminEmptyState from './AdminEmptyState.jsx'

describe('<AdminEmptyState />', () => {
  it('renders title (heading) and hint when provided', () => {
    render(
      <AdminEmptyState
        schemaKey="events"
        title="还没有活动"
        hint="点击上方按钮创建第一条活动"
      />,
    )
    expect(screen.getByRole('heading', { name: '还没有活动' })).toBeInTheDocument()
    expect(screen.getByText('点击上方按钮创建第一条活动')).toBeInTheDocument()
  })

  it('omits hint when prop is absent', () => {
    render(<AdminEmptyState schemaKey="events" title="还没有活动" />)
    expect(screen.queryByText('点击上方按钮创建第一条活动')).toBeNull()
  })

  it('renders illustration as decorative SVG (aria-hidden)', () => {
    const { container } = render(
      <AdminEmptyState schemaKey="events" title="还没有活动" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to default illustration for unknown schemaKey', () => {
    const { container } = render(
      <AdminEmptyState schemaKey="not-a-schema" title="无内容" />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders CTA button and triggers onClick', () => {
    const onClick = vi.fn()
    render(
      <AdminEmptyState
        schemaKey="events"
        title="还没有活动"
        cta={{ label: '+ 新建活动', onClick }}
      />,
    )
    const btn = screen.getByRole('button', { name: '+ 新建活动' })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('omits CTA when prop is absent', () => {
    render(<AdminEmptyState schemaKey="events" title="还没有活动" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('marks the card as a polite live region (role="status")', () => {
    render(<AdminEmptyState schemaKey="events" title="还没有活动" />)
    const card = screen.getByRole('status')
    expect(card).toHaveAttribute('aria-live', 'polite')
  })

  it('renders consistently across all schema keys (smoke)', () => {
    for (const key of ['events', 'members', 'news', 'posts', 'social', 'site', 'about']) {
      const { container, unmount } = render(
        <AdminEmptyState schemaKey={key} title={`还没有${key}`} />,
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
      unmount()
    }
  })
})
