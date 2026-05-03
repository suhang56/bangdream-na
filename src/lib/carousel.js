/**
 * carousel — pure rotation logic. No React, no DOM, no timers.
 */

function asInt(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.trunc(n)
}

/**
 * @param {number} currentIndex
 * @param {number} length
 * @returns {number} next index, wraps; 0 when length <= 0
 */
export function next(currentIndex, length) {
  const len = asInt(length)
  if (len <= 0) return 0
  const idx = asInt(currentIndex)
  // normalize negative + out-of-range via positive modulo
  return ((idx + 1) % len + len) % len
}

/**
 * @param {number} currentIndex
 * @param {number} length
 * @returns {number} previous index, wraps to length-1 from 0
 */
export function prev(currentIndex, length) {
  const len = asInt(length)
  if (len <= 0) return 0
  const idx = asInt(currentIndex)
  return ((idx - 1) % len + len) % len
}

/**
 * Decides whether enough idle time has elapsed since last interaction
 * to advance the carousel automatically.
 *
 * @param {{ paused: boolean, length: number }} state
 * @param {number} lastInteractionTs - epoch ms of last user action
 * @param {number} nowTs              - epoch ms (caller-injected)
 * @param {number} [intervalMs=6000]  - cadence
 * @returns {boolean}
 */
export function shouldAutoAdvance(state, lastInteractionTs, nowTs, intervalMs = 6000) {
  if (!state || state.paused === true) return false
  const len = asInt(state.length)
  if (len <= 1) return false
  const ms = asInt(intervalMs)
  if (ms <= 0) return false
  const last = asInt(lastInteractionTs)
  const now = asInt(nowTs)
  return now - last >= ms
}
