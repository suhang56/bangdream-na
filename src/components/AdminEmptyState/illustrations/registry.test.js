import { describe, it, expect } from 'vitest'
import { getIllustration, ILLUSTRATION_KEYS } from './index.js'
import EventsArt from './events.jsx'
import MembersArt from './members.jsx'
import NewsArt from './news.jsx'
import PostsArt from './posts.jsx'
import SocialArt from './social.jsx'
import SiteArt from './site.jsx'
import AboutArt from './about.jsx'
import DefaultArt from './_default.jsx'

describe('illustration registry', () => {
  it('exposes all 7 schema keys', () => {
    expect(ILLUSTRATION_KEYS.sort()).toEqual(
      ['about', 'events', 'members', 'news', 'posts', 'site', 'social'].sort(),
    )
  })

  it('returns the matching component for each registered schema key', () => {
    expect(getIllustration('events')).toBe(EventsArt)
    expect(getIllustration('members')).toBe(MembersArt)
    expect(getIllustration('news')).toBe(NewsArt)
    expect(getIllustration('posts')).toBe(PostsArt)
    expect(getIllustration('social')).toBe(SocialArt)
    expect(getIllustration('site')).toBe(SiteArt)
    expect(getIllustration('about')).toBe(AboutArt)
  })

  it('returns the default component for unknown schema keys', () => {
    expect(getIllustration('unknown')).toBe(DefaultArt)
    expect(getIllustration('')).toBe(DefaultArt)
    expect(getIllustration('constructor')).toBe(DefaultArt)
    expect(getIllustration('__proto__')).toBe(DefaultArt)
  })

  it('returns the default component for non-string inputs (defensive)', () => {
    expect(getIllustration(null)).toBe(DefaultArt)
    expect(getIllustration(undefined)).toBe(DefaultArt)
    expect(getIllustration(42)).toBe(DefaultArt)
    expect(getIllustration({})).toBe(DefaultArt)
  })

  it('every registry entry is a React component (function)', () => {
    for (const key of ILLUSTRATION_KEYS) {
      const C = getIllustration(key)
      expect(typeof C).toBe('function')
    }
  })
})
