import { describe, it, expect } from 'vitest'
import {
  computeFR, getFRPeriod,
  buildCountryData, COUNTRIES,
  IMPORT_COUNTRIES, getCountryRequiredFields,
} from './malusWorld'

describe('getFRPeriod', () => {
  it('maps registration dates to the right fiscal period', () => {
    expect(getFRPeriod('2023-06-01')).toBe('2023')
    expect(getFRPeriod('2024-06-01')).toBe('2024')
    expect(getFRPeriod('2025-06-01')).toBe('2025')
    expect(getFRPeriod('2026-03-01')).toBe('2026')
    expect(getFRPeriod('2027-06-01')).toBe('2027')
  })

  it('defaults to 2025 when no date is given', () => {
    expect(getFRPeriod()).toBe('2025')
  })
})

describe('computeFR (malus CO₂ France)', () => {
  const D = '2025-03-12' // période 2025

  it('is exempt below the 2025 threshold (≤112 g)', () => {
    expect(computeFR(100, D)).toBe(0)
    expect(computeFR(112, D)).toBe(0)
  })

  it('caps at the 2025 maximum (≥193 g)', () => {
    expect(computeFR(193, D)).toBe(70000)
    expect(computeFR(250, D)).toBe(70000)
  })

  it('is always non-negative', () => {
    for (let g = 0; g <= 300; g += 5) {
      expect(computeFR(g, D)).toBeGreaterThanOrEqual(0)
    }
  })

  it('is monotonically non-decreasing with CO₂', () => {
    let prev = -1
    for (let g = 100; g <= 200; g++) {
      const v = computeFR(g, D)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('a heavier-emitting car never costs less than a cleaner one (across periods)', () => {
    for (const date of ['2023-06-01', '2024-06-01', '2025-06-01', '2026-03-01', '2027-06-01']) {
      expect(computeFR(180, date)).toBeGreaterThanOrEqual(computeFR(130, date))
    }
  })
})

describe('buildCountryData — shape & invariants for every country', () => {
  it('returns a usable result with a non-negative penalty for each country', () => {
    for (const c of COUNTRIES) {
      const r = buildCountryData(c.code, 150, 1500, 'thermique', '2025-03-12', false, {})
      expect(r, c.code).toBeTruthy()
      expect(typeof r.specific_penalty_amount, c.code).toBe('number')
      expect(Number.isFinite(r.specific_penalty_amount), c.code).toBe(true)
      expect(r.specific_penalty_amount, c.code).toBeGreaterThanOrEqual(0)
      expect(typeof r.tax_name, c.code).toBe('string')
      // advanced_params is optional (countries without extra inputs omit it),
      // but when present it must be an array — the UI treats missing as [].
      expect(r.advanced_params === undefined || Array.isArray(r.advanced_params), c.code).toBe(true)
    }
  })

  it('does not crash on edge inputs (0 g, very high g)', () => {
    for (const g of [0, 500]) {
      const r = buildCountryData('FR', g, 1500, 'thermique', '2025-03-12', false, {})
      expect(Number.isFinite(r.specific_penalty_amount)).toBe(true)
    }
  })
})

describe('COUNTRIES catalogue', () => {
  it('every entry has the required fields and a unique code', () => {
    const codes = new Set()
    for (const c of COUNTRIES) {
      expect(c.code).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.flag).toBeTruthy()
      expect(c.reliability).toBeTruthy()
      codes.add(c.code)
    }
    expect(codes.size).toBe(COUNTRIES.length)
  })
})

describe('getCountryRequiredFields', () => {
  it('returns an array of field keys', () => {
    expect(Array.isArray(getCountryRequiredFields('FR'))).toBe(true)
  })

  it('includes isImported for every import-decote country', () => {
    for (const code of IMPORT_COUNTRIES) {
      expect(getCountryRequiredFields(code), code).toContain('isImported')
    }
  })
})
