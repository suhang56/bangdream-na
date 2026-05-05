import PhotoGrid from '../components/Gallery/PhotoGrid.jsx'
import { t } from '../lib/uiLanguage.js'
import './Gallery.mobile.css'

const FILTERS = [
  { key: 'all', labelKey: 'gallery.filterAll' },
  { key: 'event', labelKey: 'gallery.filterEvents' },
  { key: 'album', labelKey: 'gallery.filterAlbums' },
]

export default function GalleryMobile({
  groups,
  filter,
  onFilterChange,
  totalImages,
  groupCount,
  onItemClick,
  isEmpty,
}) {
  return (
    <main className="gallery-page-mobile">
      <header className="gallery-page-mobile__hero">
        <h1 className="gallery-page-mobile__title">{t('nav.gallery')}</h1>
        <p className="gallery-page-mobile__subtitle">
          {t('gallery.groupMeta', { groupCount, imageCount: totalImages })}
        </p>
      </header>

      {!isEmpty && (
        <div
          className="gallery-page-mobile__filters"
          role="group"
          aria-label={t('gallery.filterAria')}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`gallery-chip${
                filter === f.key ? ' gallery-chip--active' : ''
              }`}
              onClick={() => onFilterChange(f.key)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      )}

      {isEmpty ? (
        <p className="gallery-page-mobile__empty" role="status">
          {t('gallery.empty')}
        </p>
      ) : groups.length === 0 ? (
        <p className="gallery-page-mobile__empty" role="status">
          {t('gallery.emptyFilter')}
        </p>
      ) : (
        groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="gallery-group-mobile"
            aria-labelledby={`heading-${group.id}`}
          >
            <h2
              className="gallery-group-mobile__title"
              id={`heading-${group.id}`}
            >
              {group.label}
            </h2>
            <span className="gallery-group-mobile__meta">
              {group.items.length} {t('gallery.photoCountSuffix')}
              {group.dateRange ? ` · ${group.dateRange}` : ''}
            </span>
            <PhotoGrid
              items={group.items}
              onItemClick={(idx, item) => onItemClick(idx, item, group)}
              ariaLabel={group.label}
            />
          </section>
        ))
      )}
    </main>
  )
}
