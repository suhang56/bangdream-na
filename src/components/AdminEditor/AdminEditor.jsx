import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getD1Schema, validateForm } from '../../lib/admin/d1Schemas.js'
import {
  adminListNews,
  adminListEvents,
  adminListMembers,
  adminListCategories,
  createNews,
  updateNews,
  deleteNews,
  createEvent,
  updateEvent,
  deleteEvent,
  createMember,
  updateMember,
  deleteMember,
  createCategory,
  updateCategory,
  deleteCategory,
  checkSlug,
  ApiError,
} from '../../lib/api.js'
import AdminTable from '../AdminTable/AdminTable.jsx'
import AdminEmptyState from '../AdminEmptyState/AdminEmptyState.jsx'
import AdminAssetUploader from '../AdminAssetUploader/AdminAssetUploader.jsx'
import { useAutosave } from '../../lib/admin/useAutosave.js'
import { mergeTags } from '../../lib/admin/parseTags.js'
import { extractCover } from '../../lib/admin/extractCover.js'
import { generateSlug } from '../../lib/admin/slugify.js'
import { t } from '../../lib/uiLanguage.js'
import './AdminEditor.css'

const LIST_FETCHERS = {
  news: adminListNews,
  events: adminListEvents,
  members: adminListMembers,
  categories: adminListCategories,
}

const CRUD = {
  news: { create: createNews, update: updateNews, remove: deleteNews },
  events: { create: createEvent, update: updateEvent, remove: deleteEvent },
  members: { create: createMember, update: updateMember, remove: deleteMember },
  categories: {
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory,
  },
}

function translateApiError(err) {
  if (!(err instanceof ApiError)) {
    return err?.message ? String(err.message) : '未知错误'
  }
  if (err.status === 401) return '登录已过期,请重新登录'
  if (err.status === 403) return '需要管理员权限'
  if (err.status === 404) return '记录不存在,可能已被其他人删除'
  if (err.status === 409) return '别名已被使用,请换一个'
  if (err.status === 400) return '请求无效,请检查输入'
  if (err.status >= 500) return '服务器错误,请稍后重试'
  return err.message || '操作失败'
}

export default function AdminEditor({
  schemaKey,
  onAuthExpired,
  onForbidden,
  onSaveStatus,
}) {
  const schema = useMemo(() => getD1Schema(schemaKey), [schemaKey])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(null) // null | row | { __new: true }
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const cancelTokenRef = useRef(0)

  const emit = useCallback((status) => onSaveStatus?.(status), [onSaveStatus])

  const handleAuthError = useCallback(
    (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          onAuthExpired?.()
          return true
        }
        if (err.status === 403) {
          onForbidden?.()
          return true
        }
      }
      return false
    },
    [onAuthExpired, onForbidden],
  )

  const load = useCallback(async () => {
    if (!schema) return
    const fetcher = LIST_FETCHERS[schema.key]
    if (!fetcher) return
    const token = ++cancelTokenRef.current
    setLoading(true)
    setLoadError(null)
    try {
      const result = await fetcher()
      if (cancelTokenRef.current !== token) return
      const items = Array.isArray(result?.items) ? result.items : []
      setRows(items)
    } catch (err) {
      if (cancelTokenRef.current !== token) return
      if (handleAuthError(err)) return
      setLoadError(translateApiError(err))
    } finally {
      if (cancelTokenRef.current === token) setLoading(false)
    }
  }, [schema, handleAuthError])

  useEffect(() => {
    if (!schema) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) load()
    })
    return () => {
      cancelled = true
    }
  }, [schema, load])

  if (!schema) return <p className="admin-editor-error">未知 schema:{schemaKey}</p>
  if (loading) return <p className="admin-editor-loading">加载中…</p>
  if (loadError) {
    return (
      <div className="admin-editor-error" role="alert">
        加载{schema.title}失败:{loadError}
        <button type="button" className="admin-editor-btn" onClick={load}>
          重试
        </button>
      </div>
    )
  }

  // ── Edit / create view ─────────────────────────────────────────────────
  if (editing != null && draft != null) {
    const isNew = editing && editing.__new === true
    return (
      <EditView
        schema={schema}
        editing={editing}
        isNew={isNew}
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        setSaving={setSaving}
        saveError={saveError}
        setSaveError={setSaveError}
        emit={emit}
        load={load}
        handleAuthError={handleAuthError}
        onClose={() => {
          setEditing(null)
          setDraft(null)
          setSaveError(null)
        }}
      />
    )
  }

  // ── List view ──────────────────────────────────────────────────────────

  function startNew() {
    setEditing({ __new: true })
    setDraft(schema.emptyForm())
    setSaveError(null)
  }

  function startEdit(row) {
    setEditing(row)
    setDraft(schema.mapRowToForm(row))
    setSaveError(null)
  }

  async function handleDelete(row) {
    const labelGuess =
      row.title_zh ?? row.display_zh ?? row.display_name ?? row.slug ?? row.id
    if (!window.confirm(`删除「${labelGuess}」?此操作无法撤销。`)) return
    setSaving(true)
    setSaveError(null)
    emit({ status: 'saving' })
    try {
      await CRUD[schema.key].remove(row.id)
      emit({ status: 'saved', id: row.id })
      await load()
    } catch (err) {
      if (handleAuthError(err)) return
      const msg = translateApiError(err)
      setSaveError(msg)
      emit({ status: 'error', errorMessage: msg })
    } finally {
      setSaving(false)
    }
  }

  const tableRows = rows.map((row) => schema.mapRowToForm(row))

  const columns = schema.listColumns.map((c) => ({ key: c.key, label: c.label }))

  const emptyState = (
    <AdminEmptyState
      schemaKey={schema.key}
      title={`还没有${schema.title}`}
      hint="点击上方按钮创建第一条记录"
      cta={{ label: `+ 新建${schema.title}`, onClick: startNew }}
    />
  )

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <h2>
          {schema.title}
          <span className="admin-editor-count">{tableRows.length} 条</span>
        </h2>
        <button
          type="button"
          className="admin-editor-btn primary"
          disabled={saving}
          onClick={startNew}
        >
          + 新建{schema.title}
        </button>
      </header>
      {saveError && (
        <p className="admin-editor-error" role="alert">
          {saveError}
        </p>
      )}
      <AdminTable
        columns={columns}
        rows={tableRows}
        idKey="id"
        onEdit={(row) => {
          const original = rows.find((r) => r.id === row.id)
          if (original) startEdit(original)
        }}
        onDelete={(row) => {
          const original = rows.find((r) => r.id === row.id)
          if (original) handleDelete(original)
        }}
        busy={saving}
        emptyState={emptyState}
        caption={schema.title}
      />
    </section>
  )
}

/**
 * R5.5 EditView — wraps the form with autosave + slug auto-fill +
 * pre-submit slug check + tag preview + cover auto-detect.
 *
 * Schemas without `slug` / `body_md` / `tags_csv` (e.g. members, categories)
 * gracefully skip the relevant features — guards check field existence.
 */
function EditView({
  schema,
  editing,
  isNew,
  draft,
  setDraft,
  saving,
  setSaving,
  saveError,
  setSaveError,
  emit,
  load,
  handleAuthError,
  onClose,
}) {
  const errors = validateForm(schema, draft)

  // Autosave hook — debounces draft to localStorage every 1s.
  const postId = isNew ? null : editing?.id
  const {
    draft: storedDraft,
    pending: autosavePending,
    restore: restoreDraft,
    discard: discardDraft,
    clear: clearAutosave,
  } = useAutosave({ kind: schema.key, postId, formState: draft })

  // Slug auto-fill: track whether user has manually edited slug; if not,
  // auto-fill from slugify(title_zh) on every title change.
  const slugUserEditedRef = useRef(!isNew && Boolean(draft.slug))

  // Auto-fill slug when title changes and user hasn't edited slug.
  // Only relevant for kinds that have a slug field (news/events/categories).
  const hasSlugField = schema.fields.some((f) => f.key === 'slug')
  const hasTitleField = schema.fields.some((f) => f.key === 'title_zh')
  useEffect(() => {
    if (!hasSlugField || !hasTitleField) return
    if (slugUserEditedRef.current) return
    const title = draft.title_zh ?? ''
    if (!title) return
    const generated = generateSlug(title)
    if (draft.slug === generated) return
    setDraft({ ...draft, slug: generated })
    // setDraft is intentionally not in deps — using current `draft` snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title_zh, hasSlugField, hasTitleField])

  // Auto-detect cover from body — only when hero_image_url is empty and
  // body has changed.
  const hasBodyField = schema.fields.some((f) => f.key === 'body_md')
  const hasHeroField = schema.fields.some((f) => f.key === 'hero_image_url')
  const [heroAutoDetected, setHeroAutoDetected] = useState(false)
  useEffect(() => {
    if (!hasBodyField || !hasHeroField) return
    if (draft.hero_image_url) return
    const url = extractCover(draft.body_md ?? '')
    if (!url) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroAutoDetected(true)
    setDraft({ ...draft, hero_image_url: url })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.body_md, hasBodyField, hasHeroField])

  // Live tag preview (merge tags_csv + #tags from body).
  const hasTagsField = schema.fields.some((f) => f.key === 'tags_csv')
  const previewTags = useMemo(() => {
    if (!hasTagsField) return []
    return mergeTags(draft.tags_csv, draft.body_md ?? '')
  }, [draft.tags_csv, draft.body_md, hasTagsField])

  // Slug live-check (debounced) — only for news kind.
  const [slugCheck, setSlugCheck] = useState({ status: 'idle', available: null })
  const slugCheckTokenRef = useRef(0)
  useEffect(() => {
    if (schema.key !== 'news') return undefined
    if (!draft.slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlugCheck({ status: 'idle', available: null })
      return undefined
    }
    // Skip check when slug equals existing record's slug (no conflict possible)
    if (!isNew && editing?.slug === draft.slug) {
      setSlugCheck({ status: 'idle', available: true })
      return undefined
    }
    const token = ++slugCheckTokenRef.current
    setSlugCheck({ status: 'checking', available: null })
    const handle = setTimeout(async () => {
      try {
        const res = await checkSlug('news', draft.slug)
        if (slugCheckTokenRef.current !== token) return
        setSlugCheck({ status: 'done', available: res.available !== false })
      } catch (err) {
        if (slugCheckTokenRef.current !== token) return
        if (handleAuthError(err)) return
        setSlugCheck({ status: 'idle', available: null })
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [draft.slug, schema.key, isNew, editing?.slug, handleAuthError])

  const slugTaken = slugCheck.status === 'done' && slugCheck.available === false

  function handleFieldChange(key, value) {
    if (key === 'slug') slugUserEditedRef.current = true
    setDraft({ ...draft, [key]: value })
  }

  function handleRestore() {
    const value = restoreDraft()
    if (value && typeof value === 'object') {
      setDraft(value)
      // After restore, slug is whatever the draft had — treat it as user-edited
      slugUserEditedRef.current = true
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    emit({ status: 'saving' })
    try {
      const ops = CRUD[schema.key]
      let saved
      if (isNew) {
        const body = schema.mapFormToCreate(draft)
        saved = await ops.create(body)
      } else {
        const body = schema.mapFormToUpdate(draft)
        saved = await ops.update(editing.id, body)
      }
      clearAutosave()
      emit({ status: 'saved', id: saved?.id })
      onClose()
      await load()
    } catch (err) {
      if (handleAuthError(err)) return
      const msg = translateApiError(err)
      setSaveError(msg)
      emit({ status: 'error', errorMessage: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <button type="button" className="admin-editor-back" onClick={onClose}>
          ← 返回 {schema.title}
        </button>
        <h2>
          {isNew ? `新建${schema.title}` : `编辑${schema.title}`}
          <span
            className={`admin-editor-autosave${autosavePending ? ' is-saving' : ''}`}
            aria-live="polite"
          >
            {autosavePending ? t('admin.draft.saving') : t('admin.draft.savedAt')}
          </span>
        </h2>
      </header>
      {storedDraft && (
        <div className="admin-editor-draft-banner" role="status">
          <span>{t('admin.draft.restore')}</span>
          <div className="admin-editor-draft-banner-actions">
            <button
              type="button"
              className="admin-editor-btn primary"
              onClick={handleRestore}
            >
              {t('admin.draft.restoreBtn')}
            </button>
            <button
              type="button"
              className="admin-editor-btn"
              onClick={discardDraft}
            >
              {t('admin.draft.discardBtn')}
            </button>
          </div>
        </div>
      )}
      {saveError && (
        <p className="admin-editor-error" role="alert">
          {saveError}
        </p>
      )}
      <FormBody
        schema={schema}
        draft={draft}
        setDraft={setDraft}
        errors={errors}
        onFieldChange={handleFieldChange}
        slugCheck={slugCheck}
        previewTags={previewTags}
        autoDetectedCover={heroAutoDetected}
      />
      <div className="admin-editor-actions">
        <button
          type="button"
          className="admin-editor-btn primary"
          disabled={saving || errors.length > 0 || slugTaken}
          onClick={handleSave}
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          className="admin-editor-btn"
          onClick={onClose}
          disabled={saving}
        >
          取消
        </button>
      </div>
    </section>
  )
}

function FormBody({
  schema,
  draft,
  setDraft,
  errors,
  onFieldChange,
  slugCheck,
  previewTags,
  autoDetectedCover,
}) {
  function setField(key, value) {
    if (typeof onFieldChange === 'function') {
      onFieldChange(key, value)
    } else {
      setDraft({ ...draft, [key]: value })
    }
  }
  function findError(key) {
    return errors.find((e) => e.key === key)?.message ?? null
  }

  return (
    <div className="admin-form">
      {schema.fields.map((field) => (
        <FormField
          key={field.key}
          field={field}
          value={draft[field.key]}
          onChange={(v) => setField(field.key, v)}
          error={findError(field.key)}
          slugBase={draft.title_zh || draft.display_name || draft.display_zh || ''}
          slugCheck={slugCheck}
          previewTags={previewTags}
          autoDetectedCover={autoDetectedCover}
        />
      ))}
    </div>
  )
}

function FormField({ field, value, onChange, error, slugBase, slugCheck, previewTags, autoDetectedCover }) {
  const id = `field-${field.key}`
  let input
  switch (field.type) {
    case 'textarea':
      input = (
        <textarea
          id={id}
          className="admin-form-textarea"
          rows={field.rows ?? 5}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'url':
      input = (
        <input
          id={id}
          type="url"
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'number':
      input = (
        <input
          id={id}
          type="number"
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? '' : Number(v))
          }}
        />
      )
      break
    case 'datetime':
      input = (
        <input
          id={id}
          type="datetime-local"
          className="admin-form-input"
          value={isoToLocal(value)}
          onChange={(e) => onChange(localToIso(e.target.value))}
        />
      )
      break
    case 'select':
      input = (
        <select
          id={id}
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.optional && <option value="">—</option>}
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
      break
    case 'boolean':
      input = (
        <input
          id={id}
          type="checkbox"
          className="admin-form-checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      )
      break
    case 'asset':
      input = (
        <AdminAssetUploader
          field={field}
          value={value ?? ''}
          slugBase={slugBase}
          onChange={onChange}
        />
      )
      break
    case 'text':
    default:
      input = (
        <input
          id={id}
          type="text"
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
  // R5.5 hints rendered below the input
  const isSlug = field.key === 'slug'
  const isTags = field.key === 'tags_csv'
  const isHero = field.key === 'hero_image_url'
  const slugStatus = isSlug && slugCheck ? slugCheck : null
  const slugError = slugStatus && slugStatus.status === 'done' && slugStatus.available === false
  const slugChecking = slugStatus && slugStatus.status === 'checking'

  const rowClasses = [
    'admin-form-row',
    error ? 'has-error' : '',
    slugError ? 'is-slug-error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowClasses}>
      <label className="admin-form-label" htmlFor={id}>
        {field.label}
        {field.required && <span aria-hidden="true" className="admin-form-required"> *</span>}
      </label>
      {input}
      {isSlug && slugError && (
        <p className="admin-form-slug-status is-error" role="alert">
          {t('admin.slug.taken')}
        </p>
      )}
      {isSlug && !slugError && slugChecking && (
        <p className="admin-form-slug-status">{t('admin.slug.checking')}</p>
      )}
      {error ? (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      ) : field.help ? (
        <p className="admin-form-help">{field.help}</p>
      ) : null}
      {isTags && Array.isArray(previewTags) && previewTags.length > 0 && (
        <>
          <p className="admin-form-help">{t('admin.tags.parsed')}</p>
          <div className="admin-form-tag-chips" role="list">
            {previewTags.map((tag) => (
              <span key={tag} role="listitem" className="admin-form-tag-chip">
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}
      {isHero && autoDetectedCover && value && (
        <p className="admin-form-cover-detected">{t('admin.cover.detected')}</p>
      )}
    </div>
  )
}

function isoToLocal(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToIso(local) {
  if (!local) return ''
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}
