// Vercel Edge Function — récupère le stock d'un showroom pro La Centrale.
//
// ⚠️ Contexte projet : le scraping La Centrale depuis les IP Vercel est
// fréquemment bloqué (403 anti-bot, cf. api/price-watch.js). Cette fonction
// attaque DIRECTEMENT les pages de listing paginées (jamais la racine, elle
// est bloquée) et, en cas de blocage / HTML inattendu, renvoie un JSON d'erreur
// explicite pour que l'UI propose l'import CSV (voie fiable et plus riche).
//
// Sortie OK :  { dealer:{id,name,url,vehicleCount}, vehicles:[...], scrapedAt }
// Sortie KO :  { error:'blocked'|'invalid_url'|'empty', message }
//
// Modularité : le parsing est isolé dans parseLaCentrale(html). Pour une autre
// source plus tard (Leboncoin Pro, Aramis…), router selon le domaine de l'URL.
export const config = { runtime: 'edge' }

const MAX_PAGES = 20
const PER_PAGE = 9 // listing pro La Centrale : 9 annonces / page
const PAGE_DELAY_MS = 220

const BROWSER_HEADERS = (dealerId) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Referer': `https://pros.lacentrale.fr/${dealerId}`,
})

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cleanNum = (s) => parseInt(String(s).replace(/[\s .]/g, ''), 10)

const FUELS = ['Bicarburation essence / gpl', 'Hybrides', 'Électrique', 'Electrique', 'Essence', 'Diesel']
const BADGES = ['Très bonne affaire', 'Bonne affaire', 'Offre équitable', 'Au dessus du marché']

// Retire les balises HTML d'un fragment et normalise les espaces.
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

// Extrait un véhicule depuis le TEXTE d'une carte d'annonce + son href.
function vehicleFromCard(text, annonceId, url) {
  const yearM = text.match(/\b(20\d{2})\b/)
  const kmM = text.match(/([\d\s ]{2,})\s*km\b/i)
  const priceM = text.match(/([\d\s ]{3,})\s*€/)
  const gearbox = /\bauto(matique)?\b/i.test(text) ? 'Auto' : /\bmanuelle?\b/i.test(text) ? 'Manuelle' : null
  // Titre = début du texte avant l'année / le km (heuristique).
  const head = text.split(/\b20\d{2}\b/)[0].trim()
  const parts = head.split(/\s+/)
  const make = parts[0] ? parts[0].toUpperCase() : null
  const model = parts.slice(1).join(' ').trim() || null
  return {
    annonceId,
    make,
    model,
    version: null,
    year: yearM ? Number(yearM[1]) : null,
    gearbox,
    mileageKm: kmM ? cleanNum(kmM[1]) : null,
    fuel: pickFuel(text),
    priceEur: priceM ? cleanNum(priceM[1]) : null,
    marketBadge: pickBadge(text),
    url,
  }
}

// Parse une page de listing. Essaie d'abord l'état JSON embarqué, sinon le HTML.
function parseLaCentrale(html, dealerId) {
  // (1) Nom de la concession
  let name = ''
  const ogM = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (ogM) name = ogM[1].trim()
  if (!name) { const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) name = stripTags(h1[1]) }

  // (2) Total d'annonces (« X annonces »)
  let total = null
  const totM = stripTags(html).match(/([\d\s ]{1,7})\s*annonces?\b/i)
  if (totM) { const n = cleanNum(totM[1]); if (Number.isFinite(n) && n > 0) total = n }

  // (3) Véhicules — HTML : on isole chaque ancre vers /annonce/{id}
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

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  let raw = (searchParams.get('url') || '').trim()
  if (!raw) return json({ error: 'invalid_url', message: 'URL du showroom manquante.' }, 400)
  try { raw = decodeURIComponent(raw) } catch { /* garde tel quel */ }

  const idM = raw.match(/(C\d{4,})/i)
  if (!idM) return json({ error: 'invalid_url', message: "URL invalide : identifiant concession (Cxxxx) introuvable. Exemple attendu : https://pros.lacentrale.fr/C043036" }, 400)
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
    let res
    try {
      res = await fetch(listingUrl(page), { headers: BROWSER_HEADERS(dealerId) })
    } catch (err) {
      if (page === 1) return json({ error: 'blocked', message: `La Centrale est injoignable côté serveur (${err.message}). Réessayez ou importez un export CSV.` }, 502)
      break
    }
    if (!res.ok) {
      if (page === 1) {
        return json({ error: 'blocked', message: `La Centrale a refusé la requête côté serveur (HTTP ${res.status}). C'est un blocage anti-bot fréquent depuis l'hébergeur. Réessayez dans un instant ou importez l'export CSV du partenaire (données plus riches).` }, 200)
      }
      break
    }
    const html = await res.text()
    const parsed = parseLaCentrale(html, dealerId)
    if (page === 1) { dealerName = parsed.name; total = parsed.total }
    if (parsed.vehicles.length === 0) break
    for (const v of parsed.vehicles) {
      if (!seen.has(v.annonceId)) { all.push(v); seen.add(v.annonceId) }
    }
    // Arrêt si on a tout récupéré (selon le total annoncé).
    if (total && all.length >= total) break
    if (page < MAX_PAGES) await sleep(PAGE_DELAY_MS)
  }

  if (all.length === 0) {
    return json({ error: 'empty', message: "Aucune annonce trouvée. Le showroom est peut-être vide, l'URL incorrecte, ou La Centrale a renvoyé une page bloquée. Vous pouvez importer un export CSV à la place." }, 200)
  }

  return json({
    dealer: { id: dealerId, name: dealerName || dealerId, url: `https://pros.lacentrale.fr/${dealerId}`, vehicleCount: total || all.length },
    vehicles: all,
    scrapedAt: new Date().toISOString(),
  })
}
