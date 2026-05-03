import { describe, it, expect } from 'vitest'
import { next, prev, shouldAutoAdvance } from './carousel.js'

describe('next', () => {
  it('advances within range', () => {
    expect(next(0, 5)).toBe(1)
    expect(next(3, 5)).toBe(4)
  })

  it('wraps from last to first', () => {
    expect(next(4, 5)).toBe(0)
  })

  it('single slide stays put (edge)', () => {
    expect(next(0, 1)).toBe(0)
  })

  it('zero length → 0 (edge)', () => {
    expect(next(0, 0)).toBe(0)
    expect(next(5, 0)).toBe(0)
  })

  it('negative length → 0 (edge)', () => {
    expect(next(0, -3)).toBe(0)
  })

  it('negative current wraps positively (edge)', () => {
    expect(next(-1, 5)).toBe(0)
  })

  it('out-of-range current wraps via modulo (edge)', () => {
    expect(next(99, 5)).toBe(0)
  })

  it('NaN current → 0 (edge defensive)', () => {
    expect(next(NaN, 5)).toBe(1)
  })
})

describe('prev', () => {
  it('decrements within range', () => {
    expect(prev(2, 5)).toBe(1)
  })

  it('wraps from first to last', () => {
    expect(prev(0, 5)).toBe(4)
  })

  it('single slide stays put (edge)', () => {
    expect(prev(0, 1)).toBe(0)
  })

  it('zero length → 0 (edge)', () => {
    expect(prev(0, 0)).toBe(0)
  })
})

describe('shouldAutoAdvance', () => {
  it('paused → false', () => {
    expect(shouldAutoAdvance({ paused: true, length: 5 }, 0, 10000, 6000)).toBe(false)
  })

  it('length 0 → false (edge)', () => {
    expect(shouldAutoAdvance({ paused: false, length: 0 }, 0, 10000, 6000)).toBe(false)
  })

  it('length 1 → false (edge — pointless)', () => {
    expect(shouldAutoAdvance({ paused: false, length: 1 }, 0, 10000, 6000)).toBe(false)
  })

  it('intervalMs <= 0 → false (edge)', () => {
    expect(shouldAutoAdvance({ paused: false, length: 5 }, 0, 10000, 0)).toBe(false)
    expect(shouldAutoAdvance({ paused: false, length: 5 }, 0, 10000, -1)).toBe(false)
  })

  it('not enough time elapsed → false', () => {
    expect(shouldAutoAdvance({ paused: false, length: 3 }, 0, 5999, 6000)).toBe(false)
  })

  it('exactly at threshold → true (edge boundary)', () => {
    expect(shouldAutoAdvance({ paused: false, length: 3 }, 0, 6000, 6000)).toBe(true)
  })

  it('long since last interaction → true', () => {
    expect(shouldAutoAdvance({ paused: false, length: 3 }, 0, 100000, 6000)).toBe(true)
  })

  it('default interval 6000ms', () => {
    expect(shouldAutoAdvance({ paused: false, length: 3 }, 0, 6000)).toBe(true)
    expect(shouldAutoAdvance({ paused: false, length: 3 }, 0, 5999)).toBe(false)
  })

  it('null state → false (edge)', () => {
    expect(shouldAutoAdvance(null, 0, 10000)).toBe(false)
  })

  it('undefined paused defaults to allow advance (edge)', () => {
    expect(
      shouldAutoAdvance({ length: 5 }, 0, 10000, 6000),
    ).toBe(true)
  })
})
