import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MemberCard from './MemberCard.jsx'

const FULL = {
  id: 'a1',
  name: 'Alice Anderson',
  role: 'organizer',
  oshiBand: 'Roselia',
  oshiCharacter: 'Yukina Minato',
  city: 'San Francisco, CA',
  bio: 'Roselia stan since 2019.',
  avatar: '/avatars/alice.jpg',
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
    expect(screen.getByRole('img', { name: 'Alice Anderson' })).toBeInTheDocument()
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
    expect(container.querySelector('.member-card-initials')).not.toBeNull()
  })

  it('renders <img> with alt=name when avatar is set', () => {
    render(<MemberCard member={FULL} />)
    const img = screen.getByRole('img', { name: 'Alice Anderson' })
    expect(img).toHaveAttribute('src', '/avatars/alice.jpg')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('falls back to initials on <img> error event', () => {
    const { container } = render(
      <MemberCard member={{ ...FULL, avatar: 'bad-url.jpg' }} />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(container.querySelector('.member-card-initials')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows initials immediately when avatar is empty string', () => {
    const { container } = render(
      <MemberCard member={{ ...FULL, avatar: '' }} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.member-card-initials')).not.toBeNull()
  })

  it('renders very long bio without throwing', () => {
    const longBio = 'X'.repeat(600)
    render(<MemberCard member={{ ...FULL, bio: longBio }} />)
    expect(screen.getByText(longBio)).toBeInTheDocument()
  })

  it('initials = "M" for single ASCII name "Madonna" with no avatar', () => {
    const { container } = render(
      <MemberCard member={{ id: 'm', name: 'Madonna', role: 'member' }} />,
    )
    expect(container.querySelector('.member-card-initials')?.textContent).toBe('M')
  })

  it('initials = "戸" for single CJK name "戸山香澄"', () => {
    const { container } = render(
      <MemberCard member={{ id: 'k', name: '戸山香澄', role: 'member' }} />,
    )
    expect(container.querySelector('.member-card-initials')?.textContent).toBe('戸')
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
    // Discord is NOT an anchor
    const discordItem = Array.from(items).find((li) =>
      li.textContent?.includes('alice.a'),
    )
    // Multiple items mention 'alice.a'; specifically verify no <a> exists for Discord text
    const discordLi = Array.from(items).find(
      (li) => li.querySelector('a') === null,
    )
    expect(discordLi).toBeDefined()
    // every <a> must open in new tab safely
    list.querySelectorAll('a').forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    })
    expect(discordItem).toBeDefined()
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

  it('marks initials fallback aria-hidden so SR does not double-announce', () => {
    const { container } = render(
      <MemberCard member={{ id: 'm', name: 'Madonna', role: 'member' }} />,
    )
    const initials = container.querySelector('.member-card-initials')
    expect(initials).toHaveAttribute('aria-hidden', 'true')
  })
})
