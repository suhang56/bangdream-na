/**
 * D1-backed admin schema registry. Replaces the file-based schema (events/news/etc)
 * for R4 admin CRUD via the Worker API.
 *
 * Each schema describes:
 *  - key: stable internal identifier (matches the URL fragment / table)
 *  - title: zh display label
 *  - titleEn: en display label
 *  - listColumns: which fields appear in the list table
 *  - fields: array of { key, type, label, labelEn, required?, ... }
 *  - mapRowToForm(row) → form-friendly object (e.g. published_at→ISO string)
 *  - mapFormToCreate(form) / mapFormToUpdate(form) → request body for Worker
 */

import { generateSlug } from './slugify.js'

const NEWS_CATEGORIES = ['announcement', 'event', 'community', 'release', 'update']
const EVENT_SCOPES = ['upcoming', 'past']
export const MEMBER_ROLES = ['organizer', 'member', 'alumnus', 'cover-band-lead']

function toUnixSeconds(input) {
  if (input == null || input === '') return null
  if (typeof input === 'number') return Math.floor(input)
  const t = Date.parse(input)
  if (!Number.isFinite(t)) return null
  return Math.floor(t / 1000)
}

function fromUnixSeconds(sec) {
  if (sec == null) return ''
  const ms = sec * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function emptyToNull(v) {
  if (v == null) return null
  if (typeof v === 'string' && v.trim() === '') return null
  return v
}

const ROLE_LABELS_ZH = {
  organizer: '组织者',
  member: '成员',
  alumnus: '校友',
  'cover-band-lead': '翻唱乐队主理',
}

function roleDisplayLabel(role) {
  return ROLE_LABELS_ZH[role] ?? role
}

export const d1Schemas = {
  news: {
    key: 'news',
    title: '资讯',
    titleEn: 'News',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'title_zh', label: '标题', labelEn: 'Title' },
      { key: 'category', label: '分类', labelEn: 'Category' },
      { key: 'published_at_display', label: '发布时间', labelEn: 'Published' },
      { key: 'draft_display', label: '草稿', labelEn: 'Draft' },
    ],
    fields: [
      { key: 'slug', type: 'text', label: '别名 (Slug)', labelEn: 'Slug', help: '留空则根据中文标题自动生成', helpEn: 'Auto-generated from title if empty' },
      { key: 'title_zh', type: 'text', label: '中文标题', labelEn: 'Title (zh)', required: true },
      { key: 'title_en', type: 'text', label: '英文标题', labelEn: 'Title (en)' },
      { key: 'body_md', type: 'textarea', label: '正文 (Markdown)', labelEn: 'Body (Markdown)', required: true, rows: 10 },
      { key: 'category', type: 'select', label: '分类', labelEn: 'Category', required: true, options: NEWS_CATEGORIES },
      { key: 'hero_image_url', type: 'asset', label: '主图', labelEn: 'Hero Image', uploadKind: 'news' },
      { key: 'tags_csv', type: 'text', label: '标签 (逗号分隔)', labelEn: 'Tags (comma-separated)' },
      { key: 'published_at', type: 'datetime', label: '发布时间', labelEn: 'Published at', required: true },
      { key: 'draft', type: 'boolean', label: '草稿', labelEn: 'Draft' },
    ],
    mapRowToForm(row) {
      const tags = Array.isArray(row.tags) ? row.tags : []
      return {
        id: row.id,
        slug: row.slug ?? '',
        title_zh: row.title_zh ?? '',
        title_en: row.title_en ?? '',
        body_md: row.body_md ?? '',
        category: row.category ?? NEWS_CATEGORIES[0],
        hero_image_url: row.hero_image_url ?? '',
        tags_csv: tags.join(', '),
        published_at: fromUnixSeconds(row.published_at),
        published_at_display: fromUnixSeconds(row.published_at).slice(0, 16).replace('T', ' '),
        draft: row.draft === 1 || row.draft === true,
        draft_display: row.draft === 1 || row.draft === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      const tags = parseCsv(form.tags_csv)
      const slug = form.slug && form.slug.trim() !== '' ? form.slug.trim() : generateSlug(form.title_zh ?? '')
      return {
        slug,
        title_zh: form.title_zh,
        title_en: emptyToNull(form.title_en),
        body_md: form.body_md,
        category: form.category,
        hero_image_url: emptyToNull(form.hero_image_url),
        tags,
        published_at: toUnixSeconds(form.published_at),
        draft: !!form.draft,
      }
    },
    mapFormToUpdate(form) {
      // PUT supports partial; send everything for simplicity
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      const nowIso = new Date().toISOString()
      return {
        slug: '',
        title_zh: '',
        title_en: '',
        body_md: '',
        category: NEWS_CATEGORIES[0],
        hero_image_url: '',
        tags_csv: '',
        published_at: nowIso,
        draft: false,
      }
    },
  },

  events: {
    key: 'events',
    title: '活动',
    titleEn: 'Events',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'title_zh', label: '标题', labelEn: 'Title' },
      { key: 'start_at_display', label: '开始时间', labelEn: 'Starts' },
      { key: 'city', label: '城市', labelEn: 'City' },
      { key: 'scope', label: '阶段', labelEn: 'Scope' },
    ],
    fields: [
      { key: 'slug', type: 'text', label: '别名 (Slug)', labelEn: 'Slug', help: '留空则根据中文标题自动生成', helpEn: 'Auto-generated from title if empty' },
      { key: 'title_zh', type: 'text', label: '中文标题', labelEn: 'Title (zh)', required: true },
      { key: 'title_en', type: 'text', label: '英文标题', labelEn: 'Title (en)' },
      { key: 'description_md', type: 'textarea', label: '说明 (Markdown)', labelEn: 'Description (Markdown)', rows: 8 },
      { key: 'hero_image_url', type: 'asset', label: '主图', labelEn: 'Hero Image', uploadKind: 'events' },
      { key: 'start_at', type: 'datetime', label: '开始时间', labelEn: 'Starts at', required: true },
      { key: 'end_at', type: 'datetime', label: '结束时间', labelEn: 'Ends at' },
      { key: 'venue', type: 'text', label: '场地', labelEn: 'Venue' },
      { key: 'city', type: 'text', label: '城市', labelEn: 'City' },
      { key: 'scope', type: 'select', label: '阶段', labelEn: 'Scope', options: EVENT_SCOPES, optional: true },
      { key: 'ticket_url', type: 'url', label: '购票链接', labelEn: 'Ticket URL' },
      { key: 'band_theme', type: 'text', label: '主乐队', labelEn: 'Band Theme' },
    ],
    mapRowToForm(row) {
      return {
        id: row.id,
        slug: row.slug ?? '',
        title_zh: row.title_zh ?? '',
        title_en: row.title_en ?? '',
        description_md: row.description_md ?? '',
        hero_image_url: row.hero_image_url ?? '',
        start_at: fromUnixSeconds(row.start_at),
        start_at_display: fromUnixSeconds(row.start_at).slice(0, 16).replace('T', ' '),
        end_at: fromUnixSeconds(row.end_at),
        venue: row.venue ?? '',
        city: row.city ?? '',
        scope: row.scope ?? '',
        ticket_url: row.ticket_url ?? '',
        band_theme: row.band_theme ?? '',
      }
    },
    mapFormToCreate(form) {
      const slug = form.slug && form.slug.trim() !== '' ? form.slug.trim() : generateSlug(form.title_zh ?? '')
      return {
        slug,
        title_zh: form.title_zh,
        title_en: emptyToNull(form.title_en),
        description_md: emptyToNull(form.description_md),
        hero_image_url: emptyToNull(form.hero_image_url),
        start_at: toUnixSeconds(form.start_at),
        end_at: toUnixSeconds(form.end_at),
        venue: emptyToNull(form.venue),
        city: emptyToNull(form.city),
        scope: form.scope === '' ? null : form.scope,
        ticket_url: emptyToNull(form.ticket_url),
        band_theme: emptyToNull(form.band_theme),
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      const nowIso = new Date().toISOString()
      return {
        slug: '',
        title_zh: '',
        title_en: '',
        description_md: '',
        hero_image_url: '',
        start_at: nowIso,
        end_at: '',
        venue: '',
        city: '',
        scope: 'upcoming',
        ticket_url: '',
        band_theme: '',
      }
    },
  },

  members: {
    key: 'members',
    title: '成员',
    titleEn: 'Members',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'display_name', label: '昵称', labelEn: 'Name' },
      { key: 'role_display', label: '角色', labelEn: 'Role' },
      { key: 'city', label: '城市', labelEn: 'City' },
      { key: 'oshi_band', label: '推乐队', labelEn: 'Oshi Band' },
      { key: 'expedition_member_display', label: '远征组', labelEn: 'Expedition' },
    ],
    fields: [
      { key: 'display_name', type: 'text', label: '昵称', labelEn: 'Display name', required: true },
      {
        key: 'role',
        type: 'select',
        label: '角色 (Role)',
        labelEn: 'Role',
        required: true,
        options: MEMBER_ROLES,
        help: '组织者 / 普通成员 / 校友 / 翻唱乐队主理',
        helpEn: 'Organizer / Member / Alumnus / Cover Band Lead',
      },
      { key: 'city', type: 'text', label: '城市', labelEn: 'City' },
      { key: 'oshi_character', type: 'text', label: '推角色', labelEn: 'Oshi character' },
      { key: 'oshi_band', type: 'text', label: '推乐队', labelEn: 'Oshi band' },
      { key: 'avatar_url', type: 'asset', label: '头像', labelEn: 'Avatar', uploadKind: 'members' },
      { key: 'expedition_member', type: 'boolean', label: '北美邦远征组', labelEn: 'Expedition member' },
    ],
    mapRowToForm(row) {
      const role = MEMBER_ROLES.includes(row.role) ? row.role : 'member'
      return {
        id: row.id,
        display_name: row.display_name ?? '',
        role,
        role_display: roleDisplayLabel(role),
        city: row.city ?? '',
        oshi_character: row.oshi_character ?? '',
        oshi_band: row.oshi_band ?? '',
        avatar_url: row.avatar_url ?? '',
        expedition_member: row.expedition_member === 1 || row.expedition_member === true,
        expedition_member_display:
          row.expedition_member === 1 || row.expedition_member === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      return {
        display_name: form.display_name,
        role: MEMBER_ROLES.includes(form.role) ? form.role : 'member',
        city: emptyToNull(form.city),
        oshi_character: emptyToNull(form.oshi_character),
        oshi_band: emptyToNull(form.oshi_band),
        avatar_url: emptyToNull(form.avatar_url),
        expedition_member: !!form.expedition_member,
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      return {
        display_name: '',
        role: 'member',
        city: '',
        oshi_character: '',
        oshi_band: '',
        avatar_url: '',
        expedition_member: false,
      }
    },
  },

  featuredPosts: {
    key: 'featuredPosts',
    title: '首页轮播',
    titleEn: 'Featured Posts',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'slug', label: '别名', labelEn: 'Slug' },
      { key: 'title_zh', label: '标题', labelEn: 'Title' },
      { key: 'sort_order', label: '排序', labelEn: 'Sort' },
      { key: 'active_display', label: '启用', labelEn: 'Active' },
    ],
    fields: [
      { key: 'slug', type: 'text', label: '别名 (Slug)', labelEn: 'Slug', help: '留空则根据中文标题自动生成', helpEn: 'Auto-generated from title if empty' },
      { key: 'title_zh', type: 'text', label: '中文标题', labelEn: 'Title (zh)' },
      { key: 'title_en', type: 'text', label: '英文标题', labelEn: 'Title (en)' },
      { key: 'body_md', type: 'textarea', label: '正文 (Markdown)', labelEn: 'Body (Markdown)', rows: 6 },
      { key: 'image_url', type: 'asset', label: '主图', labelEn: 'Image', uploadKind: 'news' },
      { key: 'link_url', type: 'url', label: '跳转链接', labelEn: 'Link URL' },
      { key: 'published_at', type: 'datetime', label: '发布时间', labelEn: 'Published at' },
      { key: 'sort_order', type: 'number', label: '排序权重', labelEn: 'Sort order' },
      { key: 'active', type: 'boolean', label: '启用', labelEn: 'Active' },
    ],
    mapRowToForm(row) {
      return {
        id: row.id,
        slug: row.slug ?? '',
        title_zh: row.title_zh ?? '',
        title_en: row.title_en ?? '',
        body_md: row.body_md ?? '',
        image_url: row.image_url ?? '',
        link_url: row.link_url ?? '',
        published_at: fromUnixSeconds(row.published_at),
        sort_order: row.sort_order ?? 0,
        active: row.active === 1 || row.active === true,
        active_display: row.active === 1 || row.active === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      const slug = form.slug && form.slug.trim() !== ''
        ? form.slug.trim()
        : generateSlug(form.title_zh ?? `featured-${Date.now()}`)
      return {
        slug,
        title_zh: emptyToNull(form.title_zh),
        title_en: emptyToNull(form.title_en),
        body_md: emptyToNull(form.body_md),
        image_url: emptyToNull(form.image_url),
        link_url: emptyToNull(form.link_url),
        published_at: toUnixSeconds(form.published_at),
        sort_order: typeof form.sort_order === 'number' ? form.sort_order : Number(form.sort_order ?? 0),
        active: form.active !== false,
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      return {
        slug: '',
        title_zh: '',
        title_en: '',
        body_md: '',
        image_url: '',
        link_url: '',
        published_at: '',
        sort_order: 0,
        active: true,
      }
    },
  },

  socialLinks: {
    key: 'socialLinks',
    title: '社群链接',
    titleEn: 'Social Links',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'platform', label: '平台', labelEn: 'Platform' },
      { key: 'label_zh', label: '中文显示', labelEn: 'Label (zh)' },
      { key: 'url', label: '链接', labelEn: 'URL' },
      { key: 'sort_order', label: '排序', labelEn: 'Sort' },
      { key: 'active_display', label: '启用', labelEn: 'Active' },
    ],
    fields: [
      { key: 'platform', type: 'text', label: '平台标识', labelEn: 'Platform', required: true, help: '小写英文与短横线 (discord/qq/x...)', helpEn: 'lowercase + hyphens' },
      { key: 'label_zh', type: 'text', label: '中文显示', labelEn: 'Label (zh)', required: true },
      { key: 'label_en', type: 'text', label: '英文显示', labelEn: 'Label (en)' },
      { key: 'url', type: 'url', label: '链接', labelEn: 'URL', required: true },
      { key: 'icon', type: 'url', label: '图标 URL', labelEn: 'Icon URL' },
      { key: 'sort_order', type: 'number', label: '排序权重', labelEn: 'Sort order' },
      { key: 'active', type: 'boolean', label: '启用', labelEn: 'Active' },
    ],
    mapRowToForm(row) {
      return {
        id: row.id,
        platform: row.platform ?? '',
        label_zh: row.label_zh ?? '',
        label_en: row.label_en ?? '',
        url: row.url ?? '',
        icon: row.icon ?? '',
        sort_order: row.sort_order ?? 0,
        active: row.active === 1 || row.active === true,
        active_display: row.active === 1 || row.active === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      return {
        platform: form.platform,
        label_zh: form.label_zh,
        label_en: emptyToNull(form.label_en),
        url: form.url,
        icon: emptyToNull(form.icon),
        sort_order: typeof form.sort_order === 'number' ? form.sort_order : Number(form.sort_order ?? 0),
        active: form.active !== false,
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      return {
        platform: '',
        label_zh: '',
        label_en: '',
        url: '',
        icon: '',
        sort_order: 0,
        active: true,
      }
    },
  },

  aboutSections: {
    key: 'aboutSections',
    title: '关于页章节',
    titleEn: 'About Sections',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'slug', label: '别名', labelEn: 'Slug' },
      { key: 'title_zh', label: '标题', labelEn: 'Title' },
      { key: 'sort_order', label: '排序', labelEn: 'Sort' },
      { key: 'active_display', label: '启用', labelEn: 'Active' },
    ],
    fields: [
      { key: 'slug', type: 'text', label: '别名 (Slug)', labelEn: 'Slug', required: true, help: '内置 slug:mission/faq/coc/joinInstructions; 其它为自定义', helpEn: 'Built-ins: mission/faq/coc/joinInstructions; others are custom' },
      { key: 'title_zh', type: 'text', label: '中文标题', labelEn: 'Title (zh)', required: true },
      { key: 'title_en', type: 'text', label: '英文标题', labelEn: 'Title (en)' },
      { key: 'body_md', type: 'textarea', label: '正文 (Markdown)', labelEn: 'Body (Markdown)', required: true, rows: 12, help: 'FAQ 章节请填写 JSON: [{"q":"...","a":"..."}]', helpEn: 'For FAQ section, write JSON: [{"q":"…","a":"…"}]' },
      { key: 'sort_order', type: 'number', label: '排序权重', labelEn: 'Sort order' },
      { key: 'active', type: 'boolean', label: '启用', labelEn: 'Active' },
    ],
    mapRowToForm(row) {
      return {
        id: row.id,
        slug: row.slug ?? '',
        title_zh: row.title_zh ?? '',
        title_en: row.title_en ?? '',
        body_md: row.body_md ?? '',
        sort_order: row.sort_order ?? 0,
        active: row.active === 1 || row.active === true,
        active_display: row.active === 1 || row.active === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      return {
        slug: form.slug,
        title_zh: form.title_zh,
        title_en: emptyToNull(form.title_en),
        body_md: form.body_md,
        sort_order: typeof form.sort_order === 'number' ? form.sort_order : Number(form.sort_order ?? 0),
        active: form.active !== false,
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      return {
        slug: '',
        title_zh: '',
        title_en: '',
        body_md: '',
        sort_order: 0,
        active: true,
      }
    },
  },

  categories: {
    key: 'categories',
    title: '分类',
    titleEn: 'Categories',
    listColumns: [
      { key: 'id', label: 'ID', labelEn: 'ID' },
      { key: 'slug', label: '别名', labelEn: 'Slug' },
      { key: 'display_zh', label: '中文', labelEn: 'Display (zh)' },
      { key: 'display_en', label: '英文', labelEn: 'Display (en)' },
      { key: 'sort_order', label: '排序', labelEn: 'Sort' },
      { key: 'active_display', label: '启用', labelEn: 'Active' },
    ],
    fields: [
      { key: 'slug', type: 'text', label: '别名 (Slug)', labelEn: 'Slug', required: true, help: '小写英文与短横线', helpEn: 'lowercase + hyphens' },
      { key: 'display_zh', type: 'text', label: '中文显示', labelEn: 'Display (zh)', required: true },
      { key: 'display_en', type: 'text', label: '英文显示', labelEn: 'Display (en)' },
      { key: 'accent_color', type: 'text', label: '强调色', labelEn: 'Accent color', help: '设计 token 名,例如 brand-rose', helpEn: 'design token name' },
      { key: 'sort_order', type: 'number', label: '排序权重', labelEn: 'Sort order' },
      { key: 'active', type: 'boolean', label: '启用', labelEn: 'Active' },
    ],
    mapRowToForm(row) {
      return {
        id: row.id,
        slug: row.slug ?? '',
        display_zh: row.display_zh ?? '',
        display_en: row.display_en ?? '',
        accent_color: row.accent_color ?? '',
        sort_order: row.sort_order ?? 0,
        active: row.active === 1 || row.active === true,
        active_display: row.active === 1 || row.active === true ? '是' : '否',
      }
    },
    mapFormToCreate(form) {
      return {
        slug: form.slug,
        display_zh: form.display_zh,
        display_en: emptyToNull(form.display_en),
        accent_color: emptyToNull(form.accent_color),
        sort_order: typeof form.sort_order === 'number' ? form.sort_order : Number(form.sort_order ?? 0),
        active: form.active !== false,
      }
    },
    mapFormToUpdate(form) {
      return this.mapFormToCreate(form)
    },
    emptyForm() {
      return {
        slug: '',
        display_zh: '',
        display_en: '',
        accent_color: '',
        sort_order: 0,
        active: true,
      }
    },
  },
}

export function listD1SchemaKeys() {
  return Object.keys(d1Schemas)
}

export function getD1Schema(key) {
  return d1Schemas[key]
}

export function parseCsv(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Returns first error message ([] when valid). Pure function.
 */
export function validateForm(schema, form) {
  const errors = []
  for (const field of schema.fields) {
    if (!field.required) continue
    const v = form?.[field.key]
    if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) {
      errors.push({ key: field.key, message: `${field.label} 不能为空` })
    }
  }
  return errors
}

export const __helpers = { toUnixSeconds, fromUnixSeconds, emptyToNull, parseCsv }
