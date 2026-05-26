import { useSettings } from '@/contexts/SettingsContext'
import { WEIGHT_PRESETS } from '../constants'

const MIN_WEIGHT = 800
const MAX_WEIGHT = 3500
const STEP = 10
const COLOR = '#7DD3FC'

export default function WeightSlider({ value, onChange }) {
  const { t } = useSettings()

  const handleInputChange = (e) => {
    const next = e.target.value === '' ? MIN_WEIGHT : Number(e.target.value)
    if (!isNaN(next)) onChange(Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, next)))
  }

  return (
    <div className="glass-card p-4 mb-2">
      {/* Label */}
      <span className="block text-[11px] text-slate-500 font-medium tracking-widest uppercase mb-3">
        {t('malus_weight_label')}
      </span>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onChange(Math.max(MIN_WEIGHT, value - STEP))}
          aria-label={t('weight_dec_label')}
          className="slider-ctrl-btn w-11 h-11 rounded-xl flex items-center justify-center text-xl font-light transition active:scale-95 flex-shrink-0"
          style={{ border: '1.5px solid rgba(125,211,252,0.35)', background: 'rgba(125,211,252,0.08)', color: COLOR }}
        >−</button>

        <div
          className="slider-value-box flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5"
          style={{ background: 'rgba(125,211,252,0.08)', border: '1.5px solid rgba(125,211,252,0.25)' }}
        >
          <input
            type="number"
            min={MIN_WEIGHT}
            max={MAX_WEIGHT}
            step={STEP}
            value={value}
            inputMode="numeric"
            onChange={handleInputChange}
            aria-label={t('weight_input_label')}
            className="slider-value-input w-24 text-3xl font-bold text-center border-0 outline-none leading-none"
            style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color: COLOR, background: 'transparent' }}
          />
          <span className="slider-unit text-sm font-semibold" style={{ color: COLOR, opacity: 0.6 }}>{t('weight_unit')}</span>
        </div>

        <button
          onClick={() => onChange(Math.min(MAX_WEIGHT, value + STEP))}
          aria-label={t('weight_inc_label')}
          className="slider-ctrl-btn w-11 h-11 rounded-xl flex items-center justify-center text-xl font-light transition active:scale-95 flex-shrink-0"
          style={{ border: '1.5px solid rgba(125,211,252,0.35)', background: 'rgba(125,211,252,0.08)', color: COLOR }}
        >+</button>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={MIN_WEIGHT}
        max={3000}
        step={STEP}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={t('malus_weight_label')}
        className="w-full block mb-3"
        style={{ accentColor: COLOR, height: 4 }}
      />

      {/* Presets grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {WEIGHT_PRESETS.map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="slider-preset-btn py-2 rounded-xl text-[12px] font-semibold transition border active:scale-95 text-center"
            style={{
              borderColor: value === v ? COLOR : 'rgba(255,255,255,0.07)',
              background:  value === v ? 'rgba(125,211,252,0.14)' : 'rgba(255,255,255,0.02)',
              color:       value === v ? COLOR : '#64748b',
            }}
          >{v}</button>
        ))}
      </div>
    </div>
  )
}
