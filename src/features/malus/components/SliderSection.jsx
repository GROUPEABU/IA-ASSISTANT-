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
    <div className="glass-card p-4 mb-2">
      {/* Label */}
      <span className="block text-[11px] text-slate-500 font-medium tracking-widest uppercase mb-3">
        {label}
      </span>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Decrement */}
        <button
          onClick={decrement}
          aria-label={`Diminuer ${label}`}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-light transition active:scale-95 flex-shrink-0"
          style={{ borderColor: `${color}40`, border: `1.5px solid ${color}40`, background: `${color}10`, color }}
        >−</button>

        {/* Value box */}
        <div
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5"
          style={{ background: `${color}12`, border: `1.5px solid ${color}30` }}
        >
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            inputMode="numeric"
            onChange={handleInputChange}
            aria-label={`Valeur ${label}`}
            className="w-20 text-3xl font-bold text-center bg-transparent border-0 outline-none leading-none"
            style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color }}
          />
          <span className="text-sm font-semibold" style={{ color, opacity: 0.6 }}>{unit}</span>
        </div>

        {/* Increment */}
        <button
          onClick={increment}
          aria-label={`Augmenter ${label}`}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-light transition active:scale-95 flex-shrink-0"
          style={{ borderColor: `${color}40`, border: `1.5px solid ${color}40`, background: `${color}10`, color }}
        >+</button>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        aria-label={`Curseur ${label}`}
        className="w-full block mb-3"
        style={{ accentColor: color, height: 4 }}
      />

      {/* Presets grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {presets.map(v => (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="py-2 rounded-xl text-[12px] font-semibold transition border active:scale-95 text-center"
            style={{
              borderColor: value === v ? color : 'rgba(255,255,255,0.07)',
              background:  value === v ? `${color}18` : 'rgba(255,255,255,0.02)',
              color:       value === v ? color : '#64748b',
            }}
          >{v}</button>
        ))}
      </div>
    </div>
  )
}
