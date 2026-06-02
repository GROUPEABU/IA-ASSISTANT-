/**
 * Import parser — CSV / Excel (.xlsx) → fiches produit + veille prix interne.
 *
 * Aucune dépendance lourde : le .xlsx (un zip de XML) est décompressé avec
 * `fflate` (déjà présent) puis lu via le DOMParser natif du navigateur.
 * Le CSV est parsé à la main (auto-détection du séparateur ; , ou tab).
 *
 * Le parseur est tolérant : il scanne le fichier pour trouver la ligne
 * d'en-têtes (le fichier peut contenir un préambule : adresse, n° commande…)
 * puis mappe les colonnes par correspondance floue des intitulés.
 */

// ── Correspondance intitulé de colonne → champ canonique ────────────────────
// L'ordre compte : prix_ht / prix_ttc avant le « prix » générique.
const FIELD_MATCHERS = [
  ['prix_ht',     /\bht\b|pv ?ht|prix ?ht|excl.*vat|hors ?taxe/i],
  ['prix_ttc',    /\bttc\b|pv ?ttc|prix ?ttc|incl.*vat/i],
  ['model',       /mod[eè]le|model|v[eé]hicule|d[eé]signation|designation|libell/i],
  ['immat',       /immat|mise.?en.?circ|1.?[èe]?re|date.?circ/i],
  ['kms',         /kilom|mileage|\bkms?\b|\bkm\b/i],
  ['couleur',     /couleur|color|teinte/i],
  ['co2',         /co.?2|co₂|[ée]mission/i],
  ['vin',         /\bvin\b|ch[aâ]ssis|chassis|n.?s[eé]rie|serial/i],
  ['equipements', /[eé]quip|option|accessoire/i],
  ['carburant',   /carbur|fuel|[eé]nergie|motoris/i],
  ['boite',       /bo[iî]te|gearbox|bva|bvm|transmiss/i],
  ['puissance',   /puiss|\bcv\b|\bkw\b|\bch\b|power|din/i],
  ['annee',       /ann[eé]e|year|mill[eé]sime/i],
  ['prix',        /\bprix\b|\bpv\b|\bprice\b|tarif|montant/i],
]

// ── Helpers numériques / dates ──────────────────────────────────────────────
function parseNum(v) {
  if (v == null) return null
  if (typeof v === 'number') return isFinite(v) ? v : null
  let s = String(v).trim().replace(/ /g, ' ').replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  s = s.replace(/[^0-9.\-]/g, '')
  const n = Number(s)
  return isFinite(n) && s !== '' ? n : null
}

// Excel stocke les dates en n° de série (epoch 1899-12-30, bug année 1900 inclus)
function excelSerialToDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400000))
}

function cellYear(cell) {
  if (!cell) return null
  const { value, isText } = cell
  if (!isText && value !== '' && isFinite(Number(value))) {
    const n = Number(value)
    if (n > 20000 && n < 80000) return excelSerialToDate(n).getFullYear()
    if (n >= 1990 && n <= 2100) return n
  }
  const s = String(value)
  let m = s.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/)
  if (m) { let y = Number(m[3]); if (y < 100) y += 2000; return y }
  m = s.match(/\b(?:19|20)\d{2}\b/)
  return m ? Number(m[0]) : null
}

function cellDateStr(cell) {
  if (!cell) return ''
  const { value, isText } = cell
  const n = Number(value)
  if (!isText && isFinite(n) && n > 20000 && n < 80000) {
    return excelSerialToDate(n).toLocaleDateString('fr-FR')
  }
  return String(value || '')
}

// ── Décodage .xlsx (zip + XML) ──────────────────────────────────────────────
function colToIndex(letters) {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return [...doc.getElementsByTagName('si')].map((si) =>
    [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')
  )
}

function sheetToGrid(xml, shared) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const grid = []
  for (const row of doc.getElementsByTagName('row')) {
    const arr = []
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || ''
      const col = colToIndex(ref.replace(/[0-9]/g, '') || 'A')
      const t = c.getAttribute('t')
      const vEl = c.getElementsByTagName('v')[0]
      const isEl = c.getElementsByTagName('is')[0]
      let value = '', isText = false
      if (t === 's' && vEl) { value = shared[Number(vEl.textContent)] ?? ''; isText = true }
      else if ((t === 'str' || t === 'inlineStr') && vEl) { value = vEl.textContent; isText = true }
      else if (isEl) { value = [...isEl.getElementsByTagName('t')].map((x) => x.textContent).join(''); isText = true }
      else if (vEl) { value = vEl.textContent; isText = false }
      arr[col] = { value, isText }
    }
    grid.push(arr)
  }
  return grid
}

async function parseXLSX(arrayBuffer) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(new Uint8Array(arrayBuffer))
  const sharedXml = files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : ''
  const shared = parseSharedStrings(sharedXml)
  const sheetPath = Object.keys(files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort()[0]
  if (!sheetPath) throw new Error('Feuille de calcul introuvable dans le fichier.')
  return sheetToGrid(strFromU8(files[sheetPath]), shared)
}

// ── Décodage CSV ────────────────────────────────────────────────────────────
function parseCSV(text) {
  const clean = text.replace(/^﻿/, '') // BOM
  const firstLine = clean.split(/\r?\n/)[0] || ''
  const counts = { ';': (firstLine.match(/;/g) || []).length,
                   ',': (firstLine.match(/,/g) || []).length,
                   '\t': (firstLine.match(/\t/g) || []).length }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

  const grid = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delim) { row.push({ value: field, isText: true }); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push({ value: field, isText: true }); grid.push(row); row = []; field = ''
    } else field += ch
  }
  if (field || row.length) { row.push({ value: field, isText: true }); grid.push(row) }
  return grid
}

// ── Détection en-têtes + mapping colonnes ───────────────────────────────────
function scoreHeaderRow(cells) {
  const texts = cells.map((c) => (c?.value || '').toString())
  let score = 0
  for (const [, re] of FIELD_MATCHERS) if (texts.some((t) => re.test(t))) score++
  return score
}

function detectHeaderRow(grid) {
  let best = -1, bestScore = 2 // au moins 3 colonnes reconnues
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    const s = scoreHeaderRow(grid[i] || [])
    if (s > bestScore) { bestScore = s; best = i }
  }
  return best
}

function buildColumnMap(headerCells) {
  const map = {}
  const used = new Set()
  headerCells.forEach((cell, idx) => {
    const label = (cell?.value || '').toString()
    if (!label) return
    for (const [field, re] of FIELD_MATCHERS) {
      if (!used.has(field) && re.test(label)) { map[field] = idx; used.add(field); break }
    }
  })
  return map
}

// ── Extraction depuis l'intitulé du modèle ──────────────────────────────────
function extractPower(model) {
  const m = String(model).match(/(\d{2,3})\s?(?:cv|ch|din|hp)\b/i)
  return m ? `${m[1]} ch` : null
}
function extractFuel(model) {
  const s = String(model)
  if (/\bphev|hybride? rechargeable|plug.?in/i.test(s)) return 'Hybride rechargeable'
  if (/\bhev\b|hybrid|full ?hybrid|e-?tech|e-?power|mhev|micro.?hybrid/i.test(s)) return 'Hybride'
  if (/\b(ev|bev|ze|eq|e-)\b|[eé]lectri|kwh/i.test(s)) return 'Électrique'
  if (/\b(tdi|hdi|bluehdi|dci|cdi|crdi|jtd|d-?4d| d\d{0,3}\b|diesel|blue ?dci)\b/i.test(s)) return 'Diesel'
  if (/\b(tsi|tfsi|tgdi|thp|puretech|mpi|vti|gdi|mhev|essence|t-?gdi|ecoboost|firefly)\b/i.test(s)) return 'Essence'
  return null
}
function extractGearbox(model) {
  if (/\b(bva|dsg|edc|eat\d?|s.?tronic|tiptronic|automat|auto|cvt|dct|pdk)\b/i.test(String(model))) return 'Automatique'
  if (/\b(bvm|manuelle?|manual)\b/i.test(String(model))) return 'Manuelle'
  return null
}
function extractBrand(model) {
  const TWO = /^(ALFA ROMEO|LAND ROVER|ASTON MARTIN|MERCEDES[- ]BENZ|DS AUTOMOBILES|ROLLS[- ]ROYCE)/i
  const m = String(model).trim().match(TWO)
  if (m) return m[1].toUpperCase()
  return String(model).trim().split(/\s+/)[0].toUpperCase()
}

// ── Mise en forme d'une ligne brute en véhicule normalisé ───────────────────
function normalizeRow(cells, colMap) {
  const get = (f) => (colMap[f] != null ? cells[colMap[f]] : undefined)
  const txt = (f) => (get(f)?.value ?? '').toString().trim()

  const model = txt('model')
  if (!model) return null

  return {
    model,
    couleur: txt('couleur'),
    vin: txt('vin'),
    equipements: txt('equipements'),
    carburant: txt('carburant'),
    boite: txt('boite'),
    kms: parseNum(txt('kms')),
    co2: parseNum(txt('co2')),
    prix_ht: parseNum(txt('prix_ht')),
    prix_ttc: parseNum(txt('prix_ttc')),
    prix: parseNum(txt('prix')),
    immatStr: cellDateStr(get('immat')),
    year: cellYear(get('immat')) || cellYear(get('annee')),
  }
}

function unitPrice(u) {
  return u.prix_ht ?? u.prix ?? u.prix_ttc ?? null
}

// ── Construction d'une fiche produit complète (schéma sûr, sans crash) ──────
function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function buildImportedProduct(modelKey, units) {
  const sample = units[0]
  const brand = extractBrand(sample.model)
  const displayModel = sample.model.replace(new RegExp('^' + brand, 'i'), '').trim() || sample.model
  const prices = units.map(unitPrice).filter((p) => p != null && p > 0)
  const co2s = units.map((u) => u.co2).filter((c) => c != null && c > 0)
  const kms = units.map((u) => u.kms).filter((k) => k != null && k >= 0)
  const years = units.map((u) => u.year).filter(Boolean)

  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const moy = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const co2Moy = co2s.length ? Math.round(co2s.reduce((a, b) => a + b, 0) / co2s.length) : 0
  const kmMoy = kms.length ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : null
  const year = years.length ? Math.max(...years) : new Date().getFullYear()

  const colors = [...new Set(units.map((u) => u.couleur).filter(Boolean))]
  const fuel = extractFuel(sample.model) || sample.carburant || 'N/C'
  const power = extractPower(sample.model) || sample.puissance || 'N/C'
  const gearbox = extractGearbox(sample.model) || sample.boite || 'N/C'
  const equipSrc = units.map((u) => u.equipements).find(Boolean) || ''
  const equipements = equipSrc
    ? equipSrc.split(/[;,]\s*/).map((e) => e.trim()).filter((e) => e.length > 1)
    : []

  const isHT = units.some((u) => u.prix_ht != null)
  const stats = { count: units.length, prixMin: min, prixMoy: moy, prixMax: max,
                  co2Moy, kmMoy, devise: 'EUR', priceBasis: isHT ? 'HT' : 'TTC' }

  const stock = units.map((u) => ({
    vin: u.vin || '—',
    kms: u.kms,
    couleur: u.couleur || '—',
    immat: u.immatStr || '—',
    prix_ht: u.prix_ht,
    prix_ttc: u.prix_ttc,
    prix: unitPrice(u),
  }))

  return {
    id: `imported-${slug(modelKey)}`,
    brand,
    model: displayModel,
    fullName: sample.model,
    year,
    segment: `Stock importé · ${units.length} véhicule${units.length > 1 ? 's' : ''}`,
    origin: brand,
    status: 'available',
    tagline: prices.length
      ? `${units.length} en stock · ${min.toLocaleString('fr-FR')}–${max.toLocaleString('fr-FR')} € ${stats.priceBasis}`
      : `${units.length} véhicule(s) importé(s)`,
    image: null,
    colors,
    finitions: [],
    specs: {
      motorisation: fuel,
      puissance: power,
      couple: 'N/C',
      transmission: gearbox,
      traction: 'N/C',
      co2_wltp: co2Moy,
      consommation: 'N/C',
      autonomie_wltp: 0,
      longueur: null, largeur: null, hauteur: null, empattement: null,
      coffre: null, reservoir: null, poids: null,
    },
    prix: { base: min, haut: max, devise: 'EUR' },
    equipements,
    concurrents: [],
    btob: { cibles: [], atouts: [], objections: [], remise_cible: 'N/C' },
    btoc: { cibles: [], atouts: [], objections: [], argument_prix: '' },
    marche: {
      part_marche_cible: 'N/C',
      croissance_segment: 'N/C',
      tendance: '',
      risques: '',
      opportunites: '',
    },
    _generated: true,
    _imported: true,
    _importStock: stock,
    _importStats: stats,
    _importedAt: new Date().toISOString(),
  }
}

// ── API publique ────────────────────────────────────────────────────────────
/**
 * Parse un fichier CSV/XLSX et renvoie les fiches produit regroupées par modèle.
 * @param {File} file
 * @returns {Promise<{products: object[], vehicleCount: number, modelCount: number}>}
 */
const MAX_IMPORT_BYTES = 25 * 1024 * 1024 // 25 Mo — garde-fou mémoire / XML bomb

export async function parseImportFile(file) {
  if (file?.size > MAX_IMPORT_BYTES) {
    throw new Error('Fichier trop volumineux (max 25 Mo).')
  }
  const name = (file.name || '').toLowerCase()
  let grid
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    grid = await parseXLSX(await file.arrayBuffer())
  } else if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') {
    grid = parseCSV(await file.text())
  } else {
    // Tentative : xlsx d'abord (binaire), sinon CSV
    try { grid = await parseXLSX(await file.arrayBuffer()) }
    catch { grid = parseCSV(await file.text()) }
  }

  const headerIdx = detectHeaderRow(grid)
  if (headerIdx < 0) {
    throw new Error("Impossible de reconnaître les colonnes. Vérifiez que le fichier contient au moins : Modèle, Prix, et idéalement CO2, Km, Couleur, VIN.")
  }
  const colMap = buildColumnMap(grid[headerIdx])
  if (colMap.model == null) {
    throw new Error("Colonne « Modèle » introuvable dans le fichier.")
  }

  const rows = []
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const v = normalizeRow(grid[i] || [], colMap)
    // Ligne valide = un modèle + au moins une donnée chiffrée ou un VIN.
    // Écarte les pieds de page / signatures (ex: « Cordialement, … »).
    if (v && (v.prix_ht != null || v.prix_ttc != null || v.prix != null || v.vin || v.co2 != null || v.kms != null)) {
      rows.push(v)
    }
  }
  if (rows.length === 0) throw new Error('Aucune ligne de véhicule exploitable trouvée.')

  // Regroupement par modèle exact
  const groups = new Map()
  for (const r of rows) {
    const key = r.model.replace(/\s+/g, ' ').trim().toUpperCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  const products = [...groups.entries()].map(([key, units]) => buildImportedProduct(key, units))
  return { products, vehicleCount: rows.length, modelCount: products.length }
}
