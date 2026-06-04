// Vercel Edge Function — Proxy d'images véhicule.
//
// Résout une VRAIE photo via l'API pageimages de Wikipedia (fr puis en) puis
// renvoie les octets de l'image en MÊME ORIGINE. Indispensable car :
//  - la CSP du site interdit `connect-src` vers wikipedia.org (fetch bloqué côté client) ;
//  - servir l'image en same-origin évite tout « taint » du canvas lors de
//    l'export PDF (html2canvas en useCORS/allowTaint:false).
//
// Params : ?wiki=<Titre article Wikipedia>&q=<Marque Modèle de repli>
export const config = { runtime: 'edge' }

async function wikiThumb(title, wlang) {
  const api = `https://${wlang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
              `&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&redirects=1`
  const r = await fetch(api, { headers: { 'User-Agent': 'Autobuyunion/1.0 (dimensions)' } })
  if (!r.ok) return null
  const d = await r.json()
  const page = Object.values(d?.query?.pages || {})[0]
  return page?.thumbnail?.source || null
}

async function resolve(title, fallback) {
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

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const wiki = (searchParams.get('wiki') || '').trim()
  const q    = (searchParams.get('q') || '').trim()

  try {
    const src = await resolve(wiki, q)
    if (src) {
      const img = await fetch(src, { headers: { 'User-Agent': 'Autobuyunion/1.0 (dimensions)' } })
      if (img.ok) {
        return new Response(img.body, {
          status: 200,
          headers: {
            'Content-Type': img.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=2592000, immutable',
            'Cross-Origin-Resource-Policy': 'same-origin',
          },
        })
      }
    }
  } catch { /* 404 → le client affiche son repli visuel */ }

  // Aucune photo trouvée : 404 pour déclencher le repli visuel propre côté client.
  return new Response('', { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } })
}
