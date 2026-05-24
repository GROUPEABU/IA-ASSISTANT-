export default function Logo({ size = 'md', className = '' }) {
  const scales = { sm: 0.6, md: 1, lg: 1.5, xl: 2 }
  const s = scales[size] ?? 1

  return (
    <svg
      viewBox="0 0 260 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 260 * s, height: 52 * s }}
      className={className}
    >
      {/* Circular arc around the "a" */}
      <circle cx="26" cy="26" r="22" stroke="#50E5E5" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray="110 30" strokeDashoffset="-8" />
      {/* Arrow tip on arc */}
      <polyline points="44,18 48,24 42,26" stroke="#50E5E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Letter "a" */}
      <text x="19" y="34" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="700" fill="#50E5E5" textAnchor="middle">a</text>
      {/* "utobuyunion" */}
      <text x="58" y="35" fontFamily="Poppins, sans-serif" fontSize="26" fontWeight="600" fill="white" letterSpacing="-0.5">utobuyunion</text>
    </svg>
  )
}
