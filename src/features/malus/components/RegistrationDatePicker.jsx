import { formatDateFR } from '@/utils/malusWorld'
import { DATE_YEARS, DATE_MONTHS, DATE_PRESETS, SELECT_STYLE, getDaysInMonth } from '../constants'

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
  const [year, month, day] = value.split('-')
  const daysInMonth = getDaysInMonth(year, month)

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
          Date 1ère immat
        </span>
        <span className="text-xs font-semibold text-amber-400">{formatDateFR(value)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        <select
          value={day}
          onChange={setDay}
          aria-label="Jour d'immatriculation"
          className="w-full px-2 py-2 rounded-lg border outline-none text-sm font-medium"
          style={SELECT_STYLE}
        >
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = String(i + 1).padStart(2, '0')
            return <option key={d} value={d}>{i + 1}</option>
          })}
        </select>
        <select
          value={month}
          onChange={setMonth}
          aria-label="Mois d'immatriculation"
          className="w-full px-2 py-2 rounded-lg border outline-none text-sm font-medium"
          style={SELECT_STYLE}
        >
          {DATE_MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select
          value={year}
          onChange={setYear}
          aria-label="Année d'immatriculation"
          className="w-full px-2 py-2 rounded-lg border outline-none text-sm font-medium"
          style={SELECT_STYLE}
        >
          {DATE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {DATE_PRESETS.map(p => {
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
