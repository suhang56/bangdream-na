import './EventFilter.css'

const TYPES = [
  { type: 'concert', label: 'Concerts' },
  { type: 'fanmeet', label: 'Fan Meets' },
  { type: 'con', label: 'Conventions' },
]

export default function EventFilter({
  filterState,
  onChange,
  sortDir,
  onSortChange,
}) {
  const types = filterState?.types instanceof Set ? filterState.types : new Set()

  function toggleType(type) {
    const next = new Set(types)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange({ types: next })
  }

  function handleSort(e) {
    onSortChange(e.target.value)
  }

  return (
    <div className="event-filter">
      <fieldset className="event-filter__types">
        <legend className="visually-hidden">Filter by type</legend>
        {TYPES.map(({ type, label }) => {
          const active = types.has(type)
          return (
            <button
              key={type}
              type="button"
              className={`event-filter__chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleType(type)}
            >
              {label}
            </button>
          )
        })}
      </fieldset>

      <fieldset
        className="event-filter__sort"
        role="radiogroup"
        aria-label="Sort by date"
      >
        <legend className="visually-hidden">Sort order</legend>
        <label className="event-filter__sort-option">
          <input
            type="radio"
            name="event-sort"
            value="asc"
            checked={sortDir === 'asc'}
            onChange={handleSort}
          />
          <span>Earliest first</span>
        </label>
        <label className="event-filter__sort-option">
          <input
            type="radio"
            name="event-sort"
            value="desc"
            checked={sortDir === 'desc'}
            onChange={handleSort}
          />
          <span>Latest first</span>
        </label>
      </fieldset>
    </div>
  )
}
