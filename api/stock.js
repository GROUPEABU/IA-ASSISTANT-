// Vercel Serverless Function (Node, runtime par défaut) — récupère le stock
// d'un showroom pro La Centrale. Runtime Node = détection de fonction la plus
// robuste (contourne un éventuel cache de manifeste d'edge functions).
//
// ⚠️ Le scraping La Centrale depuis les IP Vercel est fréquemment bloqué
// (403 anti-bot, cf. api/price-watch.js). En cas de blocage / HTML inattendu,
// renvoie un JSON d'erreur explicite pour que l'UI bascule sur l'import CSV.
//
// Sortie OK :  { dealer:{id,name,url,vehicleCount}, vehicles:[...], scrapedAt }
// Sortie KO :  { error:'blocked'|'invalid_url'|'empty', message }

const MAX_PAGES = 15
const PAGE_DELAY_MS = 180

const BROWSER_HEADERS = (dealerId) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Referer': `https://pros.lacentrale.fr/${dealerId}`,
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cleanNum = (s) => parseInt(String(s).replace(/[\s .]/g, ''), 10)

const FUELS = ['Bicarburation essence / gpl', 'Hybrides', 'Électrique', 'Electrique', 'Essence', 'Diesel']
const BADGES = ['Très bonne affaire', 'Bonne affaire', 'Offre équitable', 'Au dessus du marché']

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim()
}
function pickFuel(text) {
  for (const f of FUELS) if (text.toLowerCase().includes(f.toLowerCase())) return f === 'Electrique' ? 'Électrique' : f
  return null
}
function pickBadge(text) {
  for (const b of BADGES) if (text.includes(b)) return b
  return null
}

function vehicleFromCard(text, annonceId, url) {
  const yearM = text.match(/\b(20\d{2})\b/)
  const kmM = text.match(/([\d\s ]{2,})\s*km\b/i)
  const priceM = text.match(/([\d\s ]{3,})\s*€/)
  const gearbox = /\bauto(matique)?\b/i.test(text) ? 'Auto' : /\bmanuelle?\b/i.test(text) ? 'Manuelle' : null
  const head = text.split(/\b20\d{2}\b/)[0].trim()
  const parts = head.split(/\s+/)
  const make = parts[0] ? parts[0].toUpperCase() : null
  const model = parts.slice(1).join(' ').trim() || null
  return {
    annonceId, make, model, version: null,
    year: yearM ? Number(yearM[1]) : null,
    gearbox,
    mileageKm: kmM ? cleanNum(kmM[1]) : null,
    fuel: pickFuel(text),
    priceEur: priceM ? cleanNum(priceM[1]) : null,
    marketBadge: pickBadge(text),
    url,
  }
}

function parseLaCentrale(html) {
  let name = ''
  const ogM = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (ogM) name = ogM[1].trim()
  if (!name) { const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) name = stripTags(h1[1]) }

  let total = null
  const totM = stripTags(html).match(/([\d\s ]{1,7})\s*annonces?\b/i)
  if (totM) { const n = cleanNum(totM[1]); if (Number.isFinite(n) && n > 0) total = n }

  const vehicles = []
  const seen = new Set()
  const anchorRe = /<a\b[^>]*href=["']([^"']*\/annonce\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1]
    const annonceId = m[2]
    if (seen.has(annonceId)) continue
    const text = stripTags(m[3])
    if (text.length < 6) continue
    const url = href.startsWith('http') ? href : `https://www.lacentrale.fr${href.startsWith('/') ? '' : '/'}${href}`
    const v = vehicleFromCard(text, annonceId, url)
    if (v.make || v.priceEur) { vehicles.push(v); seen.add(annonceId) }
  }
  return { name, total, vehicles }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  let raw = (req.query?.url || '').trim()
  if (!raw) { res.status(400).json({ error: 'invalid_url', message: 'URL du showroom manquante.' }); return }
  try { raw = decodeURIComponent(raw) } catch { /* garde tel quel */ }

  const idM = raw.match(/(C\d{4,})/i)
  if (!idM) { res.status(400).json({ error: 'invalid_url', message: "URL invalide : identifiant concession (Cxxxx) introuvable. Exemple : https://pros.lacentrale.fr/C043036" }); return }
  const dealerId = idM[1].toUpperCase()

  const listingUrl = (page) =>
    page <= 1
      ? `https://pros.lacentrale.fr/${dealerId}/index?vertical=car`
      : `https://pros.lacentrale.fr/${dealerId}/index?page=${page}&vertical=car`

  let dealerName = ''
  let total = null
  const all = []
  const seen = new Set()

  for (let page = 1; page <= MAX_PAGES; page++) {
    let resp
    try {
      resp = await fetch(listingUrl(page), { headers: BROWSER_HEADERS(dealerId) })
    } catch (err) {
      if (page === 1) { res.status(200).json({ error: 'blocked', message: `La Centrale est injoignable côté serveur (${err.message}). Réessayez ou importez un export CSV.` }); return }
      break
    }
    if (!resp.ok) {
      if (page === 1) { res.status(200).json({ error: 'blocked', message: `La Centrale a refusé la requête côté serveur (HTTP ${resp.status}) — blocage anti-bot fréquent depuis l'hébergeur. Réessayez ou importez l'export CSV du vendeur (données plus riches).` }); return }
      break
    }
    const html = await resp.text()
    const parsed = parseLaCentrale(html)
    if (page === 1) { dealerName = parsed.name; total = parsed.total }
    if (parsed.vehicles.length === 0) break
    for (const v of parsed.vehicles) if (!seen.has(v.annonceId)) { all.push(v); seen.add(v.annonceId) }
    if (total && all.length >= total) break
    if (page < MAX_PAGES) await sleep(PAGE_DELAY_MS)
  }

  if (all.length === 0) {
    res.status(200).json({ error: 'empty', message: "Aucune annonce trouvée (showroom vide, URL incorrecte, ou page bloquée). Vous pouvez importer un export CSV à la place." })
    return
  }

  res.status(200).json({
    dealer: { id: dealerId, name: dealerName || dealerId, url: `https://pros.lacentrale.fr/${dealerId}`, vehicleCount: total || all.length },
    vehicles: all,
    scrapedAt: new Date().toISOString(),
  })
}
