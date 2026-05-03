import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberCard from './MemberCard.jsx'

const FULL = {
  id: 'a1',
  name: 'Alice Anderson',
  role: 'organizer',
  oshiBand: 'Roselia',
  oshiCharacter: 'Yukina Minato',
  city: 'San Francisco, CA',
  bio: 'Roselia stan since 2019.',
  socials: {
    twitter: 'alice_a',
    bilibili: 'alice123',
    instagram: 'alice.a',
    discord: 'alice.a',
  },
  coverBand: 'After Sunset',
  coverBandRole: 'Vocal',
}

describe('MemberCard', () => {
  it('renders all fields when present', () => {
    render(<MemberCard member={FULL} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Alice Anderson' })).toBeInTheDocument()
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    expect(screen.getAllByText(/Roselia/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Yukina Minato/)).toBeInTheDocument()
    expect(screen.getByText('Roselia stan since 2019.')).toBeInTheDocument()
  })

  it('does NOT render any avatar img or initials block', () => {
    const { container } = render(<MemberCard member={FULL} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.member-card-avatar')).toBeNull()
    expect(container.querySelector('.member-card-initials')).toBeNull()
  })

  it('uses real <article> element with aria-label = name', () => {
    render(<MemberCard member={FULL} />)
    const article = screen.getByRole('article', { name: 'Alice Anderson' })
    expect(article.tagName.toLowerCase()).toBe('article')
  })

  it('renders only required fields without crashing (id+name+role)', () => {
    const minimal = { id: 'm1', name: 'Madonna', role: 'member' }
    const { container } = render(<MemberCard member={minimal} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Madonna' })).toBeInTheDocument()
    expect(container.querySelector('.member-card-oshi')).toBeNull()
    expect(container.querySelector('.member-card-city')).toBeNull()
    expect(container.querySelector('.member-card-bio')).toBeNull()
    expect(container.querySelector('.member-card-socials')).toBeNull()
    expect(container.querySelector('.member-card-cover-ribbon')).toBeNull()
  })

  it('omits meta block entirely for plain member with no city/oshi (clean ID display)', () => {
    const plain = { id: 'p', name: '西瓜', role: 'member' }
    const { container } = render(<MemberCard member={plain} />)
    expect(container.querySelector('.member-card-meta')).toBeNull()
  })

  it('shows meta block for organizer (non-member role surfaces badge)', () => {
    const { container } = render(
      <MemberCard member={{ id: 'o', name: 'O', role: 'organizer' }} />,
    )
    expect(container.querySelector('.member-card-meta')).not.toBeNull()
  })

  it('shows meta block for alumnus role', () => {
    const { container } = render(
      <MemberCard member={{ id: 'a', name: 'A', role: 'alumnus' }} />,
    )
    expect(container.querySelector('.member-card-meta')).not.toBeNull()
  })

  it('shows meta block when city is set even for plain member', () => {
    const { container } = render(
      <MemberCard
        member={{ id: 'a', name: 'A', role: 'member', city: 'Tokyo' }}
      />,
    )
    expect(container.querySelector('.member-card-meta')).not.toBeNull()
  })

  it('renders very long bio without throwing', () => {
    const longBio = 'X'.repeat(600)
    render(<MemberCard member={{ ...FULL, bio: longBio }} />)
    expect(screen.getByText(longBio)).toBeInTheDocument()
  })

  it('renders very long name (60 chars) without throw', () => {
    const longName = 'A'.repeat(60)
    render(<MemberCard member={{ id: 'l', name: longName, role: 'member' }} />)
    expect(screen.getByRole('heading', { level: 3, name: longName })).toBeInTheDocument()
  })

  it('renders all 4 socials with correct hrefs; discord is span (no anchor)', () => {
    render(<MemberCard member={FULL} />)
    const list = screen.getByRole('list', { name: 'Social links' })
    const items = list.querySelectorAll('li')
    expect(items.length).toBe(4)
    expect(list.querySelector('a[href="https://twitter.com/alice_a"]')).not.toBeNull()
    expect(
      list.querySelector('a[href="https://space.bilibili.com/alice123"]'),
    ).not.toBeNull()
    expect(
      list.querySelector('a[href="https://instagram.com/alice.a"]'),
    ).not.toBeNull()
    const discordLi = Array.from(items).find(
      (li) => li.querySelector('a') === null,
    )
    expect(discordLi).toBeDefined()
    list.querySelectorAll('a').forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    })
  })

  it('skips empty-string socials', () => {
    render(
      <MemberCard
        member={{
          ...FULL,
          socials: { twitter: '', bilibili: 'abc', instagram: '', discord: '' },
        }}
      />,
    )
    const list = screen.getByRole('list', { name: 'Social links' })
    expect(list.querySelectorAll('li').length).toBe(1)
    expect(list.querySelector('a[href="https://space.bilibili.com/abc"]')).not.toBeNull()
  })

  it('does not render socials list when socials is undefined', () => {
    render(<MemberCard member={{ id: 'a', name: 'A', role: 'member' }} />)
    expect(screen.queryByRole('list', { name: 'Social links' })).toBeNull()
  })

  it('does not render socials list when socials is empty {}', () => {
    render(
      <MemberCard
        member={{ id: 'a', name: 'A', role: 'member', socials: {} }}
      />,
    )
    expect(screen.queryByRole('list', { name: 'Social links' })).toBeNull()
  })

  it('renders cover band ribbon with name only when role missing', () => {
    const { container } = render(
      <MemberCard
        member={{
          id: 'c',
          name: 'C',
          role: 'member',
          coverBand: 'After Sunset',
        }}
      />,
    )
    const ribbon = container.querySelector('.member-card-cover-ribbon')
    expect(ribbon).not.toBeNull()
    expect(ribbon.textContent).toContain('After Sunset')
  })

  it('renders cover band ribbon with name + role when both present', () => {
    const { container } = render(<MemberCard member={FULL} />)
    const ribbon = container.querySelector('.member-card-cover-ribbon')
    expect(ribbon).not.toBeNull()
    expect(ribbon.textContent).toContain('After Sunset')
    expect(ribbon.textContent).toContain('Vocal')
  })

  it('omits cover band ribbon when coverBand missing', () => {
    const { container } = render(
      <MemberCard member={{ id: 'a', name: 'A', role: 'member' }} />,
    )
    expect(container.querySelector('.member-card-cover-ribbon')).toBeNull()
  })

  it('shows alumnus state when alumnus=true even if role=organizer', () => {
    render(
      <MemberCard
        member={{ id: 'x', name: 'X', role: 'organizer', alumnus: true }}
      />,
    )
    expect(screen.getByText('Alumnus')).toBeInTheDocument()
  })

  it('shows alumnus state when role="alumnus" without alumnus flag', () => {
    render(<MemberCard member={{ id: 'x', name: 'X', role: 'alumnus' }} />)
    expect(screen.getByText('Alumnus')).toBeInTheDocument()
  })

  it('renders oshi block with band only when oshiCharacter missing', () => {
    const { container } = render(
      <MemberCard
        member={{
          id: 'a',
          name: 'A',
          role: 'member',
          oshiBand: 'Roselia',
        }}
      />,
    )
    const oshi = container.querySelector('.member-card-oshi')
    expect(oshi).not.toBeNull()
    expect(oshi.textContent).toContain('Roselia')
    expect(oshi.textContent).not.toContain('·')
  })

  it('does NOT render oshi block when oshiBand missing but oshiCharacter present', () => {
    const { container } = render(
      <MemberCard
        member={{
          id: 'a',
          name: 'A',
          role: 'member',
          oshiCharacter: 'Yukina',
        }}
      />,
    )
    expect(container.querySelector('.member-card-oshi')).toBeNull()
  })

  it('renders non-ASCII name + CJK city without encoding issue', () => {
    render(
      <MemberCard
        member={{ id: 'k', name: '戸山香澄', role: 'member', city: '東京都' }}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: '戸山香澄' })).toBeInTheDocument()
    expect(screen.getByText('東京都')).toBeInTheDocument()
  })

  it('renders unknown social platform as a non-link fallback span', () => {
    render(
      <MemberCard
        member={{
          id: 'a',
          name: 'A',
          role: 'member',
          socials: { mastodon: 'a@example.com' },
        }}
      />,
    )
    const list = screen.getByRole('list', { name: 'Social links' })
    const items = list.querySelectorAll('li')
    expect(items.length).toBe(1)
    expect(items[0].querySelector('a')).toBeNull()
    expect(items[0].textContent).toContain('mastodon')
  })
})
