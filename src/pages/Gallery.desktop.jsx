import PhotoGrid from '../components/Gallery/PhotoGrid.jsx'
import { t } from '../lib/uiLanguage.js'
import './Gallery.desktop.css'

const FILTERS = [
  { key: 'all', labelKey: 'gallery.filterAll' },
  { key: 'event', labelKey: 'gallery.filterEvents' },
  { key: 'album', labelKey: 'gallery.filterAlbums' },
]

export default function GalleryDesktop({
  groups,
  filter,
  onFilterChange,
  totalImages,
  groupCount,
  onItemClick,
  isEmpty,
}) {
  return (
    <main className="gallery-page section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.gallery')}</h1>
        <p className="section-subtitle gallery-page__subtitle">
          {t('gallery.groupMeta', { groupCount, imageCount: totalImages })}
        </p>

        {!isEmpty && (
          <div
            className="gallery-page__filters"
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
          <p className="gallery-page__empty" role="status">
            {t('gallery.empty')}
          </p>
        ) : groups.length === 0 ? (
          <p className="gallery-page__empty" role="status">
            {t('gallery.emptyFilter')}
          </p>
        ) : (
          groups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              className="gallery-group"
              aria-labelledby={`heading-${group.id}`}
            >
              <div className="gallery-group__header">
                <h2
                  className="gallery-group__title"
                  id={`heading-${group.id}`}
                >
                  {group.label}
                </h2>
                <span className="gallery-group__meta">
                  {group.items.length} {t('gallery.photoCountSuffix')}
                  {group.dateRange ? ` · ${group.dateRange}` : ''}
                </span>
              </div>
              <PhotoGrid
                items={group.items}
                onItemClick={(idx, item) => onItemClick(idx, item, group)}
                ariaLabel={group.label}
              />
            </section>
          ))
        )}
      </div>
    </main>
  )
}
