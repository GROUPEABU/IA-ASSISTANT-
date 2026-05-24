import { describe, it, expect } from 'vitest'
import { extractJSON } from './claude'

describe('extractJSON', () => {
  describe('object mode (default)', () => {
    it('extracts a clean JSON object', () => {
      const result = extractJSON('{"a": 1, "b": 2}')
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('extracts a JSON object buried in prose', () => {
      const result = extractJSON('Voici le résultat:\n{"answer": 42}\nMerci.')
      expect(result).toEqual({ answer: 42 })
    })

    it('handles multi-line JSON objects', () => {
      const raw = `Voici:
{
  "name": "test",
  "value": 123
}`
      expect(extractJSON(raw)).toEqual({ name: 'test', value: 123 })
    })

    it('throws when no JSON object is found', () => {
      expect(() => extractJSON('no json here at all')).toThrow(/aucun JSON/)
    })

    it('throws on malformed JSON', () => {
      expect(() => extractJSON('{"broken: json}')).toThrow(/JSON malformé/)
    })
  })

  describe('array mode', () => {
    it('extracts a clean JSON array', () => {
      const result = extractJSON('[1, 2, 3]', 'array')
      expect(result).toEqual([1, 2, 3])
    })

    it('extracts an array of objects from prose', () => {
      const raw = 'Voici 10 objections:\n[{"q":"too expensive"},{"q":"slow delivery"}]\n.'
      const result = extractJSON(raw, 'array')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ q: 'too expensive' })
    })

    it('throws when no array is found', () => {
      expect(() => extractJSON('{"obj": 1}', 'array')).toThrow(/aucun JSON/)
    })
  })
})
