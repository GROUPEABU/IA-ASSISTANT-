import { useSettings } from '@/contexts/SettingsContext'
import { WEIGHT_PRESETS } from '../constants'

const MIN_WEIGHT = 800
const MAX_WEIGHT = 3500
const STEP = 10
const COLOR = '#7DD3FC'

/**
 * Vehicle-mass slider with +/- buttons, numeric input, and weight presets.
 * Mirrors the SliderSection visual style but uses a wider kg-specific range.
 */
export default function WeightSlider({ value, onChange }) {
  const { t } = useSettings()

  const handleInputChange = (e) => {
    const next = e.target.value === '' ? MIN_WEIGHT : Number(e.target.value)
    if (!isNaN(next)) onChange(Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, next)))
  }

  return (
    <div className="glass-card p-3 mb-2">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">{t('malus_weight_label')}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange(Math.max(MIN_WEIGHT, value - STEP))}
            aria-label={t('weight_dec_label')}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: 'rgba(125,211,252,0.25)', background: 'rgba(125,211,252,0.06)', color: COLOR }}
          >−</button>
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={STEP}
              value={value}
              inputMode="numeric"
              onChange={handleInputChange}
              aria-label={t('weight_input_label')}
              className="w-16 text-2xl font-bold text-right bg-transparent border-0 outline-none"
              style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color: COLOR }}
            />
            <span className="text-xs font-medium" style={{ color: COLOR, opacity: 0.65 }}>{t('weight_unit')}</span>
          </div>
          <button
            onClick={() => onChange(Math.min(MAX_WEIGHT, value + STEP))}
            aria-label={t('weight_inc_label')}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: 'rgba(125,211,252,0.25)', background: 'rgba(125,211,252,0.06)', color: COLOR }}
          >+</button>
        </div>
      </div>
      <input
        type="range"
        min={MIN_WEIGHT}
        max={3000}
        step={STEP}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={t('malus_weight_label')}
        className="w-full block mb-2.5"
        style={{ accentColor: COLOR, height: 3 }}
      />
      <div className="grid grid-cols-4 gap-1">
        {WEIGHT_PRESETS.map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="py-1.5 rounded-lg text-[11px] font-medium transition border active:scale-95"
            style={{
              borderColor: value === v ? COLOR : 'rgba(255,255,255,0.08)',
              background:  value === v ? 'rgba(125,211,252,0.12)' : 'transparent',
              color:       value === v ? COLOR : '#475569',
            }}
          >{v}</button>
        ))}
      </div>
    </div>
  )
}
