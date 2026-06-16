import { describe, it, expect } from 'vitest'
import { mdToPlainText } from './mdToPlainText'

describe('mdToPlainText', () => {
  it('returns an empty string for falsy input', () => {
    expect(mdToPlainText('')).toBe('')
    expect(mdToPlainText(null)).toBe('')
    expect(mdToPlainText(undefined)).toBe('')
  })

  it('uppercases headings', () => {
    expect(mdToPlainText('## Mon titre')).toContain('MON TITRE')
  })

  it('flattens table rows and drops separator lines', () => {
    const md = '| Marque | Prix |\n| --- | --- |\n| BMW | 30 000 |'
    const out = mdToPlainText(md)
    expect(out).toContain('Marque — Prix')
    expect(out).toContain('BMW — 30 000')
    expect(out).not.toContain('---')
  })

  it('strips bold/italic markers', () => {
    expect(mdToPlainText('**gras** et *italique*')).toBe('gras et italique')
  })

  it('converts list markers to bullets', () => {
    expect(mdToPlainText('- premier\n- second')).toContain('• premier')
  })

  it('collapses excessive blank lines', () => {
    expect(mdToPlainText('a\n\n\n\nb')).toBe('a\n\nb')
  })
})
