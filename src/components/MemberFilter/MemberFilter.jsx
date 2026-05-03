import './MemberFilter.css'

const BAND_LABELS = {
  roselia: 'Roselia',
  popipa: "Poppin'Party",
  mygo: 'MyGO!!!!!',
  morfonica: 'Morfonica',
  afterglow: 'Afterglow',
  pastel: 'Pastel*Palettes',
  hhw: 'Hello, Happy, World!',
}

function prettyBandName(key) {
  if (typeof key !== 'string') return ''
  return BAND_LABELS[key] ?? BAND_LABELS[key.toLowerCase()] ?? key
}

const ROLE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'organizer', label: 'Organizers' },
  { value: 'member', label: 'Members' },
  { value: 'alumnus', label: 'Alumni' },
  { value: 'cover-band-lead', label: 'Cover Bands' },
]

export default function MemberFilter({
  bands,
  selectedBands,
  onBandsChange,
  selectedRole,
  onRoleChange,
  searchValue,
  onSearchChange,
}) {
  const toggleBand = (band) => {
    if (selectedBands.includes(band)) {
      onBandsChange(selectedBands.filter((b) => b !== band))
    } else {
      onBandsChange([...selectedBands, band])
    }
  }

  const handleRole = (raw) => {
    onRoleChange(raw === '' ? null : raw)
  }

  return (
    <form
      className="member-filter"
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      <fieldset className="member-filter-bands">
        <legend>Filter by band</legend>
        <div className="member-filter-chip-group" role="group">
          {bands.map((band) => {
            const active = selectedBands.includes(band)
            return (
              <button
                key={band}
                type="button"
                className={`member-filter-chip${active ? ' member-filter-chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleBand(band)}
              >
                {prettyBandName(band)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="member-filter-roles">
        <legend>Role</legend>
        <div className="member-filter-radio-group" role="radiogroup">
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value || 'all'} className="member-filter-radio">
              <input
                type="radio"
                name="member-role"
                value={opt.value}
                checked={(selectedRole ?? '') === opt.value}
                onChange={() => handleRole(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="member-filter-search">
        <label htmlFor="member-search">Search</label>
        <input
          id="member-search"
          type="search"
          inputMode="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, city, oshi…"
        />
      </div>
    </form>
  )
}
