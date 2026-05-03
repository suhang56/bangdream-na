import { useMemo, useState } from 'react'
import EventFilter from '../components/EventFilter/EventFilter.jsx'
import EventList from '../components/EventList/EventList.jsx'
import { filterEvents, sortEventsByDate } from '../lib/events.js'
import events from '../data/events.json'

export default function Events() {
  const [filterState, setFilterState] = useState({ types: new Set() })
  const [sortDir, setSortDir] = useState('asc')
  const now = useMemo(() => new Date(), [])

  const visible = useMemo(
    () => sortEventsByDate(filterEvents(events, filterState), sortDir),
    [filterState, sortDir],
  )

  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Events</h1>
        <p className="section-subtitle">
          Concerts, fan meets, and conventions across North America.
        </p>
        <EventFilter
          filterState={filterState}
          onChange={setFilterState}
          sortDir={sortDir}
          onSortChange={setSortDir}
        />
        <EventList events={visible} now={now} />
      </div>
    </main>
  )
}
