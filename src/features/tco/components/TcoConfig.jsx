import { useSettings } from '@/contexts/SettingsContext'

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
        <DurationField   value={years}     onChange={onYearsChange}     unitLabel={t('years_unit')} />
        <KmYearField     value={kmYear}    onChange={onKmYearChange}    label={t('km_year')} />
        <FuelPriceField  value={fuelPrice} onChange={onFuelPriceChange} label={t('fuel_price_label')} unit={t('fuel_price_unit')} />
        <ElecPriceField  value={elecPrice} onChange={onElecPriceChange} label={t('elec_price_label')} unit={t('elec_price_unit')} />
      </div>
    </div>
  )
}

function DurationField({ value, onChange, unitLabel }) {
  const { t } = useSettings()
  const PRESETS = [3, 4, 5]

  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{t('duration_label')}</div>
      <div className="flex gap-1 items-stretch">
        {PRESETS.map(y => (
          <button
            key={y}
            onClick={() => onChange(y)}
            aria-pressed={value === y}
            className="tco-preset-btn flex-1 py-2 rounded-lg text-xs font-semibold border transition"
          >
            {y}
          </button>
        ))}
        <input
          type="number"
          min="1" max="15"
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value)
            if (v >= 1 && v <= 15) onChange(v)
          }}
          aria-label={t('duration_label')}
          className="tco-custom-input w-12 py-2 rounded-lg text-xs font-semibold border text-center outline-none"
          style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
        />
        <span className="flex items-center text-[10px] text-slate-500 pl-0.5 flex-shrink-0">{unitLabel}</span>
      </div>
    </div>
  )
}

function KmYearField({ value, onChange, label }) {
  const PRESETS = [10000, 15000, 20000, 30000]
  const kmK = Math.round(value / 1000)

  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label}</div>
      <div className="flex gap-1 mb-1">
        {PRESETS.map(k => (
          <button
            key={k}
            onClick={() => onChange(k)}
            aria-pressed={value === k}
            className="tco-preset-btn flex-1 py-2 rounded-lg text-[10px] font-semibold border transition"
          >
            {k / 1000}k
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1" max="200" step="1"
          value={kmK}
          onChange={e => {
            const v = parseInt(e.target.value)
            if (v >= 1) onChange(v * 1000)
          }}
          aria-label={label}
          className="tco-custom-input flex-1 py-1.5 rounded-lg text-[11px] font-semibold border text-center outline-none"
          style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
        />
        <span className="text-[10px] text-slate-500 flex-shrink-0">000 km/an</span>
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
