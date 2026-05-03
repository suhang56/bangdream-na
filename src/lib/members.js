/**
 * Pure helpers for the Members page. Inputs are never mutated; every function
 * returns a new value. See docs/p3-architecture.md §3.
 */

/**
 * @param {Array<Object>} members
 * @param {{ bands?: string[], role?: string|null, search?: string }} [filters]
 * @returns {Array<Object>} new array; input never mutated.
 */
export function filterMembers(members, filters = {}) {
  const { bands = [], role = null, search = '' } = filters ?? {}
  const bandSet = new Set((bands ?? []).map((b) => String(b).toLowerCase()))
  const q = String(search ?? '').trim().toLowerCase()
  const roleKey = role || null

  return members.filter((m) => {
    if (bandSet.size > 0) {
      if (!m.oshiBand || !bandSet.has(String(m.oshiBand).toLowerCase())) {
        return false
      }
    }
    if (roleKey && m.role !== roleKey) return false
    if (q) {
      const hay = [m.name, m.city, m.bio, m.oshiCharacter, m.coverBand]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/**
 * Sort by `name` ascending using locale-aware, case- and accent-insensitive
 * comparison. Returns a new array; input is never mutated.
 *
 * @param {Array<Object>} members
 * @returns {Array<Object>}
 */
export function sortMembersByName(members) {
  return [...members].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
      sensitivity: 'base',
    }),
  )
}

// Match a leading CJK ideograph, kana, or Hangul.
// Ranges via unicode escapes:
//   、-鿿: CJK Symbols+Punctuation, Hiragana, Katakana, CJK Unified Ideographs
//                  (starts at U+3001 to skip U+3000 ideographic-space, which is whitespace)
//   가-힯: Hangul Syllables
const CJK_LEADING = /^[、-鿿가-힯]/u

/**
 * Compute 1-2 character initials from a display name.
 * - Empty / whitespace / non-string → ""
 * - Single ASCII word → first letter, uppercased
 * - Two+ ASCII words → first letter of first two words, uppercased
 * - Single CJK token → first CJK char (no uppercase)
 * - Two+ CJK tokens → first chars of first two, joined
 *
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (typeof name !== 'string') return ''
  const trimmed = name.trim()
  if (!trimmed) return ''

  const tokens = trimmed.split(/\s+/u).filter(Boolean)
  if (tokens.length === 0) return ''

  const isCJK = CJK_LEADING.test(tokens[0])

  if (tokens.length === 1) {
    const first = tokens[0][0]
    return isCJK ? first : first.toUpperCase()
  }

  const a = tokens[0][0]
  const b = tokens[1][0]
  return isCJK ? `${a}${b}` : `${a}${b}`.toUpperCase()
}
