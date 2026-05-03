import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewsCard from './NewsCard.jsx'

const base = {
  id: '2026-04-30-test',
  date: '2026-04-30',
  title: 'Spring meetup announcement',
  body: 'First paragraph of body.\n\nSecond paragraph.',
  category: 'announcement',
}

describe('<NewsCard />', () => {
  it('renders title, formatted date, category badge, excerpt', () => {
    render(<NewsCard news={base} />)
    expect(screen.getByText(base.title)).toBeInTheDocument()
    expect(screen.getByText('2026.04.30')).toBeInTheDocument()
    expect(screen.getByText('Announcement')).toBeInTheDocument()
    expect(screen.getByText(/first paragraph/i)).toBeInTheDocument()
  })

  it('renders <time> with raw date attribute', () => {
    const { container } = render(<NewsCard news={base} />)
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time.getAttribute('datetime')).toBe(base.date)
  })

  it('image present → inline backgroundImage', () => {
    const { container } = render(
      <NewsCard news={{ ...base, image: 'https://example.com/x.jpg' }} />,
    )
    const thumb = container.querySelector('.news-card__thumb')
    expect(thumb.style.backgroundImage).toContain('example.com/x.jpg')
  })

  it('image missing → no inline backgroundImage (gradient fallback) (edge)', () => {
    const { container } = render(<NewsCard news={base} />)
    const thumb = container.querySelector('.news-card__thumb')
    expect(thumb.style.backgroundImage).toBe('')
  })

  it('unknown category → falls through to default (edge)', () => {
    const { container } = render(
      <NewsCard news={{ ...base, category: 'lecture' }} />,
    )
    expect(
      container.querySelector('[data-category="announcement"]'),
    ).not.toBeNull()
  })

  it('malformed date → renders without date stamp (edge)', () => {
    const { container } = render(
      <NewsCard news={{ ...base, date: 'not-a-date' }} />,
    )
    expect(container.querySelector('time')).toBeNull()
  })

  it('missing body → no excerpt (edge)', () => {
    const { container } = render(
      <NewsCard news={{ ...base, body: '' }} />,
    )
    expect(container.querySelector('.news-card__excerpt')).toBeNull()
  })

  it('uses card-thumb-16-9 utility class', () => {
    const { container } = render(<NewsCard news={base} />)
    expect(container.querySelector('.card-thumb-16-9')).not.toBeNull()
  })

  it('aria-label combines title + date', () => {
    const { container } = render(<NewsCard news={base} />)
    const article = container.querySelector('article')
    expect(article.getAttribute('aria-label')).toContain(base.title)
    expect(article.getAttribute('aria-label')).toContain('2026.04.30')
  })
})
