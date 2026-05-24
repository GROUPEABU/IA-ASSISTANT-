import { useSettings } from '@/contexts/SettingsContext'

/**
 * Global TCO calculator parameters: ownership duration, annual mileage,
 * fuel price, electricity price.
 */
export default function TcoConfig({
  years, onYearsChange,
  kmYear, onKmYearChange,
  fuelPrice, onFuelPriceChange,
  elecPrice, onElecPriceChange,
}) {
  const { t } = useSettings()

  return (
    <div className="glass-card p-4">
      <div className="text-[11px] text-slate-500 font-medium tracking-widest uppercase mb-3">
        {t('params_label')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DurationField   value={years}  onChange={onYearsChange}  unitLabel={t('years_unit')} />
        <KmYearField     value={kmYear} onChange={onKmYearChange} label={t('km_year')} />
        <FuelPriceField  value={fuelPrice} onChange={onFuelPriceChange} label={t('fuel_price_label')} unit={t('fuel_price_unit')} />
        <ElecPriceField  value={elecPrice} onChange={onElecPriceChange} label={t('elec_price_label')} unit={t('elec_price_unit')} />
      </div>
    </div>
  )
}

function DurationField({ value, onChange, unitLabel }) {
  const { t } = useSettings()
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{t('duration_label')}</div>
      <div className="flex gap-1">
        {[3, 4, 5].map(y => {
          const isActive = value === y
          return (
            <button
              key={y}
              onClick={() => onChange(y)}
              aria-pressed={isActive}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border transition"
              style={{
                borderColor: isActive ? '#50E5E5' : 'rgba(255,255,255,0.1)',
                background:  isActive ? 'rgba(80,229,229,0.12)' : 'transparent',
                color:       isActive ? '#50E5E5' : '#64748b',
              }}
            >{y} {unitLabel}</button>
          )
        })}
      </div>
    </div>
  )
}

function KmYearField({ value, onChange, label }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label}</div>
      <div className="flex gap-1">
        {[10000, 15000, 20000, 30000].map(k => {
          const isActive = value === k
          return (
            <button
              key={k}
              onClick={() => onChange(k)}
              aria-pressed={isActive}
              className="flex-1 py-2 rounded-lg text-[10px] font-semibold border transition"
              style={{
                borderColor: isActive ? '#50E5E5' : 'rgba(255,255,255,0.1)',
                background:  isActive ? 'rgba(80,229,229,0.12)' : 'transparent',
                color:       isActive ? '#50E5E5' : '#64748b',
              }}
            >{k >= 1000 ? `${k / 1000}k` : k}</button>
          )
        })}
      </div>
    </div>
  )
}

function FuelPriceField({ value, onChange, label, unit }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label} ({unit})</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.05"
          min="0.5"
          max="4"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          className="flex-1 px-3 py-2 rounded-lg text-sm text-cyan-400 font-semibold border border-cyan-400/20 bg-cyan-400/5 outline-none text-center"
          style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
        />
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  )
}

function ElecPriceField({ value, onChange, label, unit }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label} ({unit})</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0.05"
          max="1"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          className="flex-1 px-3 py-2 rounded-lg text-sm text-sky-300 font-semibold border border-sky-300/20 bg-sky-300/5 outline-none text-center"
          style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
        />
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  )
}
