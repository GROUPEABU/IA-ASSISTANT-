export default function Logo({ size = 'md', className = '' }) {
  const configs = {
    sm:  { iconW: 40, iconH: 18, fontSize: 18, gap: 6, letterSpacing: '-0.5px' },
    md:  { iconW: 56, iconH: 25, fontSize: 24, gap: 8, letterSpacing: '-0.6px' },
    lg:  { iconW: 80, iconH: 36, fontSize: 34, gap: 10, letterSpacing: '-0.8px' },
    xl:  { iconW: 100, iconH: 45, fontSize: 42, gap: 12, letterSpacing: '-1px' },
  }
  const c = configs[size] ?? configs.md
  const totalW = c.iconW + c.gap + c.fontSize * 7.6

  return (
    <svg
      viewBox={`0 0 ${totalW} ${Math.max(c.iconH, c.fontSize)}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: totalW, height: Math.max(c.iconH, c.fontSize) }}
      className={className}
    >
      {/* Double-circle "∞" icon — exact path from co2-malus.vercel.app */}
      <g transform={`scale(${c.iconW / 80}, ${c.iconH / 36}) translate(0, ${(36 - 36) / 2})`}>
        <path
          d="M 14 18 a 9 9 0 1 0 18 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0 a 9 9 0 1 0 -18 0"
          stroke="#50E5E5"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(80,229,229,0.6))' }}
        />
      </g>
      {/* "Autobuyunion" text */}
      <text
        x={c.iconW + c.gap}
        y={Math.max(c.iconH, c.fontSize) * 0.82}
        fontFamily="'Poppins', system-ui, sans-serif"
        fontSize={c.fontSize}
        fontWeight="500"
        fill="rgba(224,225,225,0.9)"
        letterSpacing={c.letterSpacing}
      >
        Autobuyunion
      </text>
    </svg>
  )
}
