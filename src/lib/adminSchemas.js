/**
 * Schema registry for the bangdream-na admin panel.
 * Pure config + small validation helpers — no fetch, no DOM.
 *
 * @typedef {'text'|'textarea'|'url'|'email'|'datetime'|'date'|'select'|'boolean'|'number'|'asset'|'array'|'object'} FieldType
 *
 * @typedef {Object} FieldDef
 * @property {string} key
 * @property {string} label
 * @property {FieldType} type
 * @property {boolean} [required]
 * @property {boolean} [readOnly]
 * @property {boolean} [autoSlug]
 * @property {string} [autoSlugFrom]
 * @property {boolean} [complex]
 * @property {string[]} [options]
 * @property {string} [uploadDir]
 * @property {string[]} [acceptedMimeTypes]
 * @property {number} [maxBytes]
 * @property {string} [help]
 * @property {string} [placeholder]
 *
 * @typedef {Object} SchemaDef
 * @property {string} key
 * @property {string} title
 * @property {string} file
 * @property {'array'|'object'} shape
 * @property {string} [listKey]
 * @property {string[]} [listColumns]
 * @property {(items: any[]) => any[]} [sortFn]
 * @property {FieldDef[]} fields
 */

const DEFAULT_ASSET_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const DEFAULT_ASSET_MAX = 5 * 1024 * 1024

export const adminSchemas = {
  events: {
    key: 'events',
    title: 'Events',
    file: 'src/data/events.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'date', 'type'],
    sortFn: (items) => [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: 'Auto-generated from title; lowercase + dashes' },
      { key: 'title', type: 'text', label: 'Title', required: true },
      { key: 'date', type: 'datetime', label: 'Date / time', required: true, help: 'ISO 8601, e.g. 2025-09-15T19:00:00-07:00' },
      { key: 'endDate', type: 'datetime', label: 'End date / time', help: 'Optional; for multi-day events' },
      { key: 'type', type: 'select', label: 'Type', required: true, options: ['concert', 'fanmeet', 'con', 'online', 'meetup'] },
      { key: 'location', type: 'object', label: 'Location', complex: true, help: '{"city":"Los Angeles","venue":"YouTube Theater","country":"US"}' },
      { key: 'description', type: 'textarea', label: 'Description' },
      { key: 'links', type: 'array', label: 'Links', complex: true, help: '[{"label":"Tickets","url":"https://..."}]' },
      { key: 'bands', type: 'array', label: 'Bands', complex: true, help: '["Roselia","Poppin\'Party"]' },
      { key: 'image', type: 'asset', label: 'Banner image', uploadDir: 'public/events/' },
      { key: 'ticketUrl', type: 'url', label: 'Ticket URL' },
    ],
  },
  members: {
    key: 'members',
    title: 'Members',
    file: 'src/data/members.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'name', 'role', 'city'],
    sortFn: (items) => [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'name' },
      { key: 'name', type: 'text', label: 'Name', required: true },
      { key: 'role', type: 'select', label: 'Role', options: ['organizer', 'mod', 'member', 'cover-band'] },
      { key: 'city', type: 'text', label: 'City' },
      { key: 'oshi', type: 'text', label: 'Oshi (band/character)' },
      { key: 'bio', type: 'textarea', label: 'Bio' },
      { key: 'avatar', type: 'asset', label: 'Avatar', uploadDir: 'public/members/' },
      { key: 'socials', type: 'array', label: 'Socials', complex: true, help: '[{"platform":"x","url":"https://..."}]' },
    ],
  },
  news: {
    key: 'news',
    title: 'News',
    file: 'src/data/news.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'date', 'tag'],
    sortFn: (items) => [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title' },
      { key: 'title', type: 'text', label: 'Title', required: true },
      { key: 'date', type: 'date', label: 'Date', required: true, help: 'ISO 8601 date, e.g. 2025-09-15' },
      { key: 'tag', type: 'select', label: 'Tag', options: ['announcement', 'event', 'community', 'release', 'update'] },
      { key: 'summary', type: 'textarea', label: 'Summary', help: 'Shown on news list / cards' },
      { key: 'body', type: 'textarea', label: 'Body (markdown)' },
      { key: 'image', type: 'asset', label: 'Hero image', uploadDir: 'public/news/' },
      { key: 'sourceUrl', type: 'url', label: 'Source URL', help: 'Optional external link' },
    ],
  },
  posts: {
    key: 'posts',
    title: 'Posts (home carousel)',
    file: 'src/data/posts.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'datePosted'],
    sortFn: (items) => [...items].sort((a, b) => (b.datePosted ?? '').localeCompare(a.datePosted ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: 'Auto-generated from title; falls back to date + suffix if no title' },
      { key: 'image', type: 'asset', label: 'Image', required: true, uploadDir: 'public/posts/' },
      { key: 'title', type: 'text', label: 'Title overlay', help: 'Optional; absent => image-only card' },
      { key: 'url', type: 'url', label: 'Click target URL', help: 'Optional; absent => non-link card' },
      { key: 'datePosted', type: 'date', label: 'Date posted', required: true, help: 'ISO 8601 date' },
    ],
  },
  social: {
    key: 'social',
    title: 'Social links',
    file: 'src/data/social.json',
    shape: 'array',
    listKey: 'platform',
    listColumns: ['platform', 'label', 'enabled'],
    fields: [
      { key: 'platform', type: 'select', label: 'Platform', required: true, readOnly: true, options: ['discord', 'qq', 'xiaohongshu', 'x', 'wechat'] },
      { key: 'label', type: 'text', label: 'Label', required: true },
      { key: 'url', type: 'url', label: 'URL', help: 'Empty url + qrImage => QR popover tile' },
      { key: 'qrImage', type: 'asset', label: 'QR image', uploadDir: 'public/social/', help: 'Used for WeChat etc.' },
      { key: 'enabled', type: 'boolean', label: 'Enabled' },
    ],
  },
  site: {
    key: 'site',
    title: 'Site identity',
    file: 'src/data/site.json',
    shape: 'object',
    fields: [
      { key: 'discordInvite', type: 'url', label: 'Discord invite URL', required: true },
      { key: 'communityName', type: 'text', label: 'Community name (EN)', required: true, readOnly: true, help: 'Locked — community brand identity. Change requires direct repo edit.' },
      { key: 'communityNameZh', type: 'text', label: 'Community name (ZH)', required: true, readOnly: true, help: 'Locked — community brand identity.' },
      { key: 'communityNameJp', type: 'text', label: 'Community name (JP)', required: true, readOnly: true, help: 'Locked — community brand identity.' },
    ],
  },
  about: {
    key: 'about',
    title: 'About page',
    file: 'src/data/about.json',
    shape: 'object',
    fields: [
      { key: 'mission', type: 'textarea', label: 'Mission', required: true },
      { key: 'history', type: 'textarea', label: 'History', required: true },
      { key: 'faq', type: 'array', label: 'FAQ', complex: true, required: true, help: '[{"q":"...","a":"..."}]' },
      { key: 'coc', type: 'textarea', label: 'Code of conduct', required: true },
      { key: 'joinInstructions', type: 'textarea', label: 'Join instructions', required: true },
    ],
  },
}

/**
 * @param {string} key
 * @returns {SchemaDef|undefined}
 */
export function getSchema(key) {
  return adminSchemas[key]
}

export function listSchemaKeys() {
  return Object.keys(adminSchemas)
}

/**
 * Slugify text into URL/file-safe form. Preserves CJK characters; lowercases
 * ASCII; collapses whitespace into dashes.
 *
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  if (input == null) return ''
  const s = String(input).trim().toLowerCase()
  if (s === '') return ''
  // Replace whitespace runs with single dash
  // Strip ASCII non-word chars (keep CJK / emoji)
  return s
    .replace(/[!-,.-/:-@[-`{-~]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n)
}

function isParsableDate(s) {
  if (typeof s !== 'string' || s.length === 0) return false
  const t = Date.parse(s)
  return Number.isFinite(t)
}

/**
 * Validate that a single item conforms to the schema with given key.
 * Returns array of { fieldKey, message } — empty when valid.
 *
 * @param {string} schemaKey
 * @param {unknown} item
 * @returns {Array<{ fieldKey: string, message: string }>}
 */
export function validateItem(schemaKey, item) {
  const schema = adminSchemas[schemaKey]
  if (!schema) return [{ fieldKey: '__schema__', message: `Unknown schema: ${schemaKey}` }]
  const errors = []
  const obj = item && typeof item === 'object' ? item : {}
  for (const field of schema.fields) {
    const v = obj[field.key]
    const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0)
    if (field.required) {
      if (empty) {
        if (field.autoSlug && field.readOnly && obj[field.autoSlugFrom]) {
          // OK — will be filled at save time via slugify
        } else if (field.type === 'boolean' && (v === true || v === false)) {
          // boolean false is allowed
        } else {
          errors.push({ fieldKey: field.key, message: `${field.label} is required` })
          continue
        }
      }
    }
    if (empty) continue
    switch (field.type) {
      case 'url':
        try {
          const u = new URL(v)
          if (!/^https?:$/i.test(u.protocol)) {
            errors.push({ fieldKey: field.key, message: `${field.label} must be an http(s) URL` })
          }
        } catch {
          errors.push({ fieldKey: field.key, message: `${field.label} is not a valid URL` })
        }
        break
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} is not a valid email` })
        }
        break
      case 'date':
      case 'datetime':
        if (!isParsableDate(String(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} is not a valid date` })
        }
        break
      case 'select':
        if (Array.isArray(field.options) && !field.options.includes(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} must be one of: ${field.options.join(', ')}` })
        }
        break
      case 'number':
        if (!isFiniteNumber(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} must be a number` })
        }
        break
      case 'boolean':
        if (typeof v !== 'boolean') {
          errors.push({ fieldKey: field.key, message: `${field.label} must be true or false` })
        }
        break
      case 'asset':
        if (typeof v !== 'string' || v.length === 0) {
          if (field.required) errors.push({ fieldKey: field.key, message: `${field.label} is required` })
        }
        break
      case 'array':
        if (field.complex && !Array.isArray(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} must be a JSON array` })
        }
        break
      case 'object':
        if (field.complex && (typeof v !== 'object' || Array.isArray(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} must be a JSON object` })
        }
        break
      default:
        // text / textarea — required already handled
        break
    }
  }
  return errors
}

/**
 * Validate that no two items share the same listKey value.
 *
 * @param {string} schemaKey
 * @param {unknown[]} items
 * @returns {Array<{ fieldKey: string, message: string }>}
 */
export function validateUnique(schemaKey, items) {
  const schema = adminSchemas[schemaKey]
  if (!schema || schema.shape !== 'array' || !Array.isArray(items)) return []
  const seen = new Set()
  const errors = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const id = item[schema.listKey]
    if (id == null || id === '') continue
    if (seen.has(id)) {
      errors.push({ fieldKey: schema.listKey, message: `Duplicate ${schema.listKey}: ${id}` })
    }
    seen.add(id)
  }
  return errors
}

/**
 * Compose the slug-id at save time. Falls back to a unique-enough suffix.
 *
 * @param {string} schemaKey
 * @param {object} item
 * @returns {string}
 */
export function autoIdForItem(schemaKey, item) {
  const schema = adminSchemas[schemaKey]
  if (!schema) return ''
  const idField = schema.fields.find((f) => f.autoSlug && f.readOnly)
  if (!idField) return ''
  const current = item?.[idField.key]
  if (typeof current === 'string' && current.length > 0) return current
  const sourceVal = item?.[idField.autoSlugFrom]
  const slug = slugify(sourceVal ?? '')
  if (slug) return slug
  return `${schemaKey}-${Date.now().toString(36)}`
}

export const __defaults = {
  assetMime: DEFAULT_ASSET_MIME,
  assetMaxBytes: DEFAULT_ASSET_MAX,
}
