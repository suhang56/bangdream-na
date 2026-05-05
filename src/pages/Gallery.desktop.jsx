import PhotoGrid from '../components/Gallery/PhotoGrid.jsx'
import { t } from '../lib/uiLanguage.js'
import './Gallery.desktop.css'

const ALL_VALUE = ''

export default function GalleryDesktop({
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
              className="gallery-page__select"
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
          <div className="gallery-page__active-filter" role="status">
            <span>
              {t('gallery.filter.active', { label: selectedOption.label })}
            </span>
            <button
              type="button"
              className="gallery-page__active-filter-clear"
              aria-label={t('gallery.filter.clear')}
              onClick={() => onSelectGroup(null)}
            >
              ×
            </button>
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
                  <button
                    type="button"
                    className="gallery-group__title-btn"
                    onClick={() => onSelectGroup(group.id)}
                  >
                    {group.label}
                  </button>
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
