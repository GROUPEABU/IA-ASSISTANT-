import { getMalus } from '@/utils/malus'

/**
 * Computes the Total Cost of Ownership breakdown for a single vehicle.
 *
 * For PHEV vehicles we assume a balanced 50/50 fuel/electric usage and
 * a typical EV consumption of 0.18 kWh/km for the electric portion.
 *
 * @param {object}  input
 * @param {number}  input.prix       — purchase price (€)
 * @param {number}  input.co2        — CO₂ emissions (g/km)
 * @param {string}  input.fuelType   — 'thermique' | 'hybride' | 'phev' | 'ev'
 * @param {number}  input.conso      — consumption (L/100km or kWh/100km for EV)
 * @param {number}  input.maint      — annual maintenance cost (€)
 * @param {number}  input.years      — ownership duration in years
 * @param {number}  input.kmYear     — annual mileage
 * @param {number}  input.fuelPrice  — fuel price (€/L)
 * @param {number}  input.elecPrice  — electricity price (€/kWh)
 * @returns {{ malus: number, totalFuel: number, totalMaint: number, total: number }}
 */
export function calcTco({ prix, co2, fuelType, conso, maint, years, kmYear, fuelPrice, elecPrice }) {
  const p    = Number(prix) || 0
  const c    = Number(co2) || 0
  const cons = Number(conso) || 0
  const malus = getMalus(c, p)

  const annualFuel = computeAnnualFuelCost({ fuelType, cons, kmYear, fuelPrice, elecPrice })
  const totalFuel  = Math.round(annualFuel * years)
  const totalMaint = Number(maint) * years
  const total      = p + malus + totalFuel + totalMaint

  return { malus, totalFuel, totalMaint, total }
}

const PHEV_ELECTRIC_RATIO = 0.5     // fraction of km driven electric
const PHEV_ELEC_CONS_KWH_PER_KM = 0.18

function computeAnnualFuelCost({ fuelType, cons, kmYear, fuelPrice, elecPrice }) {
  if (fuelType === 'ev') {
    return (kmYear * cons / 100) * elecPrice
  }
  if (fuelType === 'phev') {
    const fuelPortion = (kmYear * cons / 100) * fuelPrice * (1 - PHEV_ELECTRIC_RATIO)
    const elecPortion = kmYear * PHEV_ELECTRIC_RATIO * PHEV_ELEC_CONS_KWH_PER_KM * elecPrice
    return fuelPortion + elecPortion
  }
  return (kmYear * cons / 100) * fuelPrice
}
