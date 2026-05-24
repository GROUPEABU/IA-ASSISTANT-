import { describe, it, expect } from 'vitest'
import { interpolate } from './interpolate'

describe('interpolate', () => {
  it('replaces simple placeholders', () => {
    expect(interpolate('Hello {name}', { name: 'Alice' })).toBe('Hello Alice')
  })

  it('replaces multiple placeholders', () => {
    expect(interpolate('{n} of {total}', { n: 3, total: 10 })).toBe('3 of 10')
  })

  it('coerces numeric values to strings', () => {
    expect(interpolate('Count: {n}', { n: 42 })).toBe('Count: 42')
  })

  it('leaves unknown placeholders intact', () => {
    expect(interpolate('Hello {unknown}', { name: 'X' })).toBe('Hello {unknown}')
  })

  it('returns the template unchanged when no placeholders exist', () => {
    expect(interpolate('plain string', { name: 'X' })).toBe('plain string')
  })

  it('handles empty values object', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })
})
