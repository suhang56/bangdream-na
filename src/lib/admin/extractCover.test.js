import { describe, it, expect } from 'vitest'
import { extractCover, stripFencedCode } from './extractCover.js'

describe('extractCover — empty / null', () => {
  it('returns null for null', () => {
    expect(extractCover(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(extractCover(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractCover('')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(extractCover(42)).toBeNull()
    expect(extractCover({})).toBeNull()
    expect(extractCover([])).toBeNull()
  })

  it('returns null when body has no images', () => {
    expect(extractCover('Just text. No images here.')).toBeNull()
  })
})

describe('extractCover — single image', () => {
  it('extracts https URL', () => {
    expect(extractCover('![alt](https://cdn.bangdream.org/news/foo.png)')).toBe(
      'https://cdn.bangdream.org/news/foo.png',
    )
  })

  it('extracts http URL', () => {
    expect(extractCover('![alt](http://example.com/x.jpg)')).toBe('http://example.com/x.jpg')
  })

  it('extracts root-relative URL', () => {
    expect(extractCover('![](/assets/hero.png)')).toBe('/assets/hero.png')
  })

  it('extracts even with empty alt text', () => {
    expect(extractCover('![](https://cdn.bangdream.org/x.png)')).toBe(
      'https://cdn.bangdream.org/x.png',
    )
  })

  it('extracts URL with whitespace inside parens', () => {
    expect(extractCover('![hi]( https://cdn.bangdream.org/x.png )')).toBe(
      'https://cdn.bangdream.org/x.png',
    )
  })

  it('strips optional "title" suffix', () => {
    expect(extractCover('![hi](https://cdn.bangdream.org/x.png "Big Hero")')).toBe(
      'https://cdn.bangdream.org/x.png',
    )
  })
})

describe('extractCover — multiple images', () => {
  it('returns the FIRST image when multiple exist', () => {
    const body = 'intro\n![one](https://cdn.bangdream.org/a.png)\nmiddle\n![two](https://cdn.bangdream.org/b.png)'
    expect(extractCover(body)).toBe('https://cdn.bangdream.org/a.png')
  })

  it('first match wins even when later are more "useful"', () => {
    const body = '![small](https://cdn.bangdream.org/thumb.png) main: ![big](https://cdn.bangdream.org/big.png)'
    expect(extractCover(body)).toBe('https://cdn.bangdream.org/thumb.png')
  })
})

describe('extractCover — fenced code blocks', () => {
  it('skips images inside fenced code block', () => {
    const body = '```md\n![demo](https://example.com/demo.png)\n```\n\n![real](https://cdn.bangdream.org/real.png)'
    expect(extractCover(body)).toBe('https://cdn.bangdream.org/real.png')
  })

  it('returns null when only image is in code fence', () => {
    const body = '```\n![](https://example.com/x.png)\n```'
    expect(extractCover(body)).toBeNull()
  })

  it('handles multiple code blocks before real image', () => {
    const body = '```\n![a](https://x/a.png)\n```\n```\n![b](https://x/b.png)\n```\n![c](https://cdn.bangdream.org/c.png)'
    expect(extractCover(body)).toBe('https://cdn.bangdream.org/c.png')
  })
})

describe('extractCover — malformed', () => {
  it('returns null for malformed image markdown (missing closing paren)', () => {
    expect(extractCover('![alt](https://x.png')).toBeNull()
  })

  it('returns null for empty parens', () => {
    expect(extractCover('![](  )')).toBeNull()
  })

  it('returns null for non-URL content (no scheme, no leading slash)', () => {
    expect(extractCover('![alt](foo.png)')).toBeNull()
  })

  it('returns null for HTML img tag (not extracted)', () => {
    expect(extractCover('<img src="https://cdn.bangdream.org/x.png" alt="">')).toBeNull()
  })

  it('handles brackets without `!` prefix as a link, not image', () => {
    expect(extractCover('[link](https://x.com)')).toBeNull()
  })
})

describe('extractCover — nested in HTML', () => {
  it('extracts when image is inside a paragraph with HTML around', () => {
    const body = '<div>some html</div>\n![](https://cdn.bangdream.org/x.png)'
    expect(extractCover(body)).toBe('https://cdn.bangdream.org/x.png')
  })

  it('extracts when image follows blockquote', () => {
    expect(extractCover('> quote\n\n![](https://cdn.bangdream.org/q.png)')).toBe(
      'https://cdn.bangdream.org/q.png',
    )
  })
})

describe('stripFencedCode helper', () => {
  it('removes fenced code', () => {
    expect(stripFencedCode('a\n```\ncode\n```\nb')).toBe('a\n\nb')
  })

  it('removes multiple fences', () => {
    expect(stripFencedCode('```\nx\n```\n```\ny\n```')).toBe('\n')
  })

  it('returns empty string for non-string', () => {
    expect(stripFencedCode(null)).toBe('')
    expect(stripFencedCode(42)).toBe('')
  })

  it('passes body without fences through unchanged', () => {
    expect(stripFencedCode('plain body')).toBe('plain body')
  })
})
