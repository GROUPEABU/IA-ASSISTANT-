export default function Logo({ size = 'md', className = '' }) {
  const configs = {
    sm:  { iconW: 40, iconH: 18, fontSize: 18, gap: 6, letterSpacing: '-0.5px' },
    md:  { iconW: 56, iconH: 25, fontSize: 24, gap: 8, letterSpacing: '-0.6px' },
    lg:  { iconW: 80, iconH: 36, fontSize: 34, gap: 10, letterSpacing: '-0.8px' },
    xl:  { iconW: 100, iconH: 45, fontSize: 42, gap: 12, letterSpacing: '-1px' },
  }
  const c = configs[size] ?? configs.md
  const totalW = c.iconW + c.gap + c.fontSize * 7.6
  const h = Math.max(c.iconH, c.fontSize)
  const uid = `logo-${size}`

  return (
    <svg
      viewBox={`0 0 ${totalW} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: totalW, height: h }}
      className={`logo-svg ${className}`}
    >
      <defs>
        {/* Radial gradient — blue interior fill of the ∞ */}
        <radialGradient id={`${uid}-fill`} cx="50%" cy="50%" r="65%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="var(--logo-fill-inner, #93c5fd)" stopOpacity="0.55" />
          <stop offset="60%"  stopColor="var(--logo-fill-mid,   #38bdf8)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--logo-fill-outer, #0891b2)" stopOpacity="0.05" />
        </radialGradient>
        {/* Linear gradient — stroke cyan→blue */}
        <linearGradient id={`${uid}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="var(--logo-stroke-a, #38bdf8)" />
          <stop offset="100%" stopColor="var(--logo-stroke-b, #50E5E5)" />
        </linearGradient>
      </defs>

      <g transform={`scale(${c.iconW / 80}, ${c.iconH / 36})`}>
        {/* Blue interior fill layer */}
        <path
          d="M 14 18 a 9 9 0 1 0 18 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0 a 9 9 0 1 0 -18 0"
          fill={`url(#${uid}-fill)`}
          stroke="none"
        />
        {/* Stroked outline with glow */}
        <path
          d="M 14 18 a 9 9 0 1 0 18 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0 a 9 9 0 1 0 -18 0"
          stroke={`url(#${uid}-stroke)`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ filter: 'drop-shadow(0 0 5px var(--logo-glow, rgba(80,229,229,0.65)))' }}
        />
      </g>

      {/* "Autobuyunion" text */}
      <text
        x={c.iconW + c.gap}
        y={h * 0.82}
        fontFamily="'Poppins', system-ui, sans-serif"
        fontSize={c.fontSize}
        fontWeight="600"
        fill="var(--logo-text, rgba(224,225,225,0.92))"
        letterSpacing={c.letterSpacing}
      >
        Autobuyunion
      </text>
    </svg>
  )
}
