import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
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
  { value: '', key: 'memberFilter.roleAll' },
  { value: 'organizer', key: 'memberFilter.roleOrganizers' },
  { value: 'member', key: 'memberFilter.roleMembers' },
  { value: 'alumnus', key: 'memberFilter.roleAlumni' },
  { value: 'cover-band-lead', key: 'memberFilter.roleCoverBands' },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function MemberFilter({
  bands,
  selectedBands,
  onBandsChange,
  selectedRole,
  onRoleChange,
  searchValue,
  onSearchChange,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

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
        <legend>{t('memberFilter.byBand')}</legend>
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
        <legend>{t('memberFilter.byRole')}</legend>
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
              <span>{t(opt.key)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="member-filter-search">
        <label htmlFor="member-search">{t('memberFilter.search')}</label>
        <input
          id="member-search"
          type="search"
          inputMode="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('memberFilter.searchPlaceholder')}
        />
      </div>
    </form>
  )
}
