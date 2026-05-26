/**
 * Segmented button control — used for fuel type, region, segment selectors.
 * Supports arbitrary column counts.
 */
export default function SegButton({ options, value, setValue, cols = 2 }) {
  return (
    <div
      role="radiogroup"
      className="seg-group grid gap-0 bg-navy-900/50 rounded-xl p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {options.map(o => {
        const isActive = value === o.k
        return (
          <button
            key={o.k}
            role="radio"
            aria-checked={isActive}
            onClick={() => setValue(o.k)}
            className="seg-btn py-2 rounded-[9px] text-xs font-medium transition flex flex-col items-center gap-0.5 active:scale-95"
            style={{
              background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
              color: isActive ? '#50E5E5' : '#64748b',
            }}
          >
            <span className="font-semibold">{o.l}</span>
            {o.note && <span className="text-[10px] opacity-60">{o.note}</span>}
          </button>
        )
      })}
    </div>
  )
}
