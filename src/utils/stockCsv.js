/**
 * Import d'un export de stock partenaire (CSV / XLSX) → schéma véhicule
 * canonique commun à l'outil « Analyse de stock » (Voie 2 du brief).
 *
 * Zéro dépendance lourde : CSV parsé à la main (auto-détection ; , ou tab),
 * XLSX décompressé avec `fflate` (déjà présent) + DOMParser natif.
 *
 * Le CSV enrichi (date d'entrée en stock, prix d'achat, cote) débloque côté
 * agrégation l'ancienneté réelle, la marge et l'écart à la cote — données
 * impossibles à obtenir par scraping.
 */

const MAX_BYTES = 25 * 1024 * 1024 // 25 Mo

// ── Correspondance en-tête → champ canonique (tolérant casse/accents) ───────
// L'ordre compte (prix_vente avant « prix » générique ; prix_achat distinct).
const MATCHERS = [
  ['purchasePrice', /prix.?achat|achat.?ht|cout.?achat|buy.?price|prix.?revient/],
  ['priceEur',      /prix.?vente|prix.?ttc|pv.?ttc|prix.?affich|vente.?ttc|\bprix\b|\bpvc\b|\bprice\b|tarif/],
  ['cote',          /\bcote\b|argus|valeur.?marche/],
  ['dateInStock',   /date.?entr|mise.?en.?stock|entree.?stock|date.?stock|stock.?date|in.?stock/],
  ['make',          /\bmarque\b|\bmake\b|\bbrand\b/],
  ['model',         /\bmodele\b|\bmodel\b|\bvehicule\b|designation/],
  ['version',       /finition|version|\btrim\b|motoris/],
  ['year',          /\bannee\b|\byear\b|millesime/],
  ['mileageKm',     /kilometrage|mileage|\bkms?\b|\bkm\b/],
  ['fuel',          /energie|carburant|\bfuel\b|motoris/],
  ['gearbox',       /\bboite\b|gearbox|transmiss|\bbva\b|\bbvm\b/],
  ['ref',           /reference|\bref\b|\bsku\b|\bstock\b|\bvin\b|chassis/],
  ['url',           /\burl\b|\blien\b|\blink\b|annonce/],
]

const REQUIRED = ['make', 'model', 'year', 'mileageKm', 'priceEur']

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function parseNum(v) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim().replace(/[\s €]/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  s = s.replace(/[^0-9.\-]/g, '')
  const n = Number(s)
  return s !== '' && Number.isFinite(n) ? n : null
}

// Date → ISO (YYYY-MM-DD). Accepte YYYY-MM-DD et DD/MM/YYYY.
function parseDate(v) {
  const s = String(v || '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    let y = Number(m[3]); if (y < 100) y += 2000
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10)
}

// ── CSV → grille de chaînes ─────────────────────────────────────────────────
function parseCSV(text) {
  const clean = text.replace(/^﻿/, '')
  const first = clean.split(/\r?\n/)[0] || ''
  const counts = { ';': (first.match(/;/g) || []).length, ',': (first.match(/,/g) || []).length, '\t': (first.match(/\t/g) || []).length }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ','
  const grid = []
  let row = [], field = '', q = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (q) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') q = false
      else field += ch
    } else if (ch === '"') q = true
    else if (ch === delim) { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field); grid.push(row); row = []; field = ''
    } else field += ch
  }
  if (field || row.length) { row.push(field); grid.push(row) }
  return grid
}

// ── XLSX → grille de chaînes (fflate + DOMParser) ───────────────────────────
function colToIndex(letters) { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1 }

async function parseXLSX(arrayBuffer) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(new Uint8Array(arrayBuffer))
  const sharedXml = files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : ''
  const shared = sharedXml
    ? [...new DOMParser().parseFromString(sharedXml, 'application/xml').getElementsByTagName('si')]
        .map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''))
    : []
  const sheetPath = Object.keys(files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort()[0]
  if (!sheetPath) throw new Error('Feuille de calcul introuvable.')
  const doc = new DOMParser().parseFromString(strFromU8(files[sheetPath]), 'application/xml')
  const grid = []
  for (const row of doc.getElementsByTagName('row')) {
    const arr = []
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || ''
      const col = colToIndex(ref.replace(/[0-9]/g, '') || 'A')
      const t = c.getAttribute('t')
      const vEl = c.getElementsByTagName('v')[0]
      const isEl = c.getElementsByTagName('is')[0]
      let value = ''
      if (t === 's' && vEl) value = shared[Number(vEl.textContent)] ?? ''
      else if ((t === 'str' || t === 'inlineStr') && vEl) value = vEl.textContent
      else if (isEl) value = [...isEl.getElementsByTagName('t')].map((x) => x.textContent).join('')
      else if (vEl) value = vEl.textContent
      arr[col] = value
    }
    grid.push(arr)
  }
  return grid
}

// ── Détection en-têtes + mapping ─────────────────────────────────────────────
function buildColumnMap(headerCells) {
  const map = {}
  const used = new Set()
  headerCells.forEach((cell, idx) => {
    const label = norm(cell)
    if (!label) return
    for (const [field, re] of MATCHERS) {
      if (!used.has(field) && re.test(label)) { map[field] = idx; used.add(field); break }
    }
  })
  return map
}

function detectHeaderRow(grid) {
  let best = -1, bestScore = 2
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const map = buildColumnMap(grid[i] || [])
    const score = Object.keys(map).length
    if (score > bestScore) { bestScore = score; best = i }
  }
  return best
}

/**
 * Lit un fichier CSV/XLSX et renvoie la grille brute de chaînes, sans
 * interprétation des colonnes. Sert aussi de base à la lecture adaptative
 * (smartImport) quand la détection de colonnes échoue.
 * @param {File} file
 * @returns {Promise<string[][]>}
 */
export async function fileToGrid(file) {
  if (!file) throw new Error('Aucun fichier fourni.')
  if (file.size > MAX_BYTES) throw new Error('Fichier trop volumineux (max 25 Mo).')

  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    return parseXLSX(await file.arrayBuffer())
  }
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') {
    return parseCSV(await file.text())
  }
  try { return await parseXLSX(await file.arrayBuffer()) }
  catch { return parseCSV(await file.text()) }
}

/**
 * @param {File} file
 * @returns {Promise<{ vehicles: object[], ignored: number, dealer: object }>}
 */
export async function parseStockFile(file) {
  const grid = await fileToGrid(file)

  const headerIdx = detectHeaderRow(grid)
  if (headerIdx < 0) {
    throw new Error('Colonnes non reconnues. En-têtes attendus : marque, modele, annee, kilometrage, prix_vente_ttc (et idéalement date_entree_stock, prix_achat, cote).')
  }
  const colMap = buildColumnMap(grid[headerIdx])
  const cell = (cells, f) => (colMap[f] != null ? (cells[colMap[f]] ?? '') : '')

  const vehicles = []
  let ignored = 0
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i] || []
    const v = {
      make: String(cell(cells, 'make') || '').trim().toUpperCase(),
      model: String(cell(cells, 'model') || '').trim(),
      version: String(cell(cells, 'version') || '').trim() || null,
      year: parseNum(cell(cells, 'year')),
      mileageKm: parseNum(cell(cells, 'mileageKm')),
      fuel: String(cell(cells, 'fuel') || '').trim() || null,
      gearbox: String(cell(cells, 'gearbox') || '').trim() || null,
      priceEur: parseNum(cell(cells, 'priceEur')),
      purchasePrice: parseNum(cell(cells, 'purchasePrice')),
      cote: parseNum(cell(cells, 'cote')),
      dateInStock: parseDate(cell(cells, 'dateInStock')),
      ref: String(cell(cells, 'ref') || '').trim() || null,
      url: String(cell(cells, 'url') || '').trim() || null,
      marketBadge: null, // pas de positionnement place de marché en import CSV
    }
    const complete = REQUIRED.every((f) => v[f] != null && v[f] !== '')
    if (complete) vehicles.push(v)
    else if (v.make || v.model || v.priceEur != null) ignored += 1
  }

  if (vehicles.length === 0) {
    throw new Error('Aucune ligne exploitable. Vérifiez que marque, modele, annee, kilometrage et prix_vente_ttc sont remplis.')
  }

  return { vehicles, ignored, dealer: { id: null, name: '', url: '', vehicleCount: vehicles.length } }
}
