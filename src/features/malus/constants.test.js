import { describe, it, expect } from 'vitest'
import { getDaysInMonth, sevColor, sevLabel } from './constants'

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2025, '01')).toBe(31)
  })

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2025, '04')).toBe(30)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2025, '02')).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, '02')).toBe(29)
    expect(getDaysInMonth(2000, '02')).toBe(29)  // century leap year
    expect(getDaysInMonth(1900, '02')).toBe(28)  // century non-leap year
  })

  it('accepts numeric and string inputs', () => {
    expect(getDaysInMonth('2025', '03')).toBe(31)
    expect(getDaysInMonth(2025, 3)).toBe(31)
  })
})

describe('sevColor / sevLabel', () => {
  it('returns the right colour for known severities', () => {
    expect(sevColor('none')).toBe('#50E5E5')
    expect(sevColor('very_high')).toBe('#f87171')
  })

  it('returns a sensible fallback for unknown severities', () => {
    expect(sevColor('unknown')).toBe('#94a3b8')
    expect(sevLabel('unknown')).toBe('—')
  })

  it('returns French labels for known severities', () => {
    expect(sevLabel('none')).toBe('Aucun')
    expect(sevLabel('high')).toBe('Élevé')
  })
})
