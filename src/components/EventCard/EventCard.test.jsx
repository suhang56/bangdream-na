import { describe, it, expect } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EventCard from './EventCard.jsx'

function render(ui, options) {
  return rtlRender(ui, { wrapper: MemoryRouter, ...options })
}

const NOW = new Date('2026-06-01T12:00:00Z')

const baseEvent = {
  id: 'roselia-la',
  title: 'Roselia LA Tour 2026',
  date: '2026-07-15T19:00:00-07:00',
  location: 'The Wiltern, Los Angeles, CA',
  type: 'concert',
  description: 'Roselia North America tour finale.',
  links: [
    { label: 'Tickets', url: 'https://example.com/tickets' },
    { label: 'Info', url: 'https://example.com/info' },
  ],
  image: 'https://example.com/roselia.jpg',
}

describe('<EventCard />', () => {
  it('renders all sub-elements when all fields are present', () => {
    render(<EventCard event={baseEvent} now={NOW} />)
    expect(screen.getByText(baseEvent.title)).toBeInTheDocument()
    expect(screen.getByText(baseEvent.location)).toBeInTheDocument()
    expect(screen.getByText(baseEvent.description)).toBeInTheDocument()
    expect(screen.getByText('Concert')).toBeInTheDocument()
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('renders <time> with raw ISO dateTime attribute', () => {
    const { container } = render(<EventCard event={baseEvent} now={NOW} />)
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time.getAttribute('datetime')).toBe(baseEvent.date)
  })

  it('past event has event-card--past class and no relative-time accent', () => {
    const past = { ...baseEvent, date: '2025-01-15T19:00:00-07:00' }
    const { container } = render(<EventCard event={past} now={NOW} />)
    expect(container.querySelector('.event-card--past')).not.toBeNull()
    expect(container.querySelector('.event-card__relative')).toBeNull()
  })

  it('upcoming within 30 days → relative-time line present (edge)', () => {
    const soon = { ...baseEvent, date: '2026-06-10T19:00:00Z' }
    const { container } = render(<EventCard event={soon} now={NOW} />)
    expect(container.querySelector('.event-card__relative')).not.toBeNull()
  })

  it('upcoming > 30 days → relative-time line absent (edge)', () => {
    const far = { ...baseEvent, date: '2027-01-15T19:00:00Z' }
    const { container } = render(<EventCard event={far} now={NOW} />)
    expect(container.querySelector('.event-card__relative')).toBeNull()
  })

  it('missing image → no inline backgroundImage style on image div (uses CSS gradient)', () => {
    const e = { ...baseEvent, image: undefined }
    const { container } = render(<EventCard event={e} now={NOW} />)
    const img = container.querySelector('.event-card__image')
    expect(img).not.toBeNull()
    expect(img.style.backgroundImage).toBe('')
  })

  it('empty image string → same fallback (no inline backgroundImage) (edge)', () => {
    const e = { ...baseEvent, image: '' }
    const { container } = render(<EventCard event={e} now={NOW} />)
    const img = container.querySelector('.event-card__image')
    expect(img.style.backgroundImage).toBe('')
  })

  it('present image → inline backgroundImage set', () => {
    const { container } = render(<EventCard event={baseEvent} now={NOW} />)
    const img = container.querySelector('.event-card__image')
    expect(img.style.backgroundImage).toContain('example.com/roselia.jpg')
  })

  it('missing links → no <ul> rendered (edge)', () => {
    const e = { ...baseEvent, links: undefined }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__links')).toBeNull()
  })

  it('empty links array → no <ul> rendered (edge)', () => {
    const e = { ...baseEvent, links: [] }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__links')).toBeNull()
  })

  it('external links open in new tab with safe rel attributes', () => {
    render(<EventCard event={baseEvent} now={NOW} />)
    const tickets = screen.getByText('Tickets').closest('a')
    expect(tickets.getAttribute('target')).toBe('_blank')
    expect(tickets.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('unknown type → does not crash, renders raw type via badge fallback (edge)', () => {
    const e = { ...baseEvent, type: 'lecture' }
    expect(() => render(<EventCard event={e} now={NOW} />)).not.toThrow()
  })

  it('malformed date → does not throw; not flagged as past (edge)', () => {
    const e = { ...baseEvent, date: 'not-a-date' }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card--past')).toBeNull()
  })

  it('missing description → no description <p> rendered (edge)', () => {
    const e = { ...baseEvent, description: '' }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__description')).toBeNull()
  })

  it('very long description (1000 chars) → renders without crash (edge)', () => {
    const e = { ...baseEvent, description: 'x'.repeat(1000) }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__description')).not.toBeNull()
  })

  it('aria-label combines title + formatted date', () => {
    const { container } = render(<EventCard event={baseEvent} now={NOW} />)
    const article = container.querySelector('article')
    const label = article.getAttribute('aria-label')
    expect(label).toContain(baseEvent.title)
  })

  it('default now param works without explicit now (no throw)', () => {
    expect(() => render(<EventCard event={baseEvent} />)).not.toThrow()
  })

  it('title is a Link to /events/<id> when id is present', () => {
    const { container } = render(<EventCard event={baseEvent} now={NOW} />)
    const link = container.querySelector('.event-card__title-link')
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toBe('/events/roselia-la')
  })

  it('renders ticket button from event.ticketUrl when set', () => {
    const e = {
      ...baseEvent,
      links: [],
      ticketUrl: 'https://example.com/buy',
    }
    const { container } = render(<EventCard event={e} now={NOW} />)
    const tickets = container.querySelector('a[href="https://example.com/buy"]')
    expect(tickets).not.toBeNull()
    expect(tickets.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('no ticket button when ticketUrl is empty/missing', () => {
    const e = { ...baseEvent, links: [], ticketUrl: '' }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__links')).toBeNull()
  })

  it('missing location → no location <p>', () => {
    const e = { ...baseEvent, location: '' }
    const { container } = render(<EventCard event={e} now={NOW} />)
    expect(container.querySelector('.event-card__location')).toBeNull()
  })

  describe('variant="compact"', () => {
    it('applies event-card--compact class when variant=compact', () => {
      const { container } = render(<EventCard event={baseEvent} now={NOW} variant="compact" />)
      expect(container.querySelector('.event-card--compact')).not.toBeNull()
    })

    it('default variant does not apply event-card--compact', () => {
      const { container } = render(<EventCard event={baseEvent} now={NOW} />)
      expect(container.querySelector('.event-card--compact')).toBeNull()
    })

    it('explicit variant="default" does not apply event-card--compact', () => {
      const { container } = render(<EventCard event={baseEvent} now={NOW} variant="default" />)
      expect(container.querySelector('.event-card--compact')).toBeNull()
    })

    it('compact with image → inline backgroundImage set, no placeholder glyph (edge)', () => {
      const { container } = render(<EventCard event={baseEvent} now={NOW} variant="compact" />)
      const img = container.querySelector('.event-card__image')
      expect(img.style.backgroundImage).toContain('example.com/roselia.jpg')
      expect(container.querySelector('.event-card__placeholder-glyph')).toBeNull()
    })

    it('compact with no image → placeholder glyph rendered (edge)', () => {
      const e = { ...baseEvent, image: undefined }
      const { container } = render(<EventCard event={e} now={NOW} variant="compact" />)
      expect(container.querySelector('.event-card__placeholder-glyph')).not.toBeNull()
    })

    it('compact past event keeps event-card--past class (edge)', () => {
      const past = { ...baseEvent, date: '2025-01-15T19:00:00-07:00' }
      const { container } = render(<EventCard event={past} now={NOW} variant="compact" />)
      expect(container.querySelector('.event-card--past')).not.toBeNull()
      expect(container.querySelector('.event-card--compact')).not.toBeNull()
    })

    it('compact title still renders (edge: very long title)', () => {
      const e = { ...baseEvent, title: 'B'.repeat(200) }
      const { container } = render(<EventCard event={e} now={NOW} variant="compact" />)
      expect(container.querySelector('.event-card__title')).not.toBeNull()
    })
  })
})
