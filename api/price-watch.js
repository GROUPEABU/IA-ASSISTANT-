// Vercel Edge Function — Collecte prix annonces La Centrale + LBC
export const config = { runtime: 'edge' }

async function jinaFetch(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain', 'X-Return-Format': 'text', 'X-Timeout': '8' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return (await res.text()).slice(0, 4000)
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  const vehicle = searchParams.get('vehicle')
  if (!vehicle) return new Response(JSON.stringify({ error: 'vehicle requis' }), { status: 400 })

  const sources = [
    {
      name: 'La Centrale',
      url: `https://www.lacentrale.fr/listing?makesModelsCommercialNames=${encodeURIComponent(vehicle)}&sortBy=priceAsc`,
    },
    {
      name: 'Le Bon Coin',
      url: `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(vehicle)}&sort=price&order=asc`,
    },
    {
      name: "L'Argus",
      url: `https://www.largus.fr/recherche/?q=${encodeURIComponent(vehicle)}`,
    },
  ]

  const results = await Promise.allSettled(
    sources.map(async (s) => ({ ...s, content: await jinaFetch(s.url) }))
  )

  const data = results
    .filter((r) => r.status === 'fulfilled' && r.value.content?.length > 50)
    .map((r) => r.value)

  return new Response(
    JSON.stringify({ sources: data, fetchedAt: new Date().toISOString(), vehicle }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
