import EventList from '../components/EventList/EventList.jsx'
import EventSidebar from '../components/EventSidebar/EventSidebar.jsx'
import EventCalendar from '../components/EventCalendar/EventCalendar.jsx'
import { t } from '../lib/uiLanguage.js'
import './Events.desktop.css'

export default function EventsDesktop({
  view,
  setView,
  filterState,
  onFilterChange,
  availableBands,
  visible,
  groups,
  now,
}) {
  return (
    <main className="events-desktop section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.events')}</h1>
        <div className="events-desktop__view-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={
              'events-desktop__view-btn' +
              (view === 'list' ? ' events-desktop__view-btn--active' : '')
            }
            onClick={() => setView('list')}
          >
            {t('btn.viewList')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'calendar'}
            className={
              'events-desktop__view-btn' +
              (view === 'calendar' ? ' events-desktop__view-btn--active' : '')
            }
            onClick={() => setView('calendar')}
          >
            {t('btn.viewCalendar')}
          </button>
        </div>
        <p
          className="events-desktop__count"
          role="status"
          aria-live="polite"
        >
          {t('filter.resultCount', {
            N: groups.upcoming.length,
            M: groups.past.length,
          })}
        </p>
        <div className="events-desktop__layout">
          <EventSidebar
            filterState={filterState}
            onChange={onFilterChange}
            availableBands={availableBands}
          />
          <div className="events-desktop__content">
            {view === 'calendar' ? (
              <EventCalendar events={visible} now={now} />
            ) : (
              <EventList events={visible} now={now} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
