export default function Logo({ size = 'md', className = '' }) {
  const configs = {
    sm:  { iconS: 22, fontSize: 18, gap: 8,  letterSpacing: '-0.5px' },
    md:  { iconS: 30, fontSize: 24, gap: 10, letterSpacing: '-0.6px' },
    lg:  { iconS: 42, fontSize: 34, gap: 12, letterSpacing: '-0.8px' },
    xl:  { iconS: 52, fontSize: 42, gap: 14, letterSpacing: '-1px' },
  }
  const c = configs[size] ?? configs.md
  const totalW = c.iconS + c.gap + c.fontSize * 7.6
  const h = Math.max(c.iconS, c.fontSize)
  const textX = c.iconS + c.gap
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
        {/* Shine: dim white at start → pure bright white at end */}
        <linearGradient id={`${uid}-shine`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(200,215,225,0.82)" />
          <stop offset="55%"  stopColor="rgba(230,238,242,0.90)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1.00)" />
        </linearGradient>
      </defs>

      {/* Icon — official circular logo */}
      <g transform={`translate(0, ${(h - c.iconS) / 2}) scale(${c.iconS / 100})`}>
        <circle cx="50" cy="50" r="50" fill="#393F4A"/>
        <path
          d="M 14 50 a 18 18 0 1 0 36 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 a 18 18 0 1 0 -36 0"
          stroke="#50E5E5" strokeWidth="11"
          strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </g>

      {/* Wordmark — solid white, no filter */}
      <text
        x={textX}
        y={h * 0.82}
        fontFamily="'Poppins', system-ui, sans-serif"
        fontSize={c.fontSize}
        fontWeight="600"
        fill={`url(#${uid}-shine)`}
        letterSpacing={c.letterSpacing}
      >
        Autobuyunion
      </text>
    </svg>
  )
}
