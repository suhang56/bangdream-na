import { describe, it, expect } from 'vitest'
import {
  parseTags,
  parseExplicitTags,
  extractHashTags,
  mergeTags,
} from './parseTags.js'

describe('parseExplicitTags', () => {
  it('returns [] for null/undefined', () => {
    expect(parseExplicitTags(null)).toEqual([])
    expect(parseExplicitTags(undefined)).toEqual([])
  })

  it('handles single ASCII tag', () => {
    expect(parseExplicitTags('news')).toEqual(['news'])
  })

  it('handles CSV string', () => {
    expect(parseExplicitTags('a, b , c')).toEqual(['a', 'b', 'c'])
  })

  it('lowercases ASCII', () => {
    expect(parseExplicitTags('FOO,BaR')).toEqual(['foo', 'bar'])
  })

  it('preserves CJK', () => {
    expect(parseExplicitTags('公告,活动')).toEqual(['公告', '活动'])
  })

  it('handles array input', () => {
    expect(parseExplicitTags(['x', 'Y', '  z  '])).toEqual(['x', 'y', 'z'])
  })

  it('drops empty entries', () => {
    expect(parseExplicitTags('a,,b, ,c')).toEqual(['a', 'b', 'c'])
  })

  it('drops over-40-char tags', () => {
    const long = 'a'.repeat(41)
    expect(parseExplicitTags(`ok,${long}`)).toEqual(['ok'])
  })

  it('returns [] for non-string non-array input', () => {
    expect(parseExplicitTags(42)).toEqual([])
    expect(parseExplicitTags({})).toEqual([])
  })

  it('array with non-string entries drops them', () => {
    expect(parseExplicitTags(['ok', null, 42, undefined, ''])).toEqual(['ok'])
  })
})

describe('extractHashTags', () => {
  it('returns [] for empty/null/undefined', () => {
    expect(extractHashTags('')).toEqual([])
    expect(extractHashTags(null)).toEqual([])
    expect(extractHashTags(undefined)).toEqual([])
  })

  it('returns [] for body without hashtags', () => {
    expect(extractHashTags('Just text. No tags.')).toEqual([])
  })

  it('extracts a single ASCII hashtag at start', () => {
    expect(extractHashTags('#concert')).toEqual(['concert'])
  })

  it('extracts a single Chinese hashtag', () => {
    expect(extractHashTags('#活动 报名开放')).toEqual(['活动'])
  })

  it('extracts mixed CJK + Latin tags', () => {
    expect(extractHashTags('Today is #live and #公告 day')).toEqual(['live', '公告'])
  })

  it('dedupes repeated hashtags', () => {
    expect(extractHashTags('#x and #X and #x again')).toEqual(['x'])
  })

  it('lowercases ASCII tags', () => {
    expect(extractHashTags('#News #FEATURED')).toEqual(['news', 'featured'])
  })

  it('preserves hyphens and underscores in tags', () => {
    expect(extractHashTags('#cover-band #my_band')).toEqual(['cover-band', 'my_band'])
  })

  it('does NOT match `#` inside markdown link target like [x](#sec)', () => {
    expect(extractHashTags('See [section](#section) for more')).toEqual([])
  })

  it('does NOT match `#` inside attribute like id="#foo"', () => {
    expect(extractHashTags('<a id="#foo">x</a>')).toEqual([])
  })

  it('matches hashtag after newline', () => {
    expect(extractHashTags('First line\n#newline-tag\nDone')).toEqual(['newline-tag'])
  })

  it('handles multiple lines with multiple tags', () => {
    expect(extractHashTags('#a\n#b\n#c')).toEqual(['a', 'b', 'c'])
  })

  it('caps tag length to 40 chars (a-zA-Z0-9 + 39 trailing)', () => {
    const max = '#' + 'a'.repeat(40)
    expect(extractHashTags(max)).toEqual(['a'.repeat(40)])
  })

  it('does NOT match `#` followed by non-letter', () => {
    expect(extractHashTags('#! exclamation')).toEqual([])
    expect(extractHashTags('# spaced')).toEqual([])
  })

  it('matches hashtag at end of line', () => {
    expect(extractHashTags('end here #last')).toEqual(['last'])
  })

  it('regex state isolation — multiple calls are independent', () => {
    expect(extractHashTags('#a')).toEqual(['a'])
    expect(extractHashTags('#b')).toEqual(['b'])
    expect(extractHashTags('#c')).toEqual(['c'])
  })

  it('returns [] for non-string body (number, object)', () => {
    expect(extractHashTags(42)).toEqual([])
    expect(extractHashTags({})).toEqual([])
    expect(extractHashTags([])).toEqual([])
  })
})

describe('mergeTags', () => {
  it('returns explicit then body tags, deduped', () => {
    expect(mergeTags('a,b', '#b #c')).toEqual(['a', 'b', 'c'])
  })

  it('preserves order — explicit first', () => {
    expect(mergeTags('z,y', '#a #b')).toEqual(['z', 'y', 'a', 'b'])
  })

  it('handles only explicit', () => {
    expect(mergeTags('a,b', '')).toEqual(['a', 'b'])
  })

  it('handles only body', () => {
    expect(mergeTags('', '#a #b')).toEqual(['a', 'b'])
  })

  it('handles both empty', () => {
    expect(mergeTags('', '')).toEqual([])
    expect(mergeTags(null, null)).toEqual([])
  })

  it('mixes CJK + Latin', () => {
    expect(mergeTags('公告', '#announcement #公告')).toEqual(['公告', 'announcement'])
  })
})

describe('parseTags (high level)', () => {
  it('returns [] for null/non-object', () => {
    expect(parseTags(null)).toEqual([])
    expect(parseTags(undefined)).toEqual([])
    expect(parseTags('string')).toEqual([])
  })

  it('returns [] for empty draft', () => {
    expect(parseTags({})).toEqual([])
  })

  it('combines tagsInput + body', () => {
    expect(parseTags({ tagsInput: 'a,b', body: '#c #d' })).toEqual(['a', 'b', 'c', 'd'])
  })

  it('respects array tagsInput', () => {
    expect(parseTags({ tagsInput: ['a', 'b'], body: '#c' })).toEqual(['a', 'b', 'c'])
  })
})
