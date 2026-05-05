import { getD1Schema } from '../../lib/admin/d1Schemas.js'

const ROOT_LABEL = '后台'

const NEW_NOUN = {
  events: '活动',
  members: '成员',
  news: '资讯',
  categories: '分类',
  featuredPosts: '首页轮播',
  socialLinks: '社群链接',
  aboutSections: '关于页章节',
}

function resolveSchema(schemaKey) {
  const d1 = getD1Schema(schemaKey)
  if (d1) return { title: d1.title, shape: 'array', listKey: 'id' }
  return null
}

/**
 * Compose the breadcrumb segments for the admin top bar.
 *
 * @param {string} schemaKey - active schema key (events / members / …)
 * @param {object|null} editing - null in list view; the item or { __new: true } in edit/create view
 * @returns {Array<{ label: string }>}
 *   First segment is always 后台 (root). Later segments are not links.
 */
export function deriveBreadcrumb(schemaKey, editing) {
  const segments = [{ label: ROOT_LABEL }]
  if (typeof schemaKey !== 'string') return segments
  const schema = resolveSchema(schemaKey)
  if (!schema) return segments
  segments.push({ label: schema.title })

  if (schema.shape !== 'array') return segments
  if (editing == null) return segments

  if (editing && typeof editing === 'object' && editing.__new === true) {
    const noun = NEW_NOUN[schemaKey] ?? schema.title
    segments.push({ label: `新建${noun}` })
    return segments
  }

  if (editing && typeof editing === 'object') {
    const fallback = '编辑'
    const label =
      pickString(editing.title_zh) ??
      pickString(editing.title) ??
      pickString(editing.display_name) ??
      pickString(editing.display_zh) ??
      pickString(editing.name) ??
      (schema.listKey ? pickString(editing[schema.listKey]) : null) ??
      fallback
    segments.push({ label })
    return segments
  }

  return segments
}

function pickString(v) {
  return typeof v === 'string' && v.length > 0 ? v : null
}
