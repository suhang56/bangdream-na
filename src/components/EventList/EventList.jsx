import { groupEventsByTime } from '../../lib/events.js'
import { t } from '../../lib/uiLanguage.js'
import EventCard from '../EventCard/EventCard.jsx'
import './EventList.css'

export default function EventList({ events, now }) {
  const stableNow = now ?? new Date()
  const { upcoming, past } = groupEventsByTime(events, stableNow)
  const isEmpty = upcoming.length === 0 && past.length === 0

  return (
    <div className="event-list">
      {upcoming.length > 0 && (
        <section
          className="event-list__group event-list__group--upcoming"
          aria-labelledby="upcoming-heading"
        >
          <h2 id="upcoming-heading" className="event-list__heading">
            {t('section.upcoming')}
          </h2>
          <ul className="event-list__items">
            {upcoming.map((e) => (
              <li key={e.id} className="event-list__item">
                <EventCard event={e} now={stableNow} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section
          className="event-list__group event-list__group--past"
          aria-labelledby="past-heading"
        >
          <h2 id="past-heading" className="event-list__heading">
            {t('section.past')}
          </h2>
          <ul className="event-list__items">
            {past.map((e) => (
              <li key={e.id} className="event-list__item">
                <EventCard event={e} now={stableNow} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {isEmpty && (
        <p
          className="event-list__empty"
          role="status"
          aria-live="polite"
        >
          {t('empty.noEventsMatch')}
        </p>
      )}
    </div>
  )
}
