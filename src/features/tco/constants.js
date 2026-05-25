/**
 * Constants and helpers for the TCO (Total Cost of Ownership) calculator.
 */

export const MAINT_TIERS = [
  { k: 'low',     labelKey: 'tco_tier_low',     thermique: 800,  hybride: 900,  phev: 1000, ev: 600  },
  { k: 'mid',     labelKey: 'tco_tier_mid',     thermique: 1200, hybride: 1400, phev: 1500, ev: 800  },
  { k: 'premium', labelKey: 'tco_tier_premium', thermique: 2000, hybride: 2200, phev: 2400, ev: 1400 },
]

export const FUEL_LABEL_KEYS = {
  thermique: 'malus_fuel_thermal',
  hybride:   'malus_fuel_hybrid',
  phev:      'malus_fuel_phev',
  ev:        'malus_fuel_ev',
}

export const COLORS = ['#50E5E5', '#7DD3FC', '#a78bfa', '#fb923c']

export const emptyVehicle = (id) => ({
  id,
  nom:      '',
  prix:     '',
  co2:      '',
  fuelType: 'thermique',
  conso:    '',
  maint:    '',
  tier:     'mid',
  open:     true,
})

export function getMaintDefault(fuelType, tier) {
  const t = MAINT_TIERS.find(x => x.k === tier) || MAINT_TIERS[1]
  return t[fuelType] || t.thermique
}
