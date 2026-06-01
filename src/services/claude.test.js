import { describe, it, expect } from 'vitest'
import { extractJSON } from './claude'

// Note: real callers always pass `kind` explicitly ('object' | 'array').
// These tests mirror that usage and the current error messages.
describe('extractJSON', () => {
  describe('object mode', () => {
    it('extracts a clean JSON object', () => {
      const result = extractJSON('{"a": 1, "b": 2}', 'object')
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('extracts a JSON object buried in prose', () => {
      const result = extractJSON('Voici le résultat:\n{"answer": 42}\nMerci.', 'object')
      expect(result).toEqual({ answer: 42 })
    })

    it('handles multi-line JSON objects', () => {
      const raw = `Voici:
{
  "name": "test",
  "value": 123
}`
      expect(extractJSON(raw, 'object')).toEqual({ name: 'test', value: 123 })
    })

    it('strips markdown code fences', () => {
      const raw = '```json\n{"ok": true}\n```'
      expect(extractJSON(raw, 'object')).toEqual({ ok: true })
    })

    it('throws when no JSON object is found', () => {
      expect(() => extractJSON('no json here at all', 'object')).toThrow(/no JSON detected/i)
    })

    it('throws on malformed JSON', () => {
      expect(() => extractJSON('{"broken: json}', 'object')).toThrow(/malformed JSON/i)
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
      expect(() => extractJSON('{"obj": 1}', 'array')).toThrow(/no JSON detected/i)
    })
  })
})
