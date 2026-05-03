import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminForm from '../AdminForm/AdminForm.jsx'
import AdminTable from '../AdminTable/AdminTable.jsx'
import AdminEmptyState from '../AdminEmptyState/AdminEmptyState.jsx'
import {
  getSchema,
  validateItem,
  validateUnique,
  autoIdForItem,
} from '../../lib/adminSchemas.js'
import {
  ghGet,
  commitContentChange,
} from '../../lib/githubApi.js'
import './AdminEditor.css'

const BRANCH = 'content-updates'
const BASE = 'main'

const AUTH_EXPIRED_PATTERN = /unauthorized — token|forbidden — token/i

// Map githubApi.js English error messages to operator-visible Chinese.
// Falls back to the raw message for anything not matched.
function translateApiError(message) {
  if (typeof message !== 'string') return ''
  if (/concurrent edit detected/i.test(message)) return '内容已过期，请刷新后重试'
  if (/unauthorized — token/i.test(message)) return '登录已过期，请重新登录'
  if (/forbidden — token/i.test(message)) return 'Token 权限不足'
  const notFound = message.match(/^Not found(?::\s*(.+))?$/i)
  if (notFound) return notFound[1] ? `未找到：${notFound[1]}` : '未找到'
  if (/^Invalid request/i.test(message)) {
    return message.replace(/^Invalid request:?\s*/i, '请求无效：').replace(/请求无效：$/, '请求无效')
  }
  const server = message.match(/^GitHub server error \((\d+)\)\.?$/i)
  if (server) return `GitHub 服务器错误（${server[1]}），请稍后重试`
  if (/^GitHub error/i.test(message)) return 'GitHub 操作失败，请重试'
  return message
}

// Chinese display labels for table column headers per schema. Field keys (id,
// title, date, …) stay English in the data layer; this map provides the
// operator-visible header text.
const COLUMN_LABEL_ZH = {
  events: { id: 'ID', title: '标题', date: '日期', type: '类型' },
  members: { id: 'ID', name: '昵称', role: '身份', city: '城市' },
  news: { id: 'ID', title: '标题', date: '日期', tag: '标签' },
  posts: { id: 'ID', title: '叠加标题', datePosted: '发布日期' },
  social: { platform: '平台', label: '显示名', enabled: '启用' },
}

function isAuthExpiredError(err) {
  return !!err && typeof err.message === 'string' && AUTH_EXPIRED_PATTERN.test(err.message)
}

function emptyItem(schema) {
  const item = {}
  for (const f of schema.fields) {
    if (f.type === 'boolean') item[f.key] = false
    else if (f.type === 'array') item[f.key] = []
    else if (f.type === 'object') item[f.key] = null
    else item[f.key] = ''
  }
  return item
}

function listLabel(schema, item) {
  if (!item) return ''
  const idField = schema.listKey
  const titleField = schema.fields.find((f) => f.key === 'title' || f.key === 'name')?.key
  if (titleField && item[titleField]) return String(item[titleField])
  if (idField && item[idField]) return String(item[idField])
  return ''
}

function composeMessage(schema, action, item) {
  const label = listLabel(schema, item)
  const trim = (s) => (s.length > 60 ? s.slice(0, 57) + '…' : s)
  switch (action) {
    case 'add':
      return `chore(content): update ${schema.key}.json — add ${trim(label)}`
    case 'edit':
      return `chore(content): update ${schema.key}.json — update ${trim(label)}`
    case 'delete':
      return `chore(content): update ${schema.key}.json — remove ${trim(label)}`
    case 'edit-singleton':
      return `chore(content): update ${schema.key}.json — edit`
    default:
      return `chore(content): update ${schema.key}.json`
  }
}

function buildColumns(schema) {
  if (!Array.isArray(schema.listColumns)) return []
  const labels = COLUMN_LABEL_ZH[schema.key] ?? {}
  return schema.listColumns.map((key) => ({
    key,
    label: labels[key] ?? key,
  }))
}

export default function AdminEditor({
  schemaKey,
  token,
  onSavedPR,
  onAuthExpired,
  onSaveStatus,
}) {
  const schema = useMemo(() => getSchema(schemaKey), [schemaKey])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(null) // index in array OR object for singletons
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [conflict, setConflict] = useState(false)

  const emit = useCallback((update) => {
    onSaveStatus?.(update)
  }, [onSaveStatus])

  const load = useCallback(async () => {
    if (!schema) return
    setLoading(true)
    setLoadError(null)
    try {
      const r = await ghGet(token, schema.file, BRANCH).catch(async (e) => {
        // Branch might not exist yet — fall back to base
        if (/not found/i.test(e.message)) {
          return await ghGet(token, schema.file, BASE)
        }
        throw e
      })
      setData(r.content)
    } catch (e) {
      if (isAuthExpiredError(e)) {
        setLoading(false)
        onAuthExpired?.()
        return
      }
      setLoadError(translateApiError(e.message))
    } finally {
      setLoading(false)
    }
  }, [token, schema, onAuthExpired])

  useEffect(() => {
    if (!schema || !token) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) load()
    })
    return () => { cancelled = true }
  }, [schema, token, load])

  const errors = useMemo(() => {
    if (!draft) return []
    const list = validateItem(schemaKey, draft)
    return list
  }, [draft, schemaKey])

  if (!schema) return <p className="admin-editor-error">未知 schema：{schemaKey}</p>
  if (loading) return <p className="admin-editor-loading">加载中…</p>
  if (loadError) {
    return (
      <div className="admin-editor-error" role="alert">
        加载 {schema.file} 失败：{loadError}
        <button type="button" className="admin-editor-btn" onClick={load}>重试</button>
      </div>
    )
  }

  // ── Singleton (object) shape ───────────────────────────────────────────
  if (schema.shape === 'object') {
    const current = draft ?? data
    return (
      <section className="admin-editor">
        <header className="admin-editor-header">
          <h2>{schema.title}</h2>
        </header>
        {saveError && <p className="admin-editor-error" role="alert">{saveError}</p>}
        <AdminForm
          schema={schema}
          item={current ?? {}}
          onChange={setDraft}
          errors={errors}
          token={token}
          branch={BRANCH}
          onAuthExpired={onAuthExpired}
        />
        <div className="admin-editor-actions">
          <button
            type="button"
            className="admin-editor-btn primary"
            disabled={saving || errors.length > 0 || !draft}
            onClick={async () => {
              setSaving(true)
              setSaveError(null)
              setConflict(false)
              emit({ status: 'saving' })
              try {
                const merged = { ...(data ?? {}), ...(draft ?? {}) }
                const message = composeMessage(schema, 'edit-singleton', merged)
                const r = await commitContentChange(token, schemaKey, schema.file, merged, message, { branch: BRANCH, base: BASE })
                setData(merged)
                setDraft(null)
                emit({ status: 'saved', prNumber: r.pr.number, prUrl: r.pr.htmlUrl })
                onSavedPR?.(r.pr)
              } catch (e) {
                if (isAuthExpiredError(e)) {
                  setSaving(false)
                  onAuthExpired?.()
                  return
                }
                if (/concurrent edit/i.test(e.message)) setConflict(true)
                const zhMsg = translateApiError(e.message)
                setSaveError(zhMsg)
                emit({ status: 'error', errorMessage: zhMsg })
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? '保存中…' : '保存（提交 PR）'}
          </button>
          {draft && (
            <button type="button" className="admin-editor-btn" onClick={() => setDraft(null)} disabled={saving}>
              重置
            </button>
          )}
        </div>
        {conflict && <ConflictDialog onDiscard={() => { setConflict(false); setDraft(null); load() }} onCancel={() => setConflict(false)} />}
      </section>
    )
  }

  // ── Collection (array) shape ───────────────────────────────────────────
  const items = Array.isArray(data) ? data : []
  const sorted = schema.sortFn ? schema.sortFn(items) : items

  if (editing != null && draft != null) {
    return (
      <section className="admin-editor">
        <header className="admin-editor-header">
          <button type="button" className="admin-editor-back" onClick={() => { setEditing(null); setDraft(null); setSaveError(null) }}>← 返回 {schema.title}</button>
          <h2>{editing === 'new' ? `新建${schema.title}` : `编辑${schema.title}`}</h2>
        </header>
        {saveError && <p className="admin-editor-error" role="alert">{saveError}</p>}
        <AdminForm
          schema={schema}
          item={draft}
          onChange={setDraft}
          errors={errors}
          token={token}
          branch={BRANCH}
          onAuthExpired={onAuthExpired}
        />
        <div className="admin-editor-actions">
          <button
            type="button"
            className="admin-editor-btn primary"
            disabled={saving || errors.length > 0}
            onClick={async () => {
              setSaving(true)
              setSaveError(null)
              setConflict(false)
              emit({ status: 'saving' })
              try {
                const finalItem = { ...draft, [schema.listKey]: autoIdForItem(schemaKey, draft) }
                const isNew = editing === 'new'
                const nextItems = isNew
                  ? [...items, finalItem]
                  : items.map((it) => (it[schema.listKey] === draft[schema.listKey] || it[schema.listKey] === editing) ? finalItem : it)
                const dupErrors = validateUnique(schemaKey, nextItems)
                if (dupErrors.length > 0) {
                  setSaveError(dupErrors[0].message)
                  setSaving(false)
                  emit({ status: 'error', errorMessage: dupErrors[0].message })
                  return
                }
                const message = composeMessage(schema, isNew ? 'add' : 'edit', finalItem)
                const r = await commitContentChange(token, schemaKey, schema.file, nextItems, message, { branch: BRANCH, base: BASE })
                setData(nextItems)
                setEditing(null)
                setDraft(null)
                emit({ status: 'saved', prNumber: r.pr.number, prUrl: r.pr.htmlUrl })
                onSavedPR?.(r.pr)
              } catch (e) {
                if (isAuthExpiredError(e)) {
                  setSaving(false)
                  onAuthExpired?.()
                  return
                }
                if (/concurrent edit/i.test(e.message)) setConflict(true)
                const zhMsg = translateApiError(e.message)
                setSaveError(zhMsg)
                emit({ status: 'error', errorMessage: zhMsg })
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? '保存中…' : '保存（提交 PR）'}
          </button>
          <button
            type="button"
            className="admin-editor-btn"
            onClick={() => { setEditing(null); setDraft(null); setSaveError(null) }}
            disabled={saving}
          >
            取消
          </button>
        </div>
        {conflict && <ConflictDialog onDiscard={() => { setConflict(false); setEditing(null); setDraft(null); load() }} onCancel={() => setConflict(false)} />}
      </section>
    )
  }

  // List view
  const isLockedSocial = schemaKey === 'social'

  async function handleDelete(item) {
    if (!window.confirm(`删除「${listLabel(schema, item)}」？此操作无法撤销。`)) return
    setSaving(true)
    setSaveError(null)
    emit({ status: 'saving' })
    try {
      const next = items.filter((it) => it[schema.listKey] !== item[schema.listKey])
      const message = composeMessage(schema, 'delete', item)
      const r = await commitContentChange(token, schemaKey, schema.file, next, message, { branch: BRANCH, base: BASE })
      setData(next)
      emit({ status: 'saved', prNumber: r.pr.number, prUrl: r.pr.htmlUrl })
      onSavedPR?.(r.pr)
    } catch (e) {
      if (isAuthExpiredError(e)) {
        setSaving(false)
        onAuthExpired?.()
        return
      }
      const zhMsg = translateApiError(e.message)
      setSaveError(zhMsg)
      emit({ status: 'error', errorMessage: zhMsg })
    } finally {
      setSaving(false)
    }
  }

  function startNew() {
    setEditing('new')
    setDraft(emptyItem(schema))
  }

  const columns = buildColumns(schema)
  const itemCount = sorted.length

  const emptyState = (
    <AdminEmptyState
      schemaKey={schemaKey}
      title={`还没有${schema.title}`}
      hint="点击上方按钮创建第一条记录"
      cta={isLockedSocial ? null : { label: `+ 新建${schema.title}`, onClick: startNew }}
    />
  )

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <h2>
          {schema.title}
          <span className="admin-editor-count">{itemCount} 条</span>
        </h2>
        {!isLockedSocial && (
          <button
            type="button"
            className="admin-editor-btn primary"
            disabled={saving}
            onClick={startNew}
          >
            + 新建{schema.title}
          </button>
        )}
      </header>
      {saveError && <p className="admin-editor-error" role="alert">{saveError}</p>}
      <AdminTable
        columns={columns}
        rows={sorted}
        idKey={schema.listKey}
        onEdit={(item) => { setEditing(item[schema.listKey]); setDraft({ ...item }) }}
        onDelete={isLockedSocial ? null : handleDelete}
        busy={saving}
        emptyState={emptyState}
        caption={schema.title}
      />
    </section>
  )
}

function ConflictDialog({ onDiscard, onCancel }) {
  return (
    <div className="admin-editor-conflict" role="alertdialog" aria-labelledby="conflict-title">
      <div className="admin-editor-conflict-box">
        <h3 id="conflict-title">⚠ 内容已过期</h3>
        <p>GitHub 上的数据自你加载以来已被修改。当前更改尚未保存。</p>
        <div className="admin-editor-actions">
          <button type="button" className="admin-editor-btn primary" onClick={onDiscard}>放弃并刷新</button>
          <button type="button" className="admin-editor-btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
