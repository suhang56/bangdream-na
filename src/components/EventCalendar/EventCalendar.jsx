import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  buildMonthGrid,
  eventsForDay,
  nextMonth,
  prevMonth,
} from '../../lib/calendar.js'
import { formatDate } from '../../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import EventCard from '../EventCard/EventCard.jsx'
import './EventCalendar.css'

const DOT_LIMIT = 4
const MS_PER_DAY = 86_400_000

const TYPE_DOT_CLASS = {
  concert: 'event-calendar__dot--concert',
  fanmeet: 'event-calendar__dot--fanmeet',
  con: 'event-calendar__dot--con',
  online: 'event-calendar__dot--online',
}

const WEEKDAY_KEYS = [
  'calendar.weekdaySun',
  'calendar.weekdayMon',
  'calendar.weekdayTue',
  'calendar.weekdayWed',
  'calendar.weekdayThu',
  'calendar.weekdayFri',
  'calendar.weekdaySat',
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function isoOf(d) {
  return (
    d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
  )
}

function ymdToParts(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]) - 1,
    day: Number(m[3]),
  }
}

function shiftDays(ymd, deltaDays) {
  const p = ymdToParts(ymd)
  if (!p) return ymd
  const ts = Date.UTC(p.year, p.month, p.day) + deltaDays * MS_PER_DAY
  return isoOf(new Date(ts))
}

function shiftMonths(ymd, deltaMonths) {
  const p = ymdToParts(ymd)
  if (!p) return ymd
  const target = new Date(Date.UTC(p.year, p.month + deltaMonths, 1))
  // clamp day to last day of target month
  const targetMonthLastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const day = Math.min(p.day, targetMonthLastDay)
  return isoOf(
    new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day)),
  )
}

function startOfWeek(ymd) {
  const p = ymdToParts(ymd)
  if (!p) return ymd
  const d = new Date(Date.UTC(p.year, p.month, p.day))
  const dow = d.getUTCDay()
  return shiftDays(ymd, -dow)
}

function endOfWeek(ymd) {
  return shiftDays(startOfWeek(ymd), 6)
}

function monthLabel(year, month, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month, 1)))
  } catch {
    return year + '-' + (month + 1)
  }
}

export default function EventCalendar({ events, now }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const stableNow = now ?? new Date()
  const [year, setYear] = useState(stableNow.getUTCFullYear())
  const [month, setMonth] = useState(stableNow.getUTCMonth())
  const [selected, setSelected] = useState(null)
  const todayYmd = isoOf(stableNow)
  const [focusedYmd, setFocusedYmd] = useState(todayYmd)
  const [pendingFocus, setPendingFocus] = useState(false)
  const gridRef = useRef(null)

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  const monthEvents = useMemo(() => {
    if (!Array.isArray(events)) return []
    const startMs = Date.UTC(year, month, 1)
    const endMs = Date.UTC(year, month + 1, 0, 23, 59, 59)
    return events.filter((e) => {
      if (!e || typeof e.date !== 'string') return false
      const ts = Date.parse(e.date)
      if (Number.isNaN(ts)) return false
      const endTs = e.endDate ? Date.parse(e.endDate) : ts
      return ts <= endMs && (Number.isNaN(endTs) ? ts : endTs) >= startMs
    })
  }, [events, year, month])

  function go(direction) {
    const fn = direction > 0 ? nextMonth : prevMonth
    const out = fn(year, month)
    setYear(out.year)
    setMonth(out.month)
    setSelected(null)
  }

  // Move focus into a roving day cell after focus state changes via keyboard
  useEffect(() => {
    if (!pendingFocus) return
    if (!gridRef.current) return
    const el = gridRef.current.querySelector(
      '[data-ymd="' + focusedYmd + '"]',
    )
    if (el && typeof el.focus === 'function') el.focus()
    setPendingFocus(false)
  }, [pendingFocus, focusedYmd])

  function focusYmd(nextYmd) {
    const p = ymdToParts(nextYmd)
    if (!p) return
    setFocusedYmd(nextYmd)
    if (p.year !== year || p.month !== month) {
      setYear(p.year)
      setMonth(p.month)
    }
    setPendingFocus(true)
  }

  function onGridKeyDown(e) {
    const key = e.key
    let nextYmd = null
    let consumed = true
    if (key === 'ArrowLeft') nextYmd = shiftDays(focusedYmd, -1)
    else if (key === 'ArrowRight') nextYmd = shiftDays(focusedYmd, 1)
    else if (key === 'ArrowUp') nextYmd = shiftDays(focusedYmd, -7)
    else if (key === 'ArrowDown') nextYmd = shiftDays(focusedYmd, 7)
    else if (key === 'Home') nextYmd = startOfWeek(focusedYmd)
    else if (key === 'End') nextYmd = endOfWeek(focusedYmd)
    else if (key === 'PageUp') nextYmd = shiftMonths(focusedYmd, -1)
    else if (key === 'PageDown') nextYmd = shiftMonths(focusedYmd, 1)
    else if (key === 'Enter' || key === ' ') {
      e.preventDefault()
      setSelected(focusedYmd === selected ? null : focusedYmd)
      return
    } else {
      consumed = false
    }
    if (consumed && nextYmd) {
      e.preventDefault()
      focusYmd(nextYmd)
    }
  }

  const selectedEvents = selected ? eventsForDay(events, selected) : []
  const monthLabelText = monthLabel(year, month, lang)
  const noEventsThisMonth = monthEvents.length === 0

  return (
    <div className="event-calendar">
      <div className="event-calendar__header">
        <button
          type="button"
          className="event-calendar__nav"
          aria-label={t('btn.prevMonth')}
          onClick={() => go(-1)}
        >
          ‹
        </button>
        <h2 className="event-calendar__month">{monthLabelText}</h2>
        <button
          type="button"
          className="event-calendar__nav"
          aria-label={t('btn.nextMonth')}
          onClick={() => go(1)}
        >
          ›
        </button>
      </div>
      {noEventsThisMonth ? (
        <p className="event-calendar__empty">{t('empty.calendarEmptyMonth')}</p>
      ) : null}
      <div
        ref={gridRef}
        className="event-calendar__grid"
        role="grid"
        aria-label={monthLabelText}
        onKeyDown={onGridKeyDown}
      >
        {WEEKDAY_KEYS.map((k) => (
          <div key={k} className="event-calendar__weekday" role="columnheader">
            {t(k)}
          </div>
        ))}
        {cells.map((cell) => {
          const dayEvents = eventsForDay(events, cell.ymd)
          const isToday = cell.ymd === todayYmd
          const isSelected = cell.ymd === selected
          const isFocused = cell.ymd === focusedYmd
          const cls =
            'event-calendar__cell' +
            (cell.isOffMonth ? ' event-calendar__cell--off' : '') +
            (isToday ? ' event-calendar__cell--today' : '') +
            (isSelected ? ' event-calendar__cell--selected' : '')
          return (
            <button
              key={cell.ymd}
              type="button"
              className={cls}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={cell.ymd + (dayEvents.length > 0 ? ', ' + dayEvents.length + ' events' : '')}
              data-ymd={cell.ymd}
              tabIndex={isFocused ? 0 : -1}
              onClick={() => {
                setFocusedYmd(cell.ymd)
                setSelected(isSelected ? null : cell.ymd)
              }}
              onFocus={() => setFocusedYmd(cell.ymd)}
            >
              <span className="event-calendar__day">
                {cell.date.getUTCDate()}
              </span>
              {dayEvents.length > 0 ? (
                <span className="event-calendar__dots" aria-hidden="true">
                  {dayEvents.slice(0, DOT_LIMIT).map((e, i) => (
                    <span
                      key={(e.id ?? '') + i}
                      className={
                        'event-calendar__dot ' +
                        (TYPE_DOT_CLASS[e.type] || 'event-calendar__dot--default')
                      }
                    />
                  ))}
                  {dayEvents.length > DOT_LIMIT ? (
                    <span className="event-calendar__more">
                      +{dayEvents.length - DOT_LIMIT}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {selected && selectedEvents.length > 0 ? (
        <div className="event-calendar__expansion">
          <h3 className="event-calendar__expansion-heading">
            Events on {formatDate(selected)}
          </h3>
          <ul className="event-calendar__expansion-list">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <EventCard event={e} now={stableNow} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
