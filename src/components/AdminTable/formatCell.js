/**
 * Default cell formatter for AdminTable columns. Strings pass through;
 * booleans render as ✓ / —; arrays/objects are JSON-stringified for
 * an at-a-glance preview (caller can override via column.format).
 *
 * @param {unknown} v
 * @returns {string}
 */
export function formatCell(v) {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? '✓' : '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}
