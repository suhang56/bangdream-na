import { useSyncExternalStore } from 'react'
import { getLanguage, subscribeLanguage, t } from '../../lib/uiLanguage.js'
import './PhotoGrid.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Stateless thumbnail grid. Renders a list of <li><button> cells; the parent
 * places this inside a section/group container. Caller supplies an
 * `onItemClick(index, item)` callback that opens the lightbox.
 *
 * Accepts UI-shaped items (post-adaptGalleryRow) — `imageUrl`, `caption`, etc.
 */
export default function PhotoGrid({ items, onItemClick, ariaLabel }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!Array.isArray(items) || items.length === 0) return null
  const gridLabel =
    typeof ariaLabel === 'string' && ariaLabel.length > 0
      ? ariaLabel
      : t('gallery.gridLabel')
  return (
    <ul className="gallery-grid" role="list" aria-label={gridLabel}>
      {items.map((item, index) => {
        const caption = typeof item.caption === 'string' ? item.caption : ''
        const altText = caption
        return (
          <li key={item.id ?? index} className="gallery-thumb" role="listitem">
            <button
              type="button"
              className="gallery-thumb__btn"
              aria-label={caption || t('gallery.photoFallbackLabel', { n: index + 1 })}
              onClick={() => onItemClick?.(index, item)}
            >
              <img
                src={item.imageUrl}
                alt={altText}
                className="gallery-thumb__img"
                loading="lazy"
                decoding="async"
              />
              {caption && (
                <div className="gallery-thumb__overlay" aria-hidden="true">
                  <span className="gallery-thumb__caption">{caption}</span>
                </div>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
