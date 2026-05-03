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

let cachedCollator = null
function getCollator() {
  if (cachedCollator) return cachedCollator
  try {
    cachedCollator = new Intl.Collator('zh-Hans-u-co-pinyin', {
      sensitivity: 'base',
      numeric: true,
    })
  } catch {
    cachedCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
  }
  return cachedCollator
}

/**
 * Sort by `name` ascending using pinyin collation for CJK and alphabetical for
 * Latin scripts. Returns a new array; input is never mutated.
 *
 * @param {Array<Object>} members
 * @returns {Array<Object>}
 */
export function sortMembersByName(members) {
  const collator = getCollator()
  return [...members].sort((a, b) =>
    collator.compare(String(a.name ?? ''), String(b.name ?? '')),
  )
}
