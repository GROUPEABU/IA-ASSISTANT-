import { useMemo } from 'react'
import { formatDateFR } from '@/utils/malusWorld'
import { useSettings } from '@/contexts/SettingsContext'
import { DATE_YEARS, DATE_PRESETS, SELECT_STYLE, getDaysInMonth } from '../constants'

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES' }

/**
 * Build a list of [value, label] pairs for the 12 months of the year, using
 * the user's active locale via Intl.DateTimeFormat. value is "01".."12" so
 * the value contract is unchanged from the previous module-level constant.
 */
function getLocalizedMonths(lang) {
  const fmt = new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'fr-FR', { month: 'short' })
  return Array.from({ length: 12 }, (_, i) => {
    const v = String(i + 1).padStart(2, '0')
    const label = fmt.format(new Date(2025, i, 15)).replace(/\.$/, '')
    return { v, l: label.charAt(0).toUpperCase() + label.slice(1) }
  })
}

/**
 * Formats a date preset label like "Mars 25" / "Mar 25" depending on locale.
 */
function formatPresetLabel(isoDate, lang) {
  const [year, month] = isoDate.split('-')
  const fmt = new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'fr-FR', { month: 'short' })
  const m = fmt.format(new Date(parseInt(year), parseInt(month) - 1, 1)).replace(/\.$/, '')
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${year.slice(2)}`
}

/**
 * Registration-date picker for the malus calculator.
 * Three native selects (Day / Month / Year, French order) + quick presets.
 * The day count adapts dynamically to the selected month/year.
 *
 * @param {object}   props
 * @param {string}   props.value     — ISO date YYYY-MM-DD
 * @param {function} props.onChange  — receives the new ISO date
 */
export default function RegistrationDatePicker({ value, onChange }) {
  const { t, language } = useSettings()
  const [year, month, day] = value.split('-')
  const daysInMonth = getDaysInMonth(year, month)

  const localizedMonths = useMemo(() => getLocalizedMonths(language), [language])
  const localizedPresets = useMemo(
    () => DATE_PRESETS.map(p => ({ ...p, l: formatPresetLabel(p.d, language) })),
    [language],
  )

  const clampDay = (newYear, newMonth) => {
    const max = getDaysInMonth(newYear, newMonth)
    return String(Math.min(parseInt(day, 10), max)).padStart(2, '0')
  }

  const setDay = (e) => onChange(`${year}-${month}-${e.target.value}`)

  const setMonth = (e) => {
    const newMonth = e.target.value
    onChange(`${year}-${newMonth}-${clampDay(year, newMonth)}`)
  }

  const setYear = (e) => {
    const newYear = e.target.value
    onChange(`${newYear}-${month}-${clampDay(newYear, month)}`)
  }

  return (
    <div className="glass-card p-3 mb-2">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">
          {t('malus_date_label')}
        </span>
        <span className="text-xs font-semibold text-amber-400">{formatDateFR(value)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        {/* Day */}
        <div className="flex flex-col items-center gap-1">
          <select
            value={day}
            onChange={setDay}
            aria-label="Jour d'immatriculation"
            className="w-full px-1 py-2.5 rounded-xl border outline-none text-sm font-semibold text-center"
            style={{ ...SELECT_STYLE, textAlignLast: 'center' }}
          >
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = String(i + 1).padStart(2, '0')
              return <option key={d} value={d}>{String(i + 1).padStart(2, '0')}</option>
            })}
          </select>
          <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">{t('date_day')}</span>
        </div>

        {/* Month */}
        <div className="flex flex-col items-center gap-1">
          <select
            value={month}
            onChange={setMonth}
            aria-label="Mois d'immatriculation"
            className="w-full px-1 py-2.5 rounded-xl border outline-none text-sm font-semibold text-center"
            style={{ ...SELECT_STYLE, textAlignLast: 'center' }}
          >
            {localizedMonths.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">{t('date_month')}</span>
        </div>

        {/* Year */}
        <div className="flex flex-col items-center gap-1">
          <select
            value={year}
            onChange={setYear}
            aria-label="Année d'immatriculation"
            className="w-full px-1 py-2.5 rounded-xl border outline-none text-sm font-semibold text-center"
            style={{ ...SELECT_STYLE, textAlignLast: 'center' }}
          >
            {DATE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">{t('date_year')}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {localizedPresets.map(p => {
          const isActive = value === p.d
          return (
            <button
              key={p.d}
              onClick={() => onChange(p.d)}
              className="py-1.5 rounded-lg text-[10px] font-medium transition border active:scale-95 truncate"
              style={{
                borderColor: isActive ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                background:  isActive ? 'rgba(251,191,36,0.12)' : 'transparent',
                color:       isActive ? '#fbbf24' : '#475569',
              }}
            >{p.l}</button>
          )
        })}
      </div>
    </div>
  )
}
