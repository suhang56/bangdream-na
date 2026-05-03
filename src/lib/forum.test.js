import { describe, it, expect } from 'vitest'
import { isForumEnabled } from './forum.js'

describe('isForumEnabled', () => {
  it('returns false when input is not an array (null)', () => {
    expect(isForumEnabled(null)).toBe(false)
  })

  it('returns false when input is not an array (undefined)', () => {
    expect(isForumEnabled(undefined)).toBe(false)
  })

  it('returns false when input is not an array (object)', () => {
    expect(isForumEnabled({ platform: 'forum', enabled: true })).toBe(false)
  })

  it('returns false when input is empty array', () => {
    expect(isForumEnabled([])).toBe(false)
  })

  it('returns false when array has no forum row', () => {
    expect(
      isForumEnabled([
        { platform: 'discord', enabled: true, url: 'https://discord.gg/x' },
      ]),
    ).toBe(false)
  })

  it('returns false when forum row enabled is false', () => {
    expect(
      isForumEnabled([
        {
          platform: 'forum',
          enabled: false,
          url: 'https://forum.bangdream.org',
        },
      ]),
    ).toBe(false)
  })

  it('returns false when forum row enabled is missing', () => {
    expect(
      isForumEnabled([
        { platform: 'forum', url: 'https://forum.bangdream.org' },
      ]),
    ).toBe(false)
  })

  it('returns false when forum row url is empty string', () => {
    expect(
      isForumEnabled([{ platform: 'forum', enabled: true, url: '' }]),
    ).toBe(false)
  })

  it('returns false when forum row url is missing', () => {
    expect(isForumEnabled([{ platform: 'forum', enabled: true }])).toBe(false)
  })

  it('returns false when forum row url is not a string', () => {
    expect(
      isForumEnabled([{ platform: 'forum', enabled: true, url: 123 }]),
    ).toBe(false)
  })

  it('returns false when array has null entry mixed with valid forum (defensive find guard)', () => {
    expect(
      isForumEnabled([
        null,
        { platform: 'forum', enabled: false, url: 'https://forum.x' },
      ]),
    ).toBe(false)
  })

  it('returns true when forum row enabled:true with valid https url', () => {
    expect(
      isForumEnabled([
        {
          platform: 'forum',
          enabled: true,
          url: 'https://forum.bangdream.org',
        },
      ]),
    ).toBe(true)
  })

  it('returns true even when forum row is not first in array', () => {
    expect(
      isForumEnabled([
        { platform: 'discord', enabled: true, url: 'https://discord.gg/x' },
        { platform: 'qq', enabled: true, url: 'https://qq.com/x' },
        {
          platform: 'forum',
          enabled: true,
          url: 'https://forum.bangdream.org',
        },
      ]),
    ).toBe(true)
  })
})
