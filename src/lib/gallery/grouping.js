/**
 * Pure helpers that bucket adapted gallery items into display groups.
 *
 * Groups by event (via eventId) or album (via album string). Items inside
 * each group are sorted chronologically ascending (oldest first); groups
 * are sorted by their newest item's takenAt descending (most recent first).
 *
 * Group ids are deterministic so deep links like `/gallery#event-foo` and
 * filter URLs like `/gallery?album=event-foo` resolve to a stable key.
 */

function normalizeAlbumKey(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    || 'album'
}

function newestSortKey(items) {
  let best = null
  for (const it of items) {
    const t = it.takenAt ?? null
    if (t == null) continue
    if (best == null || t > best) best = t
  }
  if (best != null) return { taken: best, fallback: false }
  let bestCreated = 0
  for (const it of items) {
    if ((it.createdAt ?? 0) > bestCreated) bestCreated = it.createdAt ?? 0
  }
  return { taken: bestCreated, fallback: true }
}

function compareItems(a, b) {
  const ta = a.takenAt ?? null
  const tb = b.takenAt ?? null
  if (ta == null && tb == null) return (a.createdAt ?? 0) - (b.createdAt ?? 0)
  if (ta == null) return 1
  if (tb == null) return -1
  return ta - tb
}

function compareGroups(a, b) {
  const aKey = newestSortKey(a.items)
  const bKey = newestSortKey(b.items)
  if (aKey.fallback !== bKey.fallback) return aKey.fallback ? 1 : -1
  return bKey.taken - aKey.taken
}

function formatDateRange(items) {
  const stamps = items
    .map((i) => i.takenAt)
    .filter((t) => typeof t === 'number')
  if (stamps.length === 0) return ''
  const min = Math.min(...stamps)
  const max = Math.max(...stamps)
  const fmt = (sec) => {
    const d = new Date(sec * 1000)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const a = fmt(min)
  const b = fmt(max)
  if (!a) return ''
  if (a === b) return a
  return `${a} ~ ${b}`
}

/**
 * Build all groups from items. When `selectedGroupId` is provided, returns
 * only the group with that id (post-filter); otherwise returns every group.
 *
 * @param {Array} items adapted gallery items (camelCase)
 * @param {string|null} [selectedGroupId]
 * @returns {Array<{
 *   id: string,
 *   label: string,
 *   kind: 'event'|'album',
 *   eventSlug: string|null,
 *   items: Array,
 *   dateRange: string,
 * }>}
 */
export function buildGroups(items, selectedGroupId = null) {
  if (!Array.isArray(items) || items.length === 0) return []

  const eventGroups = new Map()
  const albumGroups = new Map()

  for (const it of items) {
    if (!it) continue
    if (it.eventId != null && it.eventSlug) {
      const key = `event-${it.eventSlug}`
      const bucket = eventGroups.get(key) ?? {
        id: key,
        label: it.eventTitleZh || it.eventSlug,
        kind: 'event',
        eventSlug: it.eventSlug,
        items: [],
      }
      bucket.items.push(it)
      eventGroups.set(key, bucket)
      continue
    }
    if (it.album) {
      const norm = normalizeAlbumKey(it.album)
      const key = `album-${norm}`
      const bucket = albumGroups.get(key) ?? {
        id: key,
        label: it.album,
        kind: 'album',
        eventSlug: null,
        items: [],
      }
      bucket.items.push(it)
      albumGroups.set(key, bucket)
    }
  }

  const all = [...eventGroups.values(), ...albumGroups.values()]
  for (const g of all) {
    g.items.sort(compareItems)
    g.dateRange = formatDateRange(g.items)
  }
  all.sort(compareGroups)

  if (selectedGroupId) {
    return all.filter((g) => g.id === selectedGroupId)
  }
  return all
}

/**
 * Extract the dropdown options. Same id scheme as `buildGroups`; each
 * entry carries `count` so the picker can render "<label> · N 张".
 *
 * @param {Array} items adapted gallery items
 * @returns {Array<{id: string, label: string, count: number, kind: 'event'|'album'}>}
 */
export function extractGroupOptions(items) {
  const groups = buildGroups(items)
  return groups.map((g) => ({
    id: g.id,
    label: g.label,
    count: g.items.length,
    kind: g.kind,
  }))
}

export const __internals = { normalizeAlbumKey }
