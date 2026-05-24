// Vercel Edge Function — Recherche web marché automobile
// Sources : Brave Search → L'Argus, La Centrale, AutoScout24, CCFA, Caradisiac
export const config = { runtime: 'edge' }

const AUTOMOTIVE_DOMAINS = [
  'largus.fr', 'lacentrale.fr', 'autoscout24.fr', 'caradisiac.com',
  'leboncoin.fr', 'pfa-auto.fr', 'ccfa.fr', 'autoplus.fr',
  'turbo.fr', 'motortrend.fr', 'autonews.fr', 'argusauto.com',
]

async function braveSearch(query, apiKey) {
  const params = new URLSearchParams({
    q: query,
    count: '5',
    country: 'fr',
    search_lang: 'fr',
    freshness: 'py',
  })
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })
  if (!res.ok) throw new Error(`Brave API error: ${res.status}`)
  const data = await res.json()
  return (data.web?.results || []).map((r) => ({
    title: r.title,
    description: r.description || '',
    url: r.url,
    source: new URL(r.url).hostname.replace('www.', ''),
  }))
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const { searchParams } = new URL(req.url)
  const vehicle = searchParams.get('vehicle')

  if (!vehicle) {
    return new Response(JSON.stringify({ error: 'Paramètre vehicle manquant' }), { status: 400 })
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ noKey: true, message: 'BRAVE_SEARCH_API_KEY non configurée' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    // 3 requêtes ciblées en parallèle
    const queries = [
      `${vehicle} prix cote occasion argus lacentrale France 2024 2025`,
      `${vehicle} immatriculations ventes marché neuf France tendance`,
      `${vehicle} prix neuf remise concession promotion France`,
    ]

    const allResults = await Promise.allSettled(
      queries.map((q) => braveSearch(q, apiKey)),
    )

    const snippets = allResults
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .filter((item, idx, arr) => arr.findIndex((i) => i.url === item.url) === idx) // dédoublonner
      .slice(0, 12)

    // Trier : sources spécialisées auto en premier
    const sorted = [
      ...snippets.filter((s) => AUTOMOTIVE_DOMAINS.some((d) => s.source.includes(d))),
      ...snippets.filter((s) => !AUTOMOTIVE_DOMAINS.some((d) => s.source.includes(d))),
    ]

    return new Response(
      JSON.stringify({ snippets: sorted, fetchedAt: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
