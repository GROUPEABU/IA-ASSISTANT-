import { describe, it, expect } from 'vitest'
import { parseImportFile } from './importParser'

const csvFile = (text, name = 'stock.csv') =>
  new File([text], name, { type: 'text/csv' })

describe('parseImportFile (CSV)', () => {
  it('groups units by exact model and computes counts + price stats', async () => {
    const csv = [
      'Modèle;Prix;CO2;Km;Couleur;VIN',
      'Peugeot 308 GT;25000;120;15000;Gris;VF3ABC123',
      'Peugeot 308 GT;24000;118;22000;Blanc;VF3ABC124',
      'Renault Clio;15000;110;30000;Rouge;VF1XYZ999',
    ].join('\n')

    const res = await parseImportFile(csvFile(csv))

    expect(res.vehicleCount).toBe(3)
    expect(res.modelCount).toBe(2)
    expect(res.products).toHaveLength(2)

    const p308 = res.products.find((p) => /308/.test(p.fullName || p.model || ''))
    expect(p308).toBeTruthy()
    expect(p308._importStats.count).toBe(2)
    expect(p308._importStats.prixMin).toBe(24000)
    expect(p308._importStats.prixMax).toBe(25000)
  })

  it('detects a comma-delimited file too', async () => {
    const csv = [
      'Modèle,Prix,Couleur',
      'BMW X1,38000,Noir',
    ].join('\n')
    const res = await parseImportFile(csvFile(csv))
    expect(res.vehicleCount).toBe(1)
    expect(res.modelCount).toBe(1)
  })

  it('ignores rows without any usable data (footers, signatures)', async () => {
    const csv = [
      'Modèle;Prix;VIN',
      'Audi A3;30000;WAU123',
      'Cordialement;;',          // no price / vin / numeric → dropped
    ].join('\n')
    const res = await parseImportFile(csvFile(csv))
    expect(res.vehicleCount).toBe(1)
  })

  it('throws when no recognizable columns are present', async () => {
    const csv = 'foo;bar;baz\n1;2;3'
    await expect(parseImportFile(csvFile(csv))).rejects.toThrow()
  })
})
