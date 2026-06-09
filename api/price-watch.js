// Vercel Edge Function — Construit les URLs de référence (La Centrale, etc.).
// Le scraping est abandonné (proxy systématiquement bloqué 403) : la donnée
// live provient désormais de l'outil web_search de Claude côté client.
export const config = { runtime: 'edge' }

// Tokens de motorisation / finition / boîte à retirer du nom de modèle pour
// retrouver le NOM COMMERCIAL réel attendu par La Centrale & AutoScout24.
// Ex : "C5 HYBRID 145 CV AIRCROSS" → "C5 AIRCROSS".
const NOISE_TOKENS = [
  'HYBRID', 'HYBRIDE', 'MHEV', 'PHEV', 'HEV', 'MICRO-HYBRID', 'E-TECH', 'ETECH',
  'BLUEHDI', 'PURETECH', 'HDI', 'TDI', 'TSI', 'TFSI', 'DCI', 'CDI', 'CRDI',
  'VTI', 'THP', 'TCE', 'SCE', 'MULTIAIR', 'BOOSTERJET',
  'EAT', 'EAT6', 'EAT8', 'BVA', 'BVM', 'DSG', 'DCT', 'CVT', 'STRONIC', 'TIPTRONIC',
  'GPL', 'E85', 'ETHANOL', 'ESSENCE', 'DIESEL', 'ELECTRIQUE', 'ELECTRIC', 'ELEC',
]

// Retire motorisation / puissance / cylindrée d'un libellé de modèle, en
// préservant les vrais identifiants modèle (308, 3008, C5, A3, ID.4…).
function cleanModelName(raw) {
  if (!raw) return ''
  let s = ' ' + raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' '
  // Puissance : "145 CV", "150CH", "85 KW", "190 HP"
  s = s.replace(/\s\d{2,3}\s?(CV|CH|KW|HP)\b/g, ' ')
  // Cylindrée : "1.5", "2,0", "1.6L", "2.0 L"
  s = s.replace(/\s\d[.,]\d\s?L?\b/g, ' ')
  // Mots-clés motorisation / boîte
  NOISE_TOKENS.forEach(w => { s = s.replace(new RegExp('\\s' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), ' ') })
  s = s.replace(/\s+/g, ' ').trim()
  // Retire les puissances "nues" restantes (2-3 chiffres) qui ne sont PAS le
  // 1er token : un nom commercial commence par son identifiant (308, C5…), la
  // puissance vient après. On garde les modèles à 1 chiffre (Model 3, Mazda 6).
  const tokens = s.split(' ').filter((tok, i) => !(i > 0 && /^\d{2,3}$/.test(tok)))
  s = tokens.join(' ').trim()
  // Si on a tout retiré par erreur, on revient au libellé d'origine.
  return s || raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function normCode(str) {
  return str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function normSlug(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').trim()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)

  // ── Mode « analyse de stock » (greffé ici car les NOUVEAUX fichiers /api ne
  // sont pas enregistrés par le déploiement ; cette fonction l'est déjà). ─────
  const stockUrl = searchParams.get('stockUrl')
  if (stockUrl) return handleStock(stockUrl)
  const s = (k, max = 100) => (searchParams.get(k) || '').trim().slice(0, max)
  const make        = s('make')
  const model       = s('model')
  const finition    = s('finition')
  const carrosserie = s('carrosserie', 20)
  const type        = ['vo', 'vn'].includes(s('type', 5)) ? s('type', 5) : 'vo'
  const yearMin     = s('yearMin', 4).replace(/\D/g, '')
  const yearMax     = s('yearMax', 4).replace(/\D/g, '')
  const mileageMin  = s('mileageMin', 7).replace(/\D/g, '')
  const mileageMax  = s('mileageMax', 7).replace(/\D/g, '')
  const fuel        = s('fuel', 5)
  const gearbox     = s('gearbox', 5)

  if (!make && !model) {
    return new Response(JSON.stringify({ error: 'make ou model requis' }), { status: 400 })
  }

  // Nom commercial nettoyé (sans motorisation/finition) — c'est ce que les
  // portails attendent. La motorisation reste gérée par la recherche web.
  const cleanModel = cleanModelName(model)
  const makeCode  = normCode(make)
  const modelCode = normCode(cleanModel)
  const makeSlug  = normSlug(make)
  const modelSlug = normSlug(cleanModel)

  // Mapping carburant interne → énumération La Centrale (energies).
  const LC_ENERGIES = { ES: 'ess', GO: 'die', EL: 'elec', HY: 'hyb', GH: 'hyb-rech', GP: 'gpl' }
  const lcEnergy = LC_ENERGIES[normCode(fuel)] || ''

  // La Centrale — format réel : makesModelsCommercialNames=MARQUE::MODELE
  // On ne garde que les paramètres dont le format est fiable (modèle, année,
  // km, énergie mappée). Les codes boîte/carrosserie internes ne correspondent
  // pas à l'énumération du site et généraient des filtres « non reconnus » +
  // 0 résultat : on les laisse à l'utilisateur sur place.
  const makesParam = makeCode && modelCode ? `${makeCode}::${modelCode}` : makeCode || modelCode
  const cParams = [`makesModelsCommercialNames=${encodeURIComponent(makesParam)}`]
  if (type === 'vn') cParams.push('isNew=true')
  if (yearMin)     cParams.push(`yearMin=${encodeURIComponent(yearMin)}`)
  if (yearMax)     cParams.push(`yearMax=${encodeURIComponent(yearMax)}`)
  if (mileageMin)  cParams.push(`mileageMin=${encodeURIComponent(mileageMin)}`)
  if (mileageMax)  cParams.push(`mileageMax=${encodeURIComponent(mileageMax)}`)
  if (lcEnergy)    cParams.push(`energies=${encodeURIComponent(lcEnergy)}`)
  const centraleUrl = `https://www.lacentrale.fr/listing?${cParams.join('&')}`

  const lbcParts = [make, cleanModel ? `"${cleanModel}"` : '', finition ? `"${finition}"` : '', yearMin || ''].filter(Boolean).join(' ')
  const lbcUrl = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(lbcParts)}&sort=price&order=asc`

  const asParams = []
  if (type === 'vn') asParams.push('atype=N')
  if (yearMin)    asParams.push(`fregfrom=${yearMin}`)
  if (yearMax)    asParams.push(`fregto=${yearMax}`)
  if (mileageMin) asParams.push(`kmfrom=${mileageMin}`)
  if (mileageMax) asParams.push(`kmto=${mileageMax}`)
  const asQuery = asParams.length ? `?${asParams.join('&')}` : ''
  const autoScoutUrl = makeSlug && modelSlug
    ? `https://www.autoscout24.fr/lst/${makeSlug}/${modelSlug}${asQuery}` : null

  const caraUrl = makeSlug && modelSlug
    ? `https://www.caradisiac.com/occasion/${makeSlug}/${modelSlug}/` : null

  const sources = [
    { name: 'La Centrale', url: centraleUrl },
    { name: 'Le Bon Coin', url: lbcUrl },
    ...(autoScoutUrl ? [{ name: 'AutoScout24', url: autoScoutUrl }] : []),
    ...(caraUrl ? [{ name: 'Caradisiac', url: caraUrl }] : []),
  ]

  return new Response(
    JSON.stringify({
      sources,
      hasLiveData: false, // la donnée live vient de web_search côté client
      fetchedAt: new Date().toISOString(),
      centraleUrl,
      filters: { make, model, finition, carrosserie, type, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYSE DE STOCK — scraping d'un showroom pro La Centrale (greffé ici).
// En cas de blocage anti-bot (403 fréquent depuis Vercel), renvoie un JSON
// d'erreur explicite pour que l'UI bascule sur l'import CSV.
// ════════════════════════════════════════════════════════════════════════════
const STOCK_MAX_PAGES = 15
const STOCK_DELAY_MS = 180
const stockSleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stockNum = (s) => parseInt(String(s).replace(/[\s .]/g, ''), 10)
const STOCK_FUELS = ['Bicarburation essence / gpl', 'Hybrides', 'Électrique', 'Electrique', 'Essence', 'Diesel']
const STOCK_BADGES = ['Très bonne affaire', 'Bonne affaire', 'Offre équitable', 'Au dessus du marché']

function stockJson(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  })
}
function stockStrip(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim()
}
function stockFuel(text) {
  for (const f of STOCK_FUELS) if (text.toLowerCase().includes(f.toLowerCase())) return f === 'Electrique' ? 'Électrique' : f
  return null
}
function stockBadge(text) {
  for (const b of STOCK_BADGES) if (text.includes(b)) return b
  return null
}
function stockCard(text, annonceId, url) {
  const yearM = text.match(/\b(20\d{2})\b/)
  const kmM = text.match(/([\d\s ]{2,})\s*km\b/i)
  const priceM = text.match(/([\d\s ]{3,})\s*€/)
  const gearbox = /\bauto(matique)?\b/i.test(text) ? 'Auto' : /\bmanuelle?\b/i.test(text) ? 'Manuelle' : null
  const head = text.split(/\b20\d{2}\b/)[0].trim()
  const parts = head.split(/\s+/)
  return {
    annonceId,
    make: parts[0] ? parts[0].toUpperCase() : null,
    model: parts.slice(1).join(' ').trim() || null,
    version: null,
    year: yearM ? Number(yearM[1]) : null,
    gearbox,
    mileageKm: kmM ? stockNum(kmM[1]) : null,
    fuel: stockFuel(text),
    priceEur: priceM ? stockNum(priceM[1]) : null,
    marketBadge: stockBadge(text),
    url,
  }
}
function stockParse(html) {
  let name = ''
  const ogM = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (ogM) name = ogM[1].trim()
  if (!name) { const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) name = stockStrip(h1[1]) }
  let total = null
  const totM = stockStrip(html).match(/([\d\s ]{1,7})\s*annonces?\b/i)
  if (totM) { const n = stockNum(totM[1]); if (Number.isFinite(n) && n > 0) total = n }
  const vehicles = []
  const seen = new Set()
  const re = /<a\b[^>]*href=["']([^"']*\/annonce\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const href = m[1], annonceId = m[2]
    if (seen.has(annonceId)) continue
    const text = stockStrip(m[3])
    if (text.length < 6) continue
    const url = href.startsWith('http') ? href : `https://www.lacentrale.fr${href.startsWith('/') ? '' : '/'}${href}`
    const v = stockCard(text, annonceId, url)
    if (v.make || v.priceEur) { vehicles.push(v); seen.add(annonceId) }
  }
  return { name, total, vehicles }
}

async function handleStock(rawUrlIn) {
  let raw = (rawUrlIn || '').trim()
  try { raw = decodeURIComponent(raw) } catch { /* garde tel quel */ }
  const idM = raw.match(/(C\d{4,})/i)
  if (!idM) return stockJson({ error: 'invalid_url', message: "URL invalide : identifiant concession (Cxxxx) introuvable. Exemple : https://pros.lacentrale.fr/C043036" }, 400)
  const dealerId = idM[1].toUpperCase()
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': `https://pros.lacentrale.fr/${dealerId}`,
  }
  const listingUrl = (page) => page <= 1
    ? `https://pros.lacentrale.fr/${dealerId}/index?vertical=car`
    : `https://pros.lacentrale.fr/${dealerId}/index?page=${page}&vertical=car`

  let dealerName = '', total = null
  const all = [], seen = new Set()
  for (let page = 1; page <= STOCK_MAX_PAGES; page++) {
    let resp
    try { resp = await fetch(listingUrl(page), { headers }) }
    catch (err) {
      if (page === 1) return stockJson({ error: 'blocked', message: `La Centrale est injoignable côté serveur (${err.message}). Réessayez ou importez un export CSV.` })
      break
    }
    if (!resp.ok) {
      if (page === 1) return stockJson({ error: 'blocked', message: `La Centrale a refusé la requête côté serveur (HTTP ${resp.status}) — blocage anti-bot fréquent depuis l'hébergeur. Réessayez ou importez l'export CSV du vendeur (données plus riches).` })
      break
    }
    const html = await resp.text()
    const parsed = stockParse(html)
    if (page === 1) { dealerName = parsed.name; total = parsed.total }
    if (parsed.vehicles.length === 0) break
    for (const v of parsed.vehicles) if (!seen.has(v.annonceId)) { all.push(v); seen.add(v.annonceId) }
    if (total && all.length >= total) break
    if (page < STOCK_MAX_PAGES) await stockSleep(STOCK_DELAY_MS)
  }
  if (all.length === 0) return stockJson({ error: 'empty', message: "Aucune annonce trouvée (showroom vide, URL incorrecte, ou page bloquée). Vous pouvez importer un export CSV à la place." })
  return stockJson({
    dealer: { id: dealerId, name: dealerName || dealerId, url: `https://pros.lacentrale.fr/${dealerId}`, vehicleCount: total || all.length },
    vehicles: all,
    scrapedAt: new Date().toISOString(),
  })
}
