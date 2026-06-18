/**
 * variant='original'   — ∞ actuel (cyan uniforme)
 * variant='a-crossbar' — ∞ + barre dans la lobe gauche (A implicite + O à droite)
 * variant='bicolor'    — A blanc + O cyan, connectés en ∞
 * variant='glyphs'     — A et O typographiques redessinés, fusionnés en ∞
 */
export default function Logo({ size = 'md', className = '', iconOnly = false, variant = 'original' }) {
  const configs = {
    sm:  { iconS: 22, fontSize: 18, gap: 8,  letterSpacing: '-0.5px' },
    md:  { iconS: 30, fontSize: 24, gap: 10, letterSpacing: '-0.6px' },
    lg:  { iconS: 42, fontSize: 34, gap: 12, letterSpacing: '-0.8px' },
    xl:  { iconS: 52, fontSize: 42, gap: 14, letterSpacing: '-1px' },
  }
  const c = configs[size] ?? configs.md
  const totalW = c.iconS + c.gap + c.fontSize * 7.6
  const h = Math.max(c.iconS, c.fontSize)

  // ─── Pictogrammes (viewBox 100×100) ───────────────────────────────────────
  // Chemin ∞ de base : deux boucles de rayon 18 centrées en (32,50) et (68,50).
  const INF = 'M 14 50 a 18 18 0 1 0 36 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 a 18 18 0 1 0 -36 0'

  function Icon() {
    switch (variant) {
      // ── A-crossbar : ∞ + barre transversale dans la lobe gauche ──────────
      case 'a-crossbar':
        return (
          <>
            <circle cx="50" cy="50" r="50" fill="#393F4A" />
            <path d={INF} stroke="#50E5E5" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Barre du A — à 57% de la hauteur de la lobe gauche */}
            <line x1="21" y1="55" x2="43" y2="55"
                  stroke="#50E5E5" strokeWidth="7" strokeLinecap="round" />
          </>
        )

      // ── Bicolore : A blanc (lobe gauche) + O cyan (lobe droite) ──────────
      case 'bicolor': {
        // Lobe gauche : arc de (50,50) → gauche → (50,50)
        const leftLobe  = 'M 50 50 a 18 18 0 1 1 -36 0 a 18 18 0 1 1 36 0'
        // Lobe droite : arc de (50,50) → droite → (50,50)
        const rightLobe = 'M 50 50 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0'
        return (
          <>
            <circle cx="50" cy="50" r="50" fill="#2a3140" />
            {/* Lobe gauche blanc = A */}
            <path d={leftLobe} stroke="#e2e8f0" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Barre du A en blanc */}
            <line x1="21" y1="55" x2="43" y2="55"
                  stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
            {/* Lobe droite cyan = O */}
            <path d={rightLobe} stroke="#50E5E5" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )
      }

      // ── Glyphes : A et O typographiques vrais, soudés au croisement ──────
      case 'glyphs': {
        // A : apex en (32,22), pattes jusqu'à (18,72) et (46,72), barre à y=54
        const aLeft   = 'M 32 22 L 18 72'
        const aRight  = 'M 32 22 L 46 72'
        const aBar    = 'M 22 55 L 42 55'
        // O : ellipse droite centrée en (68,50), rx=18, ry=22
        return (
          <>
            <circle cx="50" cy="50" r="50" fill="#2a3140" />
            {/* Dégradé du A vers le O au croisement */}
            <defs>
              <linearGradient id="ao-grad" x1="18" y1="0" x2="86" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#e2e8f0" />
                <stop offset="48%"  stopColor="#a3f3f3" />
                <stop offset="100%" stopColor="#50E5E5" />
              </linearGradient>
            </defs>
            {/* A */}
            <path d={`${aLeft} ${aRight}`} stroke="url(#ao-grad)" strokeWidth="9"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={aBar} stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
            {/* O */}
            <ellipse cx="68" cy="50" rx="18" ry="22"
                     stroke="#50E5E5" strokeWidth="9" fill="none" />
            {/* Point de jonction A–O */}
            <circle cx="50" cy="50" r="4" fill="#a3f3f3" />
          </>
        )
      }

      // ── Original (défaut) ─────────────────────────────────────────────────
      default:
        return (
          <>
            <circle cx="50" cy="50" r="50" fill="#393F4A" />
            <path d={INF} stroke="#50E5E5" strokeWidth="11"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )
    }
  }

  if (iconOnly) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
           style={{ width: c.iconS, height: c.iconS }} className={`logo-svg ${className}`}>
        <Icon />
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ width: totalW, height: h }} className={`logo-svg ${className}`}>
      <g transform={`translate(0, ${(h - c.iconS) / 2}) scale(${c.iconS / 100})`}>
        <Icon />
      </g>
      <text
        x={c.iconS + c.gap}
        y={h * 0.82}
        fontFamily="'Poppins', system-ui, sans-serif"
        fontSize={c.fontSize}
        fontWeight="600"
        fill="var(--logo-text, #ffffff)"
        letterSpacing={c.letterSpacing}
      >
        Autobuyunion
      </text>
    </svg>
  )
}
