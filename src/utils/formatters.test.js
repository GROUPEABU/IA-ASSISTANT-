import { describe, it, expect } from 'vitest'
import { fmtEur, fmtRange } from './formatters'

// toLocaleString('fr-FR') groupe avec une espace insécable (U+202F/U+00A0) :
// on normalise toutes les espaces pour des assertions stables.
const norm = (s) => s.replace(/\s/g, ' ')

describe('fmtEur', () => {
  it('formats integers with grouped thousands and a euro suffix', () => {
    expect(norm(fmtEur(12345))).toBe('12 345 €')
  })

  it('defaults nullish/NaN values to "0 €"', () => {
    expect(norm(fmtEur(undefined))).toBe('0 €')
    expect(norm(fmtEur(null))).toBe('0 €')
    expect(norm(fmtEur(NaN))).toBe('0 €')
  })
})

describe('fmtRange', () => {
  it('shows a single value when min === max', () => {
    expect(norm(fmtRange(1000, 1000))).toBe('1 000 €')
  })

  it('shows a single value when max is missing', () => {
    expect(norm(fmtRange(1000))).toBe('1 000 €')
  })

  it('shows a dash-separated range when min and max differ', () => {
    expect(norm(fmtRange(1000, 2000))).toBe('1 000 € – 2 000 €')
  })
})
