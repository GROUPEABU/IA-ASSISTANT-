/**
 * Extraction des chiffres clés d'un rapport Veille Prix (section « L'essentiel »)
 * pour comparer deux analyses du même véhicule dans le temps (évolution prix).
 * Lecture tolérante : si le format ne matche pas, on renvoie null (pas de diff).
 */
// Les parenthèses sont ignorées : « (… marge 3 000 € HT incluse) » sur la
// ligne d'achat polluerait sinon le min avec le montant de la marge.
const numbersOf = (line) =>
  [...line.replace(/\([^)]*\)/g, '').matchAll(/(\d{1,3}(?:[\s  ]\d{3})+|\d{4,6})/g)]
    .map((m) => Number(m[1].replace(/[\s  ]/g, '')))
    .filter((n) => n >= 1000 && n < 1000000)

export function extractReportFigures(report) {
  if (!report) return null
  const out = {}
  // Les lignes cherchées sont en tête de rapport — on borne le scan.
  for (const raw of String(report).split('\n').slice(0, 60)) {
    const line = raw.trim()
    if (out.achatMin == null && /prix d.achat pro/i.test(line)) {
      const n = numbersOf(line)
      if (n.length) { out.achatMin = Math.min(...n); out.achatMax = Math.max(...n) }
    } else if (out.reventeMin == null && /revente conseill/i.test(line)) {
      const n = numbersOf(line)
      if (n.length) { out.reventeMin = Math.min(...n); out.reventeMax = Math.max(...n) }
    }
    if (out.achatMin != null && out.reventeMin != null) break
  }
  return out.achatMin != null || out.reventeMin != null ? out : null
}
