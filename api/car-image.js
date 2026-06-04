// Vercel Edge Function — Proxy d'images véhicule.
//
// Résout une VRAIE photo du véhicule (génération exacte) puis renvoie ses octets
// en MÊME ORIGINE. Indispensable car :
//  - la CSP du site interdit `connect-src` vers l'extérieur (fetch bloqué côté client) ;
//  - servir l'image en same-origin évite tout « taint » du canvas lors de
//    l'export PDF (html2canvas en useCORS/allowTaint:false).
//
// Stratégie de résolution (du plus précis au plus robuste) :
//  1. Recherche d'images DuckDuckGo sur la requête `q` = "Marque Modèle Année".
//     → photo de la GÉNÉRATION exacte (ex. "Renault Espace 2023" = l'actuel,
//       pas le monospace de 1984 que renverrait l'article Wikipédia générique).
//  2. Repli sur l'API pageimages de Wikipedia (fr puis en) via `wiki`/`q`.
//
// Params : ?q=<Marque Modèle Année>&wiki=<Titre article Wikipedia (repli)>
export const config = { runtime: 'edge' }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Domaines à éviter (vignettes vidéo, réseaux sociaux, agrégateurs sans photo nette).
const BAD_HOSTS = ['pinterest', 'lookaside', 'fbsbx', 'instagram', 'tiktok',
                   'facebook', 'twitter', 'x.com', 'reddit', 'ebayimg']

// ── 1. Recherche d'images DuckDuckGo ────────────────────────────────────────
async function ddgImage(query) {
  // a) jeton vqd obligatoire, extrait de la page de recherche
  const home = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    { headers: { 'User-Agent': UA } },
  )
  const html = await home.text()
  const m = html.match(/vqd=["']?([\d-]+)["']?/)
  const vqd = m && m[1]
  if (!vqd) return null

  // b) endpoint JSON des résultats images
  const api = `https://duckduckgo.com/i.js?l=fr-fr&o=json&q=${encodeURIComponent(query)}` +
              `&vqd=${vqd}&f=,,,&p=1`
  const r = await fetch(api, {
    headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/', 'Accept': 'application/json' },
  })
  if (!r.ok) return null
  const data = await r.json()
  const results = Array.isArray(data?.results) ? data.results : []

  // c) classement : paysage, large, format image standard. On renvoie une LISTE
  //    (les meilleures d'abord) car le 1er résultat peut être hotlink-protégé
  //    (ex. largus.fr renvoie 404) → le handler essaie les suivants.
  const scored = results
    .filter((x) => x.image && /^https?:\/\//.test(x.image) &&
      !BAD_HOSTS.some((b) => x.image.toLowerCase().includes(b)))
    .map((x) => {
      let s = 0
      const w = x.width || 0, h = x.height || 0
      if (w >= 1000) s += 3; else if (w >= 600) s += 2; else if (w >= 400) s += 1
      if (w && h && w >= h) s += 2                                   // paysage
      if (w && h && w / h > 2.4) s -= 2                              // bannière trop large
      if (/\.(jpe?g|png|webp)(\?|$)/i.test(x.image)) s += 1
      if (/ytimg|youtube|vimeo/i.test(x.image)) s -= 3              // vignette vidéo
      return { url: x.image, s }
    })
    .sort((a, b) => b.s - a.s)

  return scored.slice(0, 8).map((x) => x.url)
}

// ── 2. Repli Wikipedia pageimages ───────────────────────────────────────────
async function wikiThumb(title, wlang) {
  const api = `https://${wlang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
              `&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&redirects=1`
  const r = await fetch(api, { headers: { 'User-Agent': 'Autobuyunion/1.0 (dimensions)' } })
  if (!r.ok) return null
  const d = await r.json()
  const page = Object.values(d?.query?.pages || {})[0]
  return page?.thumbnail?.source || null
}

async function wikiResolve(title, fallback) {
  for (const cand of [title, fallback].filter(Boolean)) {
    for (const wlang of ['fr', 'en']) {
      try {
        const src = await wikiThumb(cand, wlang)
        if (src) return src
      } catch { /* candidat suivant */ }
    }
  }
  return null
}

// ── Liste de candidats combinée (DDG d'abord, Wikipedia en repli) ────────────
async function candidates(q, wiki) {
  const list = []
  if (q) {
    try { const urls = await ddgImage(q); if (urls) list.push(...urls) } catch { /* repli */ }
  }
  try { const w = await wikiResolve(wiki, q); if (w) list.push(w) } catch { /* fin */ }
  return list
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const q    = (searchParams.get('q') || '').trim()
  const wiki = (searchParams.get('wiki') || '').trim()

  try {
    const urls = await candidates(q, wiki)
    // On essaie chaque candidat : le 1er peut être hotlink-protégé / mort.
    for (const src of urls) {
      try {
        const img = await fetch(src, { headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' } })
        if (img.ok && (img.headers.get('content-type') || '').startsWith('image/')) {
          return new Response(img.body, {
            status: 200,
            headers: {
              'Content-Type': img.headers.get('content-type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=2592000, immutable',
              'Cross-Origin-Resource-Policy': 'same-origin',
            },
          })
        }
      } catch { /* candidat suivant */ }
    }
  } catch { /* 404 → le client affiche son repli visuel */ }

  // Aucune photo trouvée : 404 pour déclencher le repli visuel propre côté client.
  return new Response('', { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } })
}
