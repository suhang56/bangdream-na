import { describe, it, expect } from 'vitest'
import {
  themes,
  themeOrder,
  REQUIRED_TOKENS,
  DEFAULT_THEME_KEY,
  isValidThemeKey,
} from './themes.js'

describe('themes contract', () => {
  it('themeOrder lists all 8 expected themes', () => {
    expect(themeOrder).toEqual([
      'neutral',
      'roselia',
      'popipa',
      'mygo',
      'morfonica',
      'afterglow',
      'pastel',
      'hhw',
    ])
  })

  it('every key in themeOrder has a matching theme entry', () => {
    for (const key of themeOrder) {
      expect(themes[key]).toBeDefined()
      expect(themes[key].key).toBe(key)
    }
  })

  it('every theme defines all required tokens', () => {
    for (const key of themeOrder) {
      const tokens = themes[key].tokens
      for (const tok of REQUIRED_TOKENS) {
        expect(tokens[tok], `${key} missing ${tok}`).toBeTruthy()
      }
    }
  })

  it('every theme has a non-empty display name', () => {
    for (const key of themeOrder) {
      expect(themes[key].name).toBeTruthy()
      expect(typeof themes[key].name).toBe('string')
    }
  })

  it('Roselia primary is lifted to #a020c0 (AA on dark bg)', () => {
    expect(themes.roselia.tokens['--color-primary']).toBe('#a020c0')
  })

  it('Roselia accent retains canon gold #d4af37', () => {
    expect(themes.roselia.tokens['--color-accent']).toBe('#d4af37')
  })

  it('every theme defines --color-on-primary and --color-on-accent (badge contrast tokens)', () => {
    for (const key of themeOrder) {
      const tokens = themes[key].tokens
      expect(tokens['--color-on-primary'], `${key} missing --color-on-primary`).toBeTruthy()
      expect(tokens['--color-on-accent'], `${key} missing --color-on-accent`).toBeTruthy()
    }
  })

  it('hhw overrides --color-on-primary to dark (yellow primary fails AA on white)', () => {
    expect(themes.hhw.tokens['--color-on-primary']).toBe('rgba(0, 0, 0, 0.85)')
  })

  it('roselia / pastel / morfonica override --color-on-accent to dark (light accent fails AA on white)', () => {
    expect(themes.roselia.tokens['--color-on-accent']).toBe('rgba(0, 0, 0, 0.85)')
    expect(themes.pastel.tokens['--color-on-accent']).toBe('rgba(0, 0, 0, 0.85)')
    expect(themes.morfonica.tokens['--color-on-accent']).toBe('rgba(0, 0, 0, 0.85)')
  })

  it('every theme defines --color-error and --color-error-on (P8 admin error tokens)', () => {
    for (const key of themeOrder) {
      const tokens = themes[key].tokens
      expect(tokens['--color-error'], `${key} missing --color-error`).toBeTruthy()
      expect(tokens['--color-error-on'], `${key} missing --color-error-on`).toBeTruthy()
    }
  })

  it('REQUIRED_TOKENS includes --color-error and --color-error-on', () => {
    expect(REQUIRED_TOKENS).toContain('--color-error')
    expect(REQUIRED_TOKENS).toContain('--color-error-on')
  })

  it('DEFAULT_THEME_KEY is "neutral" and exists', () => {
    expect(DEFAULT_THEME_KEY).toBe('neutral')
    expect(themes[DEFAULT_THEME_KEY]).toBeDefined()
  })

  it('isValidThemeKey accepts known keys, rejects unknown / non-string (edge)', () => {
    expect(isValidThemeKey('neutral')).toBe(true)
    expect(isValidThemeKey('roselia')).toBe(true)
    expect(isValidThemeKey('not-a-band')).toBe(false)
    expect(isValidThemeKey('')).toBe(false)
    expect(isValidThemeKey(null)).toBe(false)
    expect(isValidThemeKey(undefined)).toBe(false)
    expect(isValidThemeKey(42)).toBe(false)
    expect(isValidThemeKey({})).toBe(false)
  })

  it('rejects prototype-pollution via "constructor" / "__proto__" (edge)', () => {
    expect(isValidThemeKey('constructor')).toBe(false)
    expect(isValidThemeKey('__proto__')).toBe(false)
  })
})
