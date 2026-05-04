import { useState, useRef, useId } from 'react'
import { uploadImageWithGuard, __internals as guardInternals } from '../../lib/admin/uploadImage.js'
import { generateSlug } from '../../lib/admin/slugify.js'
import './AdminAssetUploader.css'

/**
 * Drag-drop / click-to-upload tile that PUTs to the Worker /api/upload endpoint
 * (which streams to R2). On success, sets value to the absolute CDN URL.
 *
 * @param {object} props
 * @param {{ uploadKind: 'news' | 'events' | 'members', label?: string }} props.field
 * @param {string} props.value
 * @param {string} [props.slugBase] - used to compose a slug for the R2 key
 * @param {(url: string) => void} props.onChange
 * @param {() => void} [props.onAuthExpired]
 * @param {() => void} [props.onForbidden]
 */
export default function AdminAssetUploader({
  field,
  value,
  slugBase,
  onChange,
  onAuthExpired,
  onForbidden,
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)
  const inputId = useId()

  const acceptStr = guardInternals.ALLOWED_MIME.join(',')
  const maxBytes = guardInternals.MAX_BYTES
  const kind = field?.uploadKind ?? 'news'

  async function handleFile(file) {
    if (!file) return
    setLocalError(null)
    setUploading(true)
    const slug = slugBase ? generateSlug(slugBase) : undefined
    try {
      const result = await uploadImageWithGuard(file, kind, slug ? { slug } : {})
      onChange?.(result.url)
    } catch (err) {
      if (err?.code === 'unauthorized') {
        setUploading(false)
        onAuthExpired?.()
        return
      }
      if (err?.code === 'forbidden') {
        setUploading(false)
        onForbidden?.()
        return
      }
      setLocalError(err?.message ?? '上传失败')
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
          aria-label={`${field?.label ?? '资源'} URL`}
        />
      </div>

      {value && (
        <div className="admin-asset-preview">
          <img
            src={value}
            alt={field?.label ?? '预览'}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <button
        type="button"
        className={`admin-asset-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={uploading}
        aria-busy={uploading ? 'true' : 'false'}
      >
        {uploading ? (
          <span>上传中…</span>
        ) : (
          <>
            <span className="admin-asset-dropzone-icon">⬆</span>
            <span>拖拽图片至此,或点击上传</span>
            <span className="admin-asset-dropzone-hint">
              png · jpg · webp · gif · ≤{(maxBytes / 1024 / 1024).toFixed(0)}MB
            </span>
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
        <p className="admin-asset-error" role="alert" aria-live="polite">
          {localError}
        </p>
      )}
    </div>
  )
}
