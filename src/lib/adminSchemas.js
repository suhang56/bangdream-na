/**
 * Schema registry for the bangdream-na admin panel.
 * Pure config + small validation helpers — no fetch, no DOM.
 *
 * Operator-visible labels and validation messages are Chinese inline (P8).
 * Schema keys, field keys, types, and enum option values stay English —
 * they are identifiers persisted to JSON, not display labels.
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
const DEFAULT_ASSET_MAX = 15 * 1024 * 1024

export const adminSchemas = {
  events: {
    key: 'events',
    title: '活动',
    file: 'src/data/events.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'date', 'type'],
    sortFn: (items) => [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: '根据标题自动生成；小写字母 + 横线' },
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'date', type: 'datetime', label: '日期 / 时间', required: true, help: 'ISO 8601 格式，例如 2025-09-15T19:00:00-07:00' },
      { key: 'endDate', type: 'datetime', label: '结束日期 / 时间', help: '可选；用于跨日活动' },
      { key: 'type', type: 'select', label: '类型', required: true, options: ['concert', 'fanmeet', 'con', 'online', 'meetup'] },
      { key: 'location', type: 'object', label: '地点', complex: true, help: '{"city":"Los Angeles","venue":"YouTube Theater","country":"US"}' },
      { key: 'description', type: 'textarea', label: '描述' },
      { key: 'links', type: 'array', label: '链接', complex: true, help: '[{"label":"购票","url":"https://..."}]' },
      { key: 'bands', type: 'array', label: '乐队', complex: true, help: '["Roselia","Poppin\'Party"]' },
      { key: 'image', type: 'asset', label: '横幅图片', uploadDir: 'public/events/' },
      { key: 'ticketUrl', type: 'url', label: '购票链接' },
    ],
  },
  members: {
    key: 'members',
    title: '成员',
    file: 'src/data/members.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'name', 'role', 'city'],
    sortFn: (items) => [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'name' },
      { key: 'name', type: 'text', label: '昵称', required: true },
      { key: 'role', type: 'select', label: '身份', options: ['organizer', 'mod', 'member', 'cover-band'] },
      { key: 'city', type: 'text', label: '城市' },
      { key: 'oshi', type: 'text', label: '推（乐队 / 角色）' },
      { key: 'bio', type: 'textarea', label: '简介' },
      { key: 'avatar', type: 'asset', label: '头像', uploadDir: 'public/members/' },
      { key: 'socials', type: 'array', label: '社交账号', complex: true, help: '[{"platform":"x","url":"https://..."}]' },
    ],
  },
  news: {
    key: 'news',
    title: '公告',
    file: 'src/data/news.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'date', 'tag'],
    sortFn: (items) => [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title' },
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'date', type: 'date', label: '日期', required: true, help: 'ISO 8601 日期，例如 2025-09-15' },
      { key: 'tag', type: 'select', label: '标签', options: ['announcement', 'event', 'community', 'release', 'update'] },
      { key: 'summary', type: 'textarea', label: '摘要', help: '在公告列表 / 卡片上显示' },
      { key: 'body', type: 'textarea', label: '正文（Markdown）' },
      { key: 'image', type: 'asset', label: '主图', uploadDir: 'public/news/' },
      { key: 'sourceUrl', type: 'url', label: '原文链接', help: '可选外部链接' },
    ],
  },
  posts: {
    key: 'posts',
    title: '首页轮播',
    file: 'src/data/posts.json',
    shape: 'array',
    listKey: 'id',
    listColumns: ['id', 'title', 'datePosted'],
    sortFn: (items) => [...items].sort((a, b) => (b.datePosted ?? '').localeCompare(a.datePosted ?? '')),
    fields: [
      { key: 'id', type: 'text', label: 'ID', required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: '根据标题自动生成；标题为空时回退到日期 + 后缀' },
      { key: 'image', type: 'asset', label: '图片', required: true, uploadDir: 'public/posts/' },
      { key: 'title', type: 'text', label: '叠加标题', help: '可选；留空时仅显示图片' },
      { key: 'url', type: 'url', label: '点击跳转链接', help: '可选；留空时不可点击' },
      { key: 'datePosted', type: 'date', label: '发布日期', required: true, help: 'ISO 8601 日期' },
    ],
  },
  social: {
    key: 'social',
    title: '社交平台',
    file: 'src/data/social.json',
    shape: 'array',
    listKey: 'platform',
    listColumns: ['platform', 'label', 'enabled'],
    fields: [
      { key: 'platform', type: 'select', label: '平台', required: true, readOnly: true, options: ['discord', 'qq', 'xiaohongshu', 'x', 'wechat'] },
      { key: 'label', type: 'text', label: '显示名', required: true },
      { key: 'url', type: 'url', label: '链接', help: '链接为空 + 上传 QR 图 => 显示二维码弹窗' },
      { key: 'qrImage', type: 'asset', label: '二维码图片', uploadDir: 'public/social/', help: '微信等平台使用' },
      { key: 'enabled', type: 'boolean', label: '启用' },
    ],
  },
  site: {
    key: 'site',
    title: '站点信息',
    file: 'src/data/site.json',
    shape: 'object',
    fields: [
      { key: 'discordInvite', type: 'url', label: 'Discord 邀请链接', required: true },
      { key: 'communityName', type: 'text', label: '社区名（英文）', required: true, readOnly: true, help: '已锁定 — 社区品牌标识，如需修改请直接编辑仓库' },
      { key: 'communityNameZh', type: 'text', label: '社区名（中文）', required: true, readOnly: true, help: '已锁定 — 社区品牌标识' },
      { key: 'communityNameJp', type: 'text', label: '社区名（日文）', required: true, readOnly: true, help: '已锁定 — 社区品牌标识' },
    ],
  },
  about: {
    key: 'about',
    title: '关于页',
    file: 'src/data/about.json',
    shape: 'object',
    fields: [
      { key: 'mission', type: 'textarea', label: '宗旨', required: true },
      { key: 'history', type: 'textarea', label: '历史', required: true },
      { key: 'faq', type: 'array', label: '常见问题', complex: true, required: true, help: '[{"q":"...","a":"..."}]' },
      { key: 'coc', type: 'textarea', label: '行为准则', required: true },
      { key: 'joinInstructions', type: 'textarea', label: '加入说明', required: true },
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
  if (!schema) return [{ fieldKey: '__schema__', message: `未知 schema：${schemaKey}` }]
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
          errors.push({ fieldKey: field.key, message: `${field.label} 不能为空` })
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
            errors.push({ fieldKey: field.key, message: `${field.label} 必须是 http(s) 链接` })
          }
        } catch {
          errors.push({ fieldKey: field.key, message: `${field.label} 不是有效链接` })
        }
        break
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} 不是有效邮箱` })
        }
        break
      case 'date':
      case 'datetime':
        if (!isParsableDate(String(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} 不是有效日期` })
        }
        break
      case 'select':
        if (Array.isArray(field.options) && !field.options.includes(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} 必须为以下之一：${field.options.join(', ')}` })
        }
        break
      case 'number':
        if (!isFiniteNumber(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} 必须是数字` })
        }
        break
      case 'boolean':
        if (typeof v !== 'boolean') {
          errors.push({ fieldKey: field.key, message: `${field.label} 必须是 true 或 false` })
        }
        break
      case 'asset':
        if (typeof v !== 'string' || v.length === 0) {
          if (field.required) errors.push({ fieldKey: field.key, message: `${field.label} 不能为空` })
        }
        break
      case 'array':
        if (field.complex && !Array.isArray(v)) {
          errors.push({ fieldKey: field.key, message: `${field.label} 必须是 JSON 数组` })
        }
        break
      case 'object':
        if (field.complex && (typeof v !== 'object' || Array.isArray(v))) {
          errors.push({ fieldKey: field.key, message: `${field.label} 必须是 JSON 对象` })
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
      errors.push({ fieldKey: schema.listKey, message: `${schema.listKey} 重复：${id}` })
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
