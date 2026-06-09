/**
 * Agrégation déterministe d'un stock de véhicules (Étape B de l'outil
 * « Analyse de stock partenaire »).
 *
 * Toute l'arithmétique est faite ICI, en JS — jamais par l'IA (peu fiable +
 * sensible à la température). Le résultat est passé tel quel au modèle, qui se
 * contente d'INTERPRÉTER les chiffres.
 *
 * Schéma véhicule canonique (commun au scraping La Centrale ET à l'import CSV) :
 *   { annonceId?, ref?, make, model, version?, year?, gearbox?, mileageKm?,
 *     fuel?, priceEur, marketBadge?, url?, dateInStock?, purchasePrice?, cote? }
 */

const PRICE_BANDS = [
  { key: '<20000',        min: 0,     max: 19999 },
  { key: '20000-24999',   min: 20000, max: 24999 },
  { key: '25000-29999',   min: 25000, max: 29999 },
  { key: '30000-34999',   min: 30000, max: 34999 },
  { key: '35000-39999',   min: 35000, max: 39999 },
  { key: '>=40000',       min: 40000, max: Infinity },
]

// Normalise une énergie libre en grande famille pour le décompte byFuel.
function fuelBucket(raw) {
  const s = (raw || '').toLowerCase()
  if (!s) return 'Autre'
  if (/gpl|lpg|gnv|bicarbur/.test(s)) return 'GPL'
  if (/[ée]lectri|electric|\bev\b|\bbev\b/.test(s)) return 'Électrique'
  if (/hybri/.test(s)) return 'Hybrides'
  if (/diesel|\bgo\b|hdi|tdi|dci|cdi/.test(s)) return 'Diesel'
  if (/essence|petrol|\bess\b|tce|tsi|tfsi|puretech/.test(s)) return 'Essence'
  return 'Autre'
}

function round(n) { return Math.round(n) }

function priceBandKey(price) {
  const b = PRICE_BANDS.find((band) => price >= band.min && price <= band.max)
  return b ? b.key : '>=40000'
}

function daysSince(iso) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 86400000))
}

function modelKey(v) {
  return [v.make, v.model].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toUpperCase()
}

function vehicleLabel(v) {
  return [v.make, v.model, v.version].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * @param {Array<object>} vehicles — véhicules normalisés au schéma canonique
 * @returns {object} statistiques agrégées
 */
export function computeStockStats(vehicles = []) {
  const list = Array.isArray(vehicles) ? vehicles.filter(Boolean) : []
  const prices = list.map((v) => Number(v.priceEur)).filter((p) => Number.isFinite(p) && p > 0)

  const total = list.length
  const totalValueEur = prices.reduce((a, b) => a + b, 0)
  const avgPriceEur = prices.length ? round(totalValueEur / prices.length) : 0

  const byMake = {}
  const byFuel = { Essence: 0, Diesel: 0, Hybrides: 0, GPL: 0, 'Électrique': 0, Autre: 0 }
  const byPriceBand = Object.fromEntries(PRICE_BANDS.map((b) => [b.key, 0]))
  const byBadge = { 'Très bonne affaire': 0, 'Bonne affaire': 0, 'Offre équitable': 0, 'Au dessus du marché': 0, 'null': 0 }
  const byModel = {}

  for (const v of list) {
    if (v.make) byMake[v.make] = (byMake[v.make] || 0) + 1
    byFuel[fuelBucket(v.fuel)] += 1
    const price = Number(v.priceEur)
    if (Number.isFinite(price) && price > 0) byPriceBand[priceBandKey(price)] += 1
    const badge = v.marketBadge && byBadge.hasOwnProperty(v.marketBadge) ? v.marketBadge : 'null'
    byBadge[badge] += 1
    const mk = modelKey(v)
    if (mk) byModel[mk] = (byModel[mk] || 0) + 1
  }

  // Modèles sur-représentés (≥ 4 unités) → risque d'immobilisation / cannibalisation.
  const duplicatesByModel = Object.fromEntries(
    Object.entries(byModel).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1])
  )

  // Top 5 kilométrages les plus élevés (repérage repricing).
  const mileageOutliersHigh = [...list]
    .filter((v) => Number.isFinite(Number(v.mileageKm)))
    .sort((a, b) => Number(b.mileageKm) - Number(a.mileageKm))
    .slice(0, 5)
    .map((v) => ({ label: vehicleLabel(v), mileageKm: Number(v.mileageKm), priceEur: Number(v.priceEur) || null, ref: v.ref || v.annonceId || null }))

  const stats = {
    total,
    totalValueEur,
    avgPriceEur,
    byMake,
    byFuel,
    byPriceBand,
    byBadge,
    evCount: byFuel['Électrique'],
    duplicatesByModel,
    mileageOutliersHigh,
    ageStats: null,
    marginStats: null,
    coteGap: null,
  }

  // ── Champs enrichis (voie CSV) — null si absents ──────────────────────────
  const withDate = list.filter((v) => v.dateInStock && daysSince(v.dateInStock) != null)
  if (withDate.length) {
    const ages = withDate.map((v) => ({ label: vehicleLabel(v), days: daysSince(v.dateInStock), ref: v.ref || null }))
    const avgDays = round(ages.reduce((a, b) => a + b.days, 0) / ages.length)
    stats.ageStats = {
      withDateCount: withDate.length,
      avgDays,
      over60: ages.filter((a) => a.days > 60).length,
      over90: ages.filter((a) => a.days > 90).length,
      oldest: [...ages].sort((a, b) => b.days - a.days).slice(0, 5),
    }
  }

  const withPurchase = list.filter((v) => Number.isFinite(Number(v.purchasePrice)) && Number.isFinite(Number(v.priceEur)))
  if (withPurchase.length) {
    const margins = withPurchase.map((v) => ({
      label: vehicleLabel(v),
      margin: round(Number(v.priceEur) - Number(v.purchasePrice)),
      ref: v.ref || null,
    }))
    const avgMargin = round(margins.reduce((a, b) => a + b.margin, 0) / margins.length)
    stats.marginStats = {
      withPurchaseCount: withPurchase.length,
      avgMargin,
      lowOrNegative: margins.filter((m) => m.margin < 1500).sort((a, b) => a.margin - b.margin).slice(0, 8),
    }
  }

  const withCote = list.filter((v) => Number.isFinite(Number(v.cote)) && Number.isFinite(Number(v.priceEur)) && Number(v.cote) > 0)
  if (withCote.length) {
    stats.coteGap = {
      withCoteCount: withCote.length,
      items: withCote.map((v) => {
        const gapEur = round(Number(v.priceEur) - Number(v.cote))
        return {
          label: vehicleLabel(v),
          priceEur: Number(v.priceEur),
          cote: Number(v.cote),
          gapEur,
          gapPct: Math.round((gapEur / Number(v.cote)) * 1000) / 10,
          ref: v.ref || null,
        }
      }).sort((a, b) => b.gapEur - a.gapEur),
    }
  }

  return stats
}
