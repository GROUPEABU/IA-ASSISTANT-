/**
 * Score d'opportunité 0-100 d'un rapport Veille Prix — calculé côté client par
 * lecture du rapport généré (sections « L'essentiel » et « Repères marché »),
 * SANS toucher au prompt verrouillé ni faire d'appel IA supplémentaire.
 *
 * Trois composantes :
 * - Positionnement revente (40 pts) : revente conseillée sous le prix moyen
 *   marché = annonce compétitive qui se vend vite.
 * - Rentabilité marge (30 pts) : marge cible rapportée au prix d'achat —
 *   3 000 € sur un véhicule à 15 000 € rapportent plus vite que sur 60 000 €.
 * - Profondeur marché (30 pts) : nombre d'annonces comparables = liquidité à
 *   la revente.
 *
 * Lecture tolérante : si les chiffres clés manquent, renvoie null (pas de badge).
 */
import { extractReportFigures } from './reportFigures'

const numbersOf = (s) =>
  [...String(s).matchAll(/\d{1,3}(?:[\s  ]\d{3})+|\d+/g)]
    .map((m) => Number(m[0].replace(/[\s  ]/g, '')))

// Interpolation linéaire bornée : v dans [vMin, vMax] → [outMin, outMax].
function scale(v, vMin, vMax, outMin, outMax) {
  if (v == null || !Number.isFinite(v)) return outMin
  const t = Math.min(1, Math.max(0, (v - vMin) / (vMax - vMin)))
  return outMin + t * (outMax - outMin)
}

// Prix moyen (ou médian à défaut) et nb d'annonces du tableau « Repères marché ».
function readMarketTable(report) {
  const lines = String(report).split('\n')
  const idx = lines.findIndex((l) => /^##\s*rep[eè]res march/i.test(l.trim()))
  if (idx < 0) return { avg: null, count: null }
  for (let i = idx + 1; i < Math.min(lines.length, idx + 10); i++) {
    const l = lines[i].trim()
    if (!l.startsWith('|') || /---/.test(l) || /prix moyen/i.test(l)) continue
    const cells = l.split('|').map((c) => c.trim()).filter(Boolean)
    if (!cells.length) continue
    const avg = numbersOf(cells[0]).find((n) => n >= 1000)
      ?? (cells[1] ? numbersOf(cells[1]).find((n) => n >= 1000) : null)
      ?? null
    const count = numbersOf(cells[cells.length - 1]).find((n) => n > 0 && n < 1000) ?? null
    if (avg != null) return { avg, count }
  }
  return { avg: null, count: null }
}

// Repli annonces : « Tranche de référence : … — 12 annonces à ~… km ».
function readAnnoncesEssentiel(report) {
  for (const raw of String(report).split('\n').slice(0, 60)) {
    const m = raw.match(/(\d{1,3})\s*annonces/i)
    if (m) return Number(m[1])
  }
  return null
}

/**
 * @param {string} report  Rapport Markdown Veille Prix
 * @param {number} margin  Marge cible € HT utilisée pour ce rapport
 * @returns {{ score: number, parts: { positionnement: number, rentabilite: number, profondeur: number }, avg: number, annonces: number|null } | null}
 */
export function computeOpportunityScore(report, margin = 3000) {
  const fig = extractReportFigures(report)
  if (!fig?.achatMin || !fig?.reventeMin) return null
  const { avg, count } = readMarketTable(report)
  if (!avg) return null
  const annonces = count ?? readAnnoncesEssentiel(report)

  // Positionnement : % d'écart de la revente conseillée sous le prix moyen.
  // -10 % (revente AU-DESSUS du marché) → 0 pt ; +15 % sous le marché → 40 pts.
  const discount = (avg - fig.reventeMin) / avg
  const positionnement = scale(discount, -0.10, 0.15, 0, 40)

  // Rentabilité : marge / capital immobilisé. 4 % → 0 pt ; 20 % → 30 pts.
  const roi = (Number(margin) || 3000) / fig.achatMin
  const rentabilite = scale(roi, 0.04, 0.20, 0, 30)

  // Profondeur : 3 annonces → 4 pts ; 40+ → 30 pts. Échantillon inconnu → 8.
  const profondeur = annonces != null ? scale(annonces, 3, 40, 4, 30) : 8

  const score = Math.round(Math.min(100, Math.max(0, positionnement + rentabilite + profondeur)))
  return {
    score,
    parts: {
      positionnement: Math.round(positionnement),
      rentabilite: Math.round(rentabilite),
      profondeur: Math.round(profondeur),
    },
    avg,
    annonces,
  }
}
