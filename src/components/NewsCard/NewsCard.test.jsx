import { describe, it, expect } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NewsCard from './NewsCard.jsx'

const render = (ui, options) =>
  rtlRender(ui, { wrapper: MemoryRouter, ...options })

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
    expect(screen.getByText('ANNOUNCEMENT')).toBeInTheDocument()
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

  describe('variant="compact"', () => {
    it('applies news-card--compact class when variant=compact', () => {
      const { container } = render(<NewsCard news={base} variant="compact" />)
      expect(container.querySelector('.news-card--compact')).not.toBeNull()
    })

    it('default variant does not apply news-card--compact', () => {
      const { container } = render(<NewsCard news={base} />)
      expect(container.querySelector('.news-card--compact')).toBeNull()
    })

    it('explicit variant="default" does not apply news-card--compact', () => {
      const { container } = render(<NewsCard news={base} variant="default" />)
      expect(container.querySelector('.news-card--compact')).toBeNull()
    })

    it('compact with image → inline backgroundImage set, no placeholder glyph (edge)', () => {
      const { container } = render(
        <NewsCard news={{ ...base, image: 'https://example.com/x.jpg' }} variant="compact" />,
      )
      const thumb = container.querySelector('.news-card__thumb')
      expect(thumb.style.backgroundImage).toContain('example.com/x.jpg')
      expect(container.querySelector('.news-card__placeholder-glyph')).toBeNull()
    })

    it('compact with no image → placeholder glyph rendered (edge)', () => {
      const { container } = render(<NewsCard news={base} variant="compact" />)
      expect(container.querySelector('.news-card__placeholder-glyph')).not.toBeNull()
    })

    it('compact title still renders (edge: very long title)', () => {
      const longTitle = 'A'.repeat(200)
      const { container } = render(
        <NewsCard news={{ ...base, title: longTitle }} variant="compact" />,
      )
      expect(container.querySelector('.news-card__title')).not.toBeNull()
    })
  })

  describe('chip color binding (NEWS-EVENTS-ARCH §2)', () => {
    it('announcement chip → solid red background, white ink', () => {
      const { container } = render(<NewsCard news={base} />)
      const chip = container.querySelector('.news-card__category')
      expect(chip).not.toBeNull()
      // jsdom serializes #cd2c34 as rgb(205, 44, 52)
      expect(chip.style.background).toMatch(/rgb\(205,\s*44,\s*52\)|#cd2c34/i)
      expect(chip.style.color).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/i)
    })

    it('event chip with band_theme=popipa → popipa color #ff5a85', () => {
      const { container } = render(
        <NewsCard news={{ ...base, category: 'event', band_theme: 'popipa' }} />,
      )
      const chip = container.querySelector('.news-card__category')
      expect(chip.style.background).toMatch(/rgb\(255,\s*90,\s*133\)|#ff5a85/i)
    })

    it('event chip without band_theme → falls back to BANDS[0] ink #1f1d1a (edge)', () => {
      const { container } = render(
        <NewsCard news={{ ...base, category: 'event' }} />,
      )
      const chip = container.querySelector('.news-card__category')
      expect(chip.style.background).toMatch(/rgb\(31,\s*29,\s*26\)|#1f1d1a/i)
      expect(chip.style.color).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/i)
    })

    it('category=release → falls to BANDS[0] ink, not crash (edge)', () => {
      const { container } = render(
        <NewsCard news={{ ...base, category: 'release' }} />,
      )
      const chip = container.querySelector('.news-card__category')
      expect(chip.style.background).toMatch(/rgb\(31,\s*29,\s*26\)|#1f1d1a/i)
    })

    it('truly-unknown category coerced to announcement → red chip (edge)', () => {
      const { container } = render(
        <NewsCard news={{ ...base, category: 'lecture' }} />,
      )
      const chip = container.querySelector('.news-card__category')
      expect(chip.style.background).toMatch(/rgb\(205,\s*44,\s*52\)|#cd2c34/i)
    })

    it('chip also carries nc-tag class (shared hook with Home)', () => {
      const { container } = render(<NewsCard news={base} />)
      const chip = container.querySelector('.news-card__category')
      expect(chip.classList.contains('nc-tag')).toBe(true)
    })

    it('DOM order: thumb is first child, body is second (edge: prevents CSS order: flip)', () => {
      const { container } = render(<NewsCard news={base} />)
      const article = container.querySelector('article.news-card')
      expect(article.children[0].classList.contains('news-card__thumb')).toBe(true)
      expect(article.children[1].classList.contains('news-card__body')).toBe(true)
    })

    it('renders long mixed-script title 40+ chars (edge: 中英混排 mobile no-throw)', () => {
      const longTitle = "5月3日 Poppin'Party Live in 旧金山 北美巡演首站特别版"
      const { container } = render(
        <NewsCard news={{ ...base, title: longTitle }} />,
      )
      expect(container.querySelector('.news-card__title').textContent).toBe(
        longTitle,
      )
    })
  })
})
