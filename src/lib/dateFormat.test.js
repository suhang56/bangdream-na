import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatDateRange } from './dateFormat.js'

describe('formatDate', () => {
  it('formats ISO datetime to YYYY.MM.DD', () => {
    expect(formatDate('2026-07-04T19:00:00Z')).toBe('2026.07.04')
  })

  it('formats ISO date-only to YYYY.MM.DD', () => {
    expect(formatDate('2026-07-04')).toBe('2026.07.04')
  })

  it('zero-pads single-digit month and day', () => {
    expect(formatDate('2026-01-05T00:00:00Z')).toBe('2026.01.05')
  })

  it('handles leap year Feb 29 (edge)', () => {
    expect(formatDate('2024-02-29T00:00:00Z')).toBe('2024.02.29')
  })

  it('handles year 2000 (edge — Y2K)', () => {
    expect(formatDate('2000-01-01T00:00:00Z')).toBe('2000.01.01')
  })

  it('handles year < 1900 (edge)', () => {
    expect(formatDate('1899-12-31T00:00:00Z')).toBe('1899.12.31')
  })

  it('handles year > 9999 (edge)', () => {
    const out = formatDate('+010000-01-01T00:00:00Z')
    // Some engines may not parse +010000; accept either '' or 10000.01.01
    expect(out === '' || out === '10000.01.01').toBe(true)
  })

  it('returns "" for empty string (edge)', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns "" for whitespace (edge)', () => {
    expect(formatDate('   ')).toBe('')
  })

  it('returns "" for null/undefined/numeric/object input (edge)', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate(0)).toBe('')
    expect(formatDate(42)).toBe('')
    expect(formatDate({})).toBe('')
    expect(formatDate([])).toBe('')
  })

  it('returns "" for malformed string (edge)', () => {
    expect(formatDate('not-a-date')).toBe('')
    expect(formatDate('yesterday')).toBe('')
  })

  it('handles ISO with timezone offset using UTC fields', () => {
    expect(formatDate('2026-07-04T23:00:00-07:00')).toBe('2026.07.05')
  })
})

describe('formatDateTime', () => {
  it('returns date-only when input has no time', () => {
    expect(formatDateTime('2026-07-04')).toBe('2026.07.04')
  })

  it('appends time when input has time component', () => {
    const out = formatDateTime('2026-07-04T19:00:00Z')
    expect(out).toMatch(/^2026\.07\.04 /)
  })

  it('returns "" for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('')
    expect(formatDateTime(null)).toBe('')
  })
})

describe('formatDateRange', () => {
  it('collapses same-day range', () => {
    expect(formatDateRange('2026-07-04', '2026-07-04')).toBe('2026.07.04')
  })

  it('renders multi-day range with en-dash separator', () => {
    expect(formatDateRange('2026-07-04', '2026-07-06')).toBe('2026.07.04 – 2026.07.06')
  })

  it('handles year boundary range (edge)', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('2026.12.30 – 2027.01.02')
  })

  it('null end → start only', () => {
    expect(formatDateRange('2026-07-04', null)).toBe('2026.07.04')
  })

  it('undefined end → start only', () => {
    expect(formatDateRange('2026-07-04')).toBe('2026.07.04')
  })

  it('empty end string → start only', () => {
    expect(formatDateRange('2026-07-04', '')).toBe('2026.07.04')
  })

  it('invalid end → start only', () => {
    expect(formatDateRange('2026-07-04', 'bad')).toBe('2026.07.04')
  })

  it('invalid start → empty (edge)', () => {
    expect(formatDateRange('not-a-date', '2026-07-04')).toBe('')
  })

  it('both invalid → empty (edge)', () => {
    expect(formatDateRange('', null)).toBe('')
  })
})
