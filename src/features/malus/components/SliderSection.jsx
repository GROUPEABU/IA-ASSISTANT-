/**
 * Reusable slider section with label, +/- buttons, numeric input, range, and presets.
 * Used by the emissions slider, weight slider, and other numeric inputs in the malus tool.
 */
export default function SliderSection({
  label, value, setValue, min, max, step = 1, unit, color, presets,
}) {
  const decrement = () => setValue(v => Math.max(min, v - step))
  const increment = () => setValue(v => Math.min(max, v + step))

  const handleInputChange = (e) => {
    const next = e.target.value === '' ? min : Number(e.target.value)
    if (!isNaN(next)) setValue(Math.min(max, Math.max(min, next)))
  }

  return (
    <div className="glass-card p-3 mb-2">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={decrement}
            aria-label={`Diminuer ${label}`}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: `${color}30`, background: `${color}08`, color }}
          >−</button>
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              min={min}
              max={max}
              value={value}
              inputMode="numeric"
              onChange={handleInputChange}
              aria-label={`Valeur ${label}`}
              className="w-16 text-2xl font-bold text-right bg-transparent border-0 outline-none"
              style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color }}
            />
            <span className="text-xs font-medium" style={{ color, opacity: 0.65 }}>{unit}</span>
          </div>
          <button
            onClick={increment}
            aria-label={`Augmenter ${label}`}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: `${color}30`, background: `${color}08`, color }}
          >+</button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        aria-label={`Curseur ${label}`}
        className="w-full block mb-2.5"
        style={{ accentColor: color, height: 3 }}
      />
      <div className="grid grid-cols-4 gap-1">
        {presets.map(v => (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="py-1.5 rounded-lg text-[11px] font-medium transition border active:scale-95"
            style={{
              borderColor: value === v ? color : 'rgba(255,255,255,0.08)',
              background: value === v ? `${color}18` : 'transparent',
              color: value === v ? color : '#475569',
            }}
          >{v}</button>
        ))}
      </div>
    </div>
  )
}
