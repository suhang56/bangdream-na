import PhotoGrid from '../components/Gallery/PhotoGrid.jsx'
import { t } from '../lib/uiLanguage.js'
import './Gallery.mobile.css'

const ALL_VALUE = ''

export default function GalleryMobile({
  groups,
  groupOptions,
  selectedGroupId,
  selectedOption,
  onSelectGroup,
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
          <button
            type="button"
            className={`gallery-chip${
              selectedGroupId ? '' : ' gallery-chip--active'
            }`}
            onClick={() => onSelectGroup(null)}
          >
            {t('gallery.filter.allOption')}
          </button>
          <select
            className="gallery-page-mobile__select"
            aria-label={t('gallery.filter.dropdownAria')}
            value={selectedGroupId ?? ALL_VALUE}
            onChange={(e) => onSelectGroup(e.target.value || null)}
          >
            <option value={ALL_VALUE}>{t('gallery.filter.placeholder')}</option>
            {groupOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {`${o.label} ${t('gallery.filter.optionMeta', { count: o.count })}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedOption && (
        <div className="gallery-page-mobile__active-filter" role="status">
          <span>
            {t('gallery.filter.active', { label: selectedOption.label })}
          </span>
          <button
            type="button"
            className="gallery-page-mobile__active-filter-clear"
            aria-label={t('gallery.filter.clear')}
            onClick={() => onSelectGroup(null)}
          >
            ×
          </button>
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
              <button
                type="button"
                className="gallery-group-mobile__title-btn"
                onClick={() => onSelectGroup(group.id)}
              >
                {group.label}
              </button>
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
