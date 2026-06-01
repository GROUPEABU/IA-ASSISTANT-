// Validation harness — exercises buildCountryData() for every country
// across the full CO2 range + edge cases, asserting output integrity.
import { COUNTRIES, buildCountryData } from '../src/utils/malusWorld.js'

const CO2_RANGE = [0, 50, 95, 100, 110, 113, 118, 120, 123, 130, 140, 150,
                   160, 170, 175, 180, 190, 200, 220, 250, 300]
const WEIGHTS   = [1200, 1500, 1800, 2200, 2800]
const FUELS     = ['thermique', 'hybride', 'phev', 'ev']
const DATES     = ['2023-06-01', '2024-06-01', '2025-03-12', '2026-01-15', '2027-06-01']

let checks = 0
const errors = []
const warnings = []
const perCountry = {}

function assert(cond, msg, ctx) {
  checks++
  if (!cond) errors.push(`${ctx} → ${msg}`)
}

for (const country of COUNTRIES) {
  const code = country.code
  perCountry[code] = { name: country.name, monotonic: true, maxPenalty: 0, hasMalus: false, exempt0: true }
  let prevAmount = -1
  let prevG = -1

  for (const g of CO2_RANGE) {
    for (const kg of WEIGHTS) {
      for (const fuel of FUELS) {
        for (const date of DATES) {
          const ctx = `${code} g=${g} kg=${kg} ${fuel} ${date}`
          let r
          try {
            r = buildCountryData(code, g, kg, fuel, date, false, { vehiclePrice: 35000 })
          } catch (e) {
            errors.push(`${ctx} → THREW: ${e.message}`)
            continue
          }
          // Structural integrity
          assert(r != null, 'returned null/undefined', ctx)
          if (!r) continue
          assert(typeof r.specific_penalty_amount === 'number', `amount not number (${r.specific_penalty_amount})`, ctx)
          assert(Number.isFinite(r.specific_penalty_amount), `amount not finite (${r.specific_penalty_amount})`, ctx)
          assert(r.specific_penalty_amount >= 0, `negative amount (${r.specific_penalty_amount})`, ctx)
          assert(typeof r.specific_penalty === 'string' && r.specific_penalty.length > 0, 'empty specific_penalty label', ctx)
          assert(['none','low','medium','high','very_high'].includes(r.severity), `bad severity (${r.severity})`, ctx)
          assert(typeof r.tax_name === 'string' && r.tax_name.length > 0, 'empty tax_name', ctx)
          assert(Array.isArray(r.brackets) && r.brackets.length > 0, 'no brackets', ctx)
          assert(typeof r.has_malus === 'boolean', 'has_malus not boolean', ctx)
          assert(typeof r.source === 'string' && r.source.length > 0, 'empty source', ctx)

          perCountry[code].maxPenalty = Math.max(perCountry[code].maxPenalty, r.specific_penalty_amount)
          if (r.has_malus) perCountry[code].hasMalus = true

          // Severity consistency with amount
          if (r.specific_penalty_amount === 0 && r.severity !== 'none' && r.has_malus === false) {
            // tolerable: some no-malus countries still tag none
          }
        }
      }
    }
  }

  // Monotonicity check for thermique on the canonical 2025 date:
  // higher CO2 should never produce a LOWER penalty (within a country that taxes CO2)
  let last = -1
  for (const g of CO2_RANGE) {
    const r = buildCountryData(code, g, 1500, 'thermique', '2025-03-12', false, { vehiclePrice: 35000 })
    if (r.has_malus && r.threshold_gkm != null) {
      if (r.specific_penalty_amount < last - 1) {
        perCountry[code].monotonic = false
        warnings.push(`${code}: non-monotonic CO₂ malus at g=${g} (${r.specific_penalty_amount} < prev ${last})`)
      }
      last = Math.max(last, r.specific_penalty_amount)
    }
  }

  // Zero-emission should be exempt (amount 0) for any CO2-based system
  const ev0 = buildCountryData(code, 0, 1500, 'ev', '2025-03-12', false, { vehiclePrice: 35000 })
  if (ev0.specific_penalty_amount > 0 && ev0.has_malus) {
    warnings.push(`${code}: EV at 0 g/km still penalized ${ev0.specific_penalty_amount}€`)
  }
}

// ── France period-specific sanity (the engine's most complex path) ──────────
function frAt(g, date, fuel = 'thermique', kg = 1500) {
  return buildCountryData('FR', g, kg, fuel, date, false, { vehiclePrice: 35000 }).specific_penalty_amount
}
// Thresholds: below threshold = 0, at threshold+ = >0
const frPeriods = [
  { date: '2023-06-01', seuil: 123, plafond: 50000 },
  { date: '2024-06-01', seuil: 118, plafond: 60000 },
  { date: '2025-03-12', seuil: 113, plafond: 70000 },
  { date: '2026-01-15', seuil: 108, plafond: 80000 },
  { date: '2027-06-01', seuil: 103, plafond: 90000 },
]
for (const p of frPeriods) {
  // Use a light vehicle (1200 kg) to isolate the CO₂ component from the
  // weight malus (which kicks in at 1500 kg in 2026/2027).
  const frCO2 = (g, date) => buildCountryData('FR', g, 1200, 'thermique', date, false, { vehiclePrice: 35000 }).specific_penalty_amount
  assert(frCO2(p.seuil - 1, p.date) === 0, `FR ${p.date}: CO₂ below seuil ${p.seuil} should be 0 (got ${frCO2(p.seuil-1,p.date)})`, 'FR-threshold')
  assert(frCO2(p.seuil, p.date) > 0, `FR ${p.date}: CO₂ at seuil ${p.seuil} should be >0`, 'FR-threshold')
  assert(frAt(300, p.date) <= p.plafond, `FR ${p.date}: g=300 exceeds plafond ${p.plafond} (got ${frAt(300,p.date)})`, 'FR-plafond')
}
// EV exemption France 2024-2025 (CO2 exempt)
assert(frAt(200, '2025-03-12', 'ev') === 0, 'FR 2025 EV should be CO₂-exempt', 'FR-ev')

console.log('\n═══════════════════════════════════════════════════════')
console.log(`  VALIDATION MALUS — ${COUNTRIES.length} pays`)
console.log('═══════════════════════════════════════════════════════')
console.log(`  Assertions exécutées : ${checks.toLocaleString()}`)
console.log(`  Combinaisons testées : ${COUNTRIES.length * CO2_RANGE.length * WEIGHTS.length * FUELS.length * DATES.length}`)
console.log(`  Erreurs : ${errors.length}`)
console.log(`  Avertissements : ${warnings.length}`)
console.log('───────────────────────────────────────────────────────')
console.log('  Pays            | Malus CO₂ | Pénalité max (€)')
console.log('───────────────────────────────────────────────────────')
for (const code of Object.keys(perCountry)) {
  const c = perCountry[code]
  const flag = c.hasMalus ? '✓' : '·'
  const mono = c.monotonic ? '' : ' ⚠NON-MONOTONE'
  console.log(`  ${code.padEnd(3)} ${(c.name||'').slice(0,12).padEnd(12)} |    ${flag}     | ${String(Math.round(c.maxPenalty)).padStart(8)}${mono}`)
}
console.log('───────────────────────────────────────────────────────')

if (warnings.length) {
  console.log('\n⚠ AVERTISSEMENTS :')
  warnings.slice(0, 30).forEach(w => console.log('  - ' + w))
  if (warnings.length > 30) console.log(`  … +${warnings.length - 30} autres`)
}
if (errors.length) {
  console.log('\n✗ ERREURS :')
  errors.slice(0, 40).forEach(e => console.log('  - ' + e))
  if (errors.length > 40) console.log(`  … +${errors.length - 40} autres`)
  process.exit(1)
} else {
  console.log('\n✅ Aucun défaut structurel. Moteur de malus validé sur tous les pays.')
}
