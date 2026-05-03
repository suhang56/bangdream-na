import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminForm from '../AdminForm/AdminForm.jsx'
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

export default function AdminEditor({ schemaKey, token, onSavedPR }) {
  const schema = useMemo(() => getSchema(schemaKey), [schemaKey])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(null) // index in array OR object for singletons
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

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
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, schema])

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

  if (!schema) return <p className="admin-editor-error">Unknown schema: {schemaKey}</p>
  if (loading) return <p className="admin-editor-loading">Loading…</p>
  if (loadError) {
    return (
      <div className="admin-editor-error" role="alert">
        Failed to load {schema.file}: {loadError}
        <button type="button" className="admin-editor-btn" onClick={load}>Retry</button>
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
        {successMsg && (
          <p className="admin-editor-success" role="status" aria-live="polite">
            {successMsg.text}{' '}
            <a href={successMsg.url} target="_blank" rel="noopener noreferrer">View on GitHub →</a>
          </p>
        )}
        <AdminForm
          schema={schema}
          item={current ?? {}}
          onChange={setDraft}
          errors={errors}
          token={token}
          branch={BRANCH}
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
              try {
                const merged = { ...(data ?? {}), ...(draft ?? {}) }
                const message = composeMessage(schema, 'edit-singleton', merged)
                const r = await commitContentChange(token, schemaKey, schema.file, merged, message, { branch: BRANCH, base: BASE })
                setData(merged)
                setDraft(null)
                setSuccessMsg({ text: `Saved → PR #${r.pr.number} open.`, url: r.pr.htmlUrl })
                onSavedPR?.(r.pr)
              } catch (e) {
                if (/concurrent edit/i.test(e.message)) setConflict(true)
                setSaveError(e.message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save (commit + PR)'}
          </button>
          {draft && (
            <button type="button" className="admin-editor-btn" onClick={() => setDraft(null)} disabled={saving}>
              Reset
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
          <button type="button" className="admin-editor-back" onClick={() => { setEditing(null); setDraft(null); setSaveError(null) }}>← Back to {schema.title}</button>
          <h2>{editing === 'new' ? `New ${schema.key.replace(/s$/, '')}` : `Edit ${schema.key.replace(/s$/, '')}`}</h2>
        </header>
        {saveError && <p className="admin-editor-error" role="alert">{saveError}</p>}
        <AdminForm
          schema={schema}
          item={draft}
          onChange={setDraft}
          errors={errors}
          token={token}
          branch={BRANCH}
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
                  return
                }
                const message = composeMessage(schema, isNew ? 'add' : 'edit', finalItem)
                const r = await commitContentChange(token, schemaKey, schema.file, nextItems, message, { branch: BRANCH, base: BASE })
                setData(nextItems)
                setEditing(null)
                setDraft(null)
                setSuccessMsg({ text: `Saved → PR #${r.pr.number} open.`, url: r.pr.htmlUrl })
                onSavedPR?.(r.pr)
              } catch (e) {
                if (/concurrent edit/i.test(e.message)) setConflict(true)
                setSaveError(e.message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save (commit + PR)'}
          </button>
          <button
            type="button"
            className="admin-editor-btn"
            onClick={() => { setEditing(null); setDraft(null); setSaveError(null) }}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
        {conflict && <ConflictDialog onDiscard={() => { setConflict(false); setEditing(null); setDraft(null); load() }} onCancel={() => setConflict(false)} />}
      </section>
    )
  }

  // List view
  const isLockedSocial = schemaKey === 'social'

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${listLabel(schema, item)}"?`)) return
    setSaving(true)
    setSaveError(null)
    try {
      const next = items.filter((it) => it[schema.listKey] !== item[schema.listKey])
      const message = composeMessage(schema, 'delete', item)
      const r = await commitContentChange(token, schemaKey, schema.file, next, message, { branch: BRANCH, base: BASE })
      setData(next)
      setSuccessMsg({ text: `Saved → PR #${r.pr.number} open.`, url: r.pr.htmlUrl })
      onSavedPR?.(r.pr)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <h2>{schema.title}</h2>
        {!isLockedSocial && (
          <button
            type="button"
            className="admin-editor-btn primary"
            disabled={saving}
            onClick={() => { setEditing('new'); setDraft(emptyItem(schema)) }}
          >
            + Add new
          </button>
        )}
      </header>
      {saveError && <p className="admin-editor-error" role="alert">{saveError}</p>}
      {successMsg && (
        <p className="admin-editor-success" role="status" aria-live="polite">
          {successMsg.text}{' '}
          <a href={successMsg.url} target="_blank" rel="noopener noreferrer">View on GitHub →</a>
        </p>
      )}
      {sorted.length === 0 ? (
        <p className="admin-editor-empty">No {schema.title.toLowerCase()} yet.</p>
      ) : (
        <table className="admin-editor-table">
          <thead>
            <tr>
              {schema.listColumns?.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item[schema.listKey]}>
                {schema.listColumns?.map((col) => (
                  <td key={col}>{formatCell(item[col])}</td>
                ))}
                <td className="admin-editor-row-actions">
                  <button
                    type="button"
                    className="admin-editor-btn small"
                    onClick={() => { setEditing(item[schema.listKey]); setDraft({ ...item }) }}
                    disabled={saving}
                  >
                    Edit
                  </button>
                  {!isLockedSocial && (
                    <button
                      type="button"
                      className="admin-editor-btn small danger"
                      onClick={() => handleDelete(item)}
                      disabled={saving}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function formatCell(v) {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? '✓' : '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

function ConflictDialog({ onDiscard, onCancel }) {
  return (
    <div className="admin-editor-conflict" role="alertdialog" aria-labelledby="conflict-title">
      <div className="admin-editor-conflict-box">
        <h3 id="conflict-title">⚠ Out of date</h3>
        <p>The data on GitHub changed since you loaded this page. Your changes have NOT been saved.</p>
        <div className="admin-editor-actions">
          <button type="button" className="admin-editor-btn primary" onClick={onDiscard}>Discard &amp; Refresh</button>
          <button type="button" className="admin-editor-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
