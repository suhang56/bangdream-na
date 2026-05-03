import { useState, useRef, useId } from 'react'
import { uploadAsset } from '../../lib/githubApi.js'
import { slugify, __defaults } from '../../lib/adminSchemas.js'
import './AdminAssetUploader.css'

function extFromFilename(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(name || '')
  if (!m) return ''
  return m[1].toLowerCase().replace('jpeg', 'jpg')
}

function deriveSlug({ slugBase, file }) {
  const base = slugify(slugBase ?? '')
  if (base) return base
  return slugify(file.name.replace(/\.[^.]+$/, ''))
}

const AUTH_EXPIRED_PATTERN = /unauthorized — token|forbidden — token/i

export default function AdminAssetUploader({
  field,
  value,
  token,
  branch = 'content-updates',
  slugBase,
  qrSuffix = false,
  onChange,
  onError,
  onAuthExpired,
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)
  const inputId = useId()

  const acceptedMime = field?.acceptedMimeTypes ?? __defaults.assetMime
  const maxBytes = field?.maxBytes ?? __defaults.assetMaxBytes
  const acceptStr = acceptedMime.join(',')

  async function handleFile(file) {
    if (!file) return
    setLocalError(null)
    if (file.size > maxBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      setLocalError(`File too large (${mb} MB). Max ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`)
      return
    }
    if (!acceptedMime.includes(file.type)) {
      setLocalError('Unsupported file type. Allowed: png, jpg, webp, svg.')
      return
    }
    const ext = extFromFilename(file.name) || 'png'
    let slug = deriveSlug({ slugBase, file })
    if (!slug) slug = `pending-${Date.now().toString(36)}`
    if (qrSuffix) slug = `${slug}-qr`
    const repoPath = `${field.uploadDir}${slug}.${ext}`
    setUploading(true)
    try {
      await uploadAsset(token, repoPath, file, `chore(asset): upload ${slug}.${ext}`, branch)
      const sitePath = '/' + repoPath.replace(/^public\//, '')
      onChange?.(sitePath)
    } catch (e) {
      if (typeof e?.message === 'string' && AUTH_EXPIRED_PATTERN.test(e.message)) {
        setUploading(false)
        onAuthExpired?.()
        return
      }
      onError?.(e.message)
      setLocalError(e.message)
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function onDragLeave() {
    setDragOver(false)
  }

  function onPick(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="admin-asset-uploader">
      <div className="admin-asset-path">
        <input
          type="text"
          readOnly
          className="admin-asset-path-input"
          value={value ?? ''}
          aria-label={`${field?.label ?? 'Asset'} path`}
        />
      </div>

      {value && (
        <div className="admin-asset-preview">
          <img src={value} alt={field?.label ?? 'Preview'} onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
      )}

      <button
        type="button"
        className={`admin-asset-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={uploading || !token}
        aria-busy={uploading ? 'true' : 'false'}
      >
        {uploading ? (
          <span>Uploading…</span>
        ) : (
          <>
            <span className="admin-asset-dropzone-icon">⬆</span>
            <span>Drag image here, or click to upload</span>
            <span className="admin-asset-dropzone-hint">png · jpg · webp · svg · ≤{(maxBytes / 1024 / 1024).toFixed(0)}MB</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptStr}
        onChange={onPick}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {localError && (
        <p className="admin-asset-error" role="alert" aria-live="polite">{localError}</p>
      )}
    </div>
  )
}
