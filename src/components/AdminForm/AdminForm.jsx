import { useId } from 'react'
import AdminJsonFallback from '../AdminJsonFallback/AdminJsonFallback.jsx'
import AdminAssetUploader from '../AdminAssetUploader/AdminAssetUploader.jsx'
import { slugify } from '../../lib/adminSchemas.js'
import './AdminForm.css'

function FieldLabel({ label, required, htmlFor }) {
  return (
    <label className="admin-form-label" htmlFor={htmlFor}>
      {label}
      {required && <span aria-hidden="true" className="admin-form-required"> *</span>}
    </label>
  )
}

function FieldHelp({ id, help, error }) {
  if (error) {
    return <p id={id} className="admin-form-error" role="alert" aria-live="polite">{error}</p>
  }
  if (help) {
    return <p id={id} className="admin-form-help">{help}</p>
  }
  return null
}

export default function AdminForm({ schema, item, onChange, errors = [], token, branch }) {
  function setField(key, val) {
    onChange?.({ ...item, [key]: val })
  }

  function findError(key) {
    const e = errors.find((x) => x.fieldKey === key)
    return e?.message ?? null
  }

  return (
    <div className="admin-form">
      {schema.fields.map((field) => (
        <FormField
          key={field.key}
          field={field}
          item={item}
          value={item?.[field.key]}
          onChange={(v) => setField(field.key, v)}
          error={findError(field.key)}
          token={token}
          branch={branch}
          schema={schema}
        />
      ))}
    </div>
  )
}

function FormField({ field, item, value, onChange, error, token, branch, schema }) {
  const id = useId()
  const helpId = useId()

  if (field.complex && (field.type === 'array' || field.type === 'object')) {
    return (
      <div className={`admin-form-row ${error ? 'has-error' : ''}`}>
        <FieldLabel label={field.label} required={field.required} htmlFor={id} />
        <AdminJsonFallback field={field} value={value} onChange={onChange} error={error ?? undefined} />
      </div>
    )
  }

  if (field.readOnly) {
    const slugBase = field.autoSlug && field.autoSlugFrom ? slugify(item?.[field.autoSlugFrom] ?? '') : ''
    const display = (typeof value === 'string' && value.length > 0) ? value : slugBase
    return (
      <div className={`admin-form-row ${error ? 'has-error' : ''}`}>
        <FieldLabel label={field.label} required={field.required} htmlFor={id} />
        <input
          id={id}
          type="text"
          className="admin-form-input readonly"
          value={display ?? ''}
          readOnly
          aria-describedby={helpId}
        />
        <FieldHelp id={helpId} help={field.help} error={error} />
      </div>
    )
  }

  const common = {
    id,
    'aria-describedby': helpId,
    'aria-invalid': error ? 'true' : 'false',
  }

  let input
  switch (field.type) {
    case 'textarea':
      input = (
        <textarea
          {...common}
          className="admin-form-textarea"
          rows={5}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'url':
      input = <input {...common} type="url" className="admin-form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'email':
      input = <input {...common} type="email" className="admin-form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'date':
      input = <input {...common} type="date" className="admin-form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'datetime': {
      // Convert ISO/full datetime back to a value the input understands.
      const localValue = isoToLocal(value)
      input = (
        <input
          {...common}
          type="datetime-local"
          className="admin-form-input"
          value={localValue}
          onChange={(e) => onChange(localToIso(e.target.value))}
        />
      )
      break
    }
    case 'select':
      input = (
        <select
          {...common}
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled hidden>Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
      break
    case 'boolean':
      input = (
        <input
          {...common}
          type="checkbox"
          className="admin-form-checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      )
      break
    case 'number':
      input = (
        <input
          {...common}
          type="number"
          className="admin-form-input"
          value={value ?? ''}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value)
            onChange(n)
          }}
        />
      )
      break
    case 'asset':
      input = (
        <AdminAssetUploader
          field={field}
          value={value ?? ''}
          token={token}
          branch={branch}
          slugBase={item?.[schema.listKey] || (item?.title ?? item?.name ?? '')}
          qrSuffix={field.key === 'qrImage'}
          onChange={onChange}
          onError={() => {}}
        />
      )
      break
    case 'text':
    default:
      input = <input {...common} type="text" className="admin-form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
  }

  return (
    <div className={`admin-form-row ${error ? 'has-error' : ''}`}>
      <FieldLabel label={field.label} required={field.required} htmlFor={id} />
      {input}
      <FieldHelp id={helpId} help={field.help} error={error} />
    </div>
  )
}

function isoToLocal(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const d = new Date(t)
  // Build local time YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToIso(local) {
  if (!local) return ''
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}
