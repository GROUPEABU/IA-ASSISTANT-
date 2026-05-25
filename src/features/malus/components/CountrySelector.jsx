import { RELIABILITY_CONFIG } from '@/utils/malusWorld'
import { useSettings } from '@/contexts/SettingsContext'
import { getCountryName } from '@/utils/malusLabels'

/**
 * Country search + reliability filter + clickable country grid.
 *
 * @param {object}    props
 * @param {Array}     props.countries          — pre-filtered country list
 * @param {string}    props.search             — current search query
 * @param {function}  props.onSearchChange     — search input handler
 * @param {string}    props.reliabilityFilter  — 'all' | 'official' | 'indicative' | 'info'
 * @param {function}  props.onReliabilityChange
 * @param {object?}   props.selectedCountry    — currently selected country
 * @param {function}  props.onSelect           — called with the clicked country
 */
export default function CountrySelector({
  countries, search, onSearchChange, reliabilityFilter, onReliabilityChange,
  selectedCountry, onSelect,
}) {
  const { t } = useSettings()
  return (
    <>
      <ReliabilityFilter value={reliabilityFilter} onChange={onReliabilityChange} />
      <input
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={t('co2_country_search')}
        aria-label={t('co2_country_search')}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none mb-2"
        style={{
          fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      />
      <CountryGrid
        countries={countries}
        selectedCountry={selectedCountry}
        onSelect={onSelect}
      />
    </>
  )
}

function ReliabilityFilter({ value, onChange }) {
  const { t } = useSettings()
  const options = [
    { k: 'all',        l: t('co2_filter_all') },
    { k: 'official',   l: t('malus_reliability_official_label') },
    { k: 'indicative', l: t('malus_reliability_indicative_label') },
    { k: 'info',       l: t('malus_reliability_info_label') },
  ]
  return (
    <div
      role="radiogroup"
      aria-label={t('co2_reliability_filter')}
      className="grid grid-cols-4 gap-0 bg-navy-900/60 rounded-xl p-1 mb-2 flex-shrink-0"
    >
      {options.map(f => {
        const isActive = value === f.k
        return (
          <button
            key={f.k}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(f.k)}
            className="py-2 rounded-[9px] text-[11px] transition"
            style={{
              background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
              color:      isActive ? '#50E5E5' : '#64748b',
              fontWeight: isActive ? 600 : 400,
            }}
          >{f.l}</button>
        )
      })}
    </div>
  )
}

function CountryGrid({ countries, selectedCountry, onSelect }) {
  const { t, lang } = useSettings()
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 mb-3">
      {countries.map(c => {
        const cfg = RELIABILITY_CONFIG[c.reliability]
        const isSelected = selectedCountry?.code === c.code
        const displayName = getCountryName(c.code, lang) || c.name
        return (
          <button
            key={c.code}
            onClick={() => onSelect(c)}
            aria-pressed={isSelected}
            className="py-2 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition active:scale-95"
            style={{
              border:     `1px solid ${isSelected ? 'rgba(80,229,229,0.55)' : 'rgba(255,255,255,0.07)'}`,
              background: isSelected ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <span className="text-xl">{c.flag}</span>
            <span className="text-[10px] text-slate-400 leading-tight">{displayName}</span>
            <span className="text-[9px] font-bold tracking-wide" style={{ color: cfg.color }}>
              {t(cfg.shortKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
