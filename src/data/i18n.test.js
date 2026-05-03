import { describe, it, expect } from 'vitest'
import i18n from './i18n.json'

describe('i18n.json — forum keys (chrome bilingual policy)', () => {
  it('en block has nav.forum', () => {
    expect(i18n.en['nav.forum']).toBe('Forum')
  })

  it('zh block has nav.forum', () => {
    expect(i18n.zh['nav.forum']).toBe('论坛')
  })

  it('en block has platforms.forum', () => {
    expect(i18n.en['platforms.forum']).toBe('Forum')
  })

  it('zh block has platforms.forum', () => {
    expect(i18n.zh['platforms.forum']).toBe('论坛')
  })

  it('all chrome keys present in en are also in zh (no en-only ship)', () => {
    const enKeys = Object.keys(i18n.en)
    const zhKeys = new Set(Object.keys(i18n.zh))
    const missing = enKeys.filter((k) => !zhKeys.has(k))
    expect(missing).toEqual([])
  })
})
