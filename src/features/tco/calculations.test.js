import { describe, it, expect, vi } from 'vitest'
import { calcTco } from './calculations'

// Mock the malus dependency to keep TCO tests independent of FR fiscal rules
vi.mock('@/utils/malus', () => ({
  getMalus: vi.fn(() => 0),
}))

const baseInputs = {
  prix:      30000,
  co2:       120,
  fuelType:  'thermique',
  conso:     6.5,        // L/100km
  maint:     1200,       // €/year
  years:     4,
  kmYear:    15000,
  fuelPrice: 1.85,
  elecPrice: 0.25,
}

describe('calcTco — thermique', () => {
  it('computes annual fuel cost correctly', () => {
    // 15000 km × 6.5 L/100km × 1.85 €/L = 1803.75 €/year
    // × 4 years = 7215 € (rounded)
    const { totalFuel } = calcTco(baseInputs)
    expect(totalFuel).toBe(7215)
  })

  it('multiplies maintenance by years', () => {
    const { totalMaint } = calcTco(baseInputs)
    expect(totalMaint).toBe(1200 * 4)
  })

  it('sums purchase price + malus + fuel + maintenance', () => {
    const { total } = calcTco(baseInputs)
    expect(total).toBe(30000 + 0 + 7215 + 4800)
  })
})

describe('calcTco — electric vehicle', () => {
  it('uses electricity price and kWh consumption', () => {
    // 15000 km × 17 kWh/100km × 0.25 €/kWh = 637.5 €/year
    // × 5 years = 3188 (rounded)
    const { totalFuel } = calcTco({
      ...baseInputs,
      fuelType: 'ev',
      conso:    17,
      years:    5,
    })
    expect(totalFuel).toBe(3188)
  })
})

describe('calcTco — PHEV', () => {
  it('blends 50% electric and 50% fuel cost', () => {
    // For PHEV: fuelPortion = 15000 × 2.4/100 × 1.85 × 0.5 = 333 €
    //          elecPortion = 15000 × 0.5 × 0.18 × 0.25     = 337.5 €
    //          annual ≈ 670.5 €/year × 4 years = 2682
    const { totalFuel } = calcTco({
      ...baseInputs,
      fuelType: 'phev',
      conso:    2.4,
    })
    expect(totalFuel).toBe(2682)
  })
})

describe('calcTco — edge cases', () => {
  it('handles empty/zero inputs without throwing', () => {
    expect(() => calcTco({
      prix: '', co2: '', fuelType: 'thermique', conso: '', maint: 0,
      years: 4, kmYear: 15000, fuelPrice: 1.85, elecPrice: 0.25,
    })).not.toThrow()
  })

  it('returns numeric values even with empty strings', () => {
    const result = calcTco({
      prix: '', co2: '', fuelType: 'thermique', conso: '', maint: 0,
      years: 4, kmYear: 15000, fuelPrice: 1.85, elecPrice: 0.25,
    })
    expect(result.total).toBe(0)
    expect(result.totalFuel).toBe(0)
  })
})
