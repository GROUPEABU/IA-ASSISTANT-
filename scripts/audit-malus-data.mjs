// Completeness audit — checks every country returns a fully-populated record
// across required fields, and flags documented-but-unapplied reductions.
import { COUNTRIES, buildCountryData } from '../src/utils/malusWorld.js'

const REQUIRED = ['tax_name', 'currency_symbol', 'system_description', 'brackets',
                  'specific_penalty', 'specific_penalty_amount', 'has_malus',
                  'severity', 'source', 'source_url', 'notes']
const RECOMMENDED = ['legal_ref']

const gaps = { missing: [], recommended: [], phev: [], url: [] }

for (const c of COUNTRIES) {
  // Sample across fuel types to catch fuel-specific record holes
  for (const fuel of ['thermique', 'ev', 'phev', 'hybride']) {
    const r = buildCountryData(c.code, 150, 1600, fuel, '2025-03-12', false,
                               { vehiclePrice: 40000, displacement: 1600 })
    if (!r) { gaps.missing.push(`${c.code}: NULL record (${fuel})`); continue }
    for (const f of REQUIRED) {
      const v = r[f]
      const empty = v === undefined || v === null || v === '' ||
                    (Array.isArray(v) && v.length === 0)
      if (empty) gaps.missing.push(`${c.code} (${fuel}): champ requis vide « ${f} »`)
    }
  }
  // Recommended fields — checked once on the canonical thermique record
  const base = buildCountryData(c.code, 150, 1600, 'thermique', '2025-03-12', false, { vehiclePrice: 40000 })
  for (const f of RECOMMENDED) {
    if (!base[f]) gaps.recommended.push(`${c.code}: ${c.name} — manque « ${f} »`)
  }
  if (base.source_url && !/^https?:\/\//.test(base.source_url)) {
    gaps.url.push(`${c.code}: source_url invalide (${base.source_url})`)
  }
  // PHEV: does a SINGLE exemption entry mention both PHEV *and* a reduction,
  // yet the computed PHEV amount equals the thermique one? (unapplied rule)
  const phevEntry = (base.exemptions || []).find(e =>
    /phev/i.test(e) && /(-\s?\d+\s?%|réduit|reduced)/i.test(e))
  if (phevEntry) {
    const ther = buildCountryData(c.code, 150, 1600, 'thermique', '2025-03-12', false, { vehiclePrice: 40000 }).specific_penalty_amount
    const phev = buildCountryData(c.code, 150, 1600, 'phev', '2025-03-12', false, { vehiclePrice: 40000 }).specific_penalty_amount
    if (ther > 0 && ther === phev) {
      gaps.phev.push(`${c.code}: ${c.name} — réduction PHEV mentionnée mais montant identique au thermique (${ther}€)`)
    }
  }
}

console.log('\n═══ AUDIT COMPLÉTUDE DONNÉES — ' + COUNTRIES.length + ' pays ═══\n')
const section = (title, arr) => {
  console.log(`${arr.length === 0 ? '✅' : '⚠'} ${title} : ${arr.length}`)
  arr.forEach(x => console.log('   - ' + x))
}
section('Champs REQUIS manquants', gaps.missing)
section('Champs RECOMMANDÉS manquants (legal_ref)', gaps.recommended)
section('URLs sources invalides', gaps.url)
section('Réductions PHEV documentées mais non appliquées', gaps.phev)

const total = gaps.missing.length + gaps.url.length
console.log('\n' + (total === 0 ? '✅ Aucun champ requis manquant.' : `✗ ${total} défaut(s) bloquant(s).`))
process.exit(total > 0 ? 1 : 0)
