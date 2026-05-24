// Vercel Edge Function — Collecte données marché automobile
// Utilise Jina AI Reader (gratuit, sans clé) pour lire L'Argus, La Centrale, Caradisiac
export const config = { runtime: 'edge' }

const SOURCES = [
  {
    label: "L'Argus",
    url: (v) => `https://www.largus.fr/recherche/?q=${encodeURIComponent(v)}`,
  },
  {
    label: 'La Centrale',
    url: (v) => `https://www.lacentrale.fr/listing?makesModelsCommercialNames=${encodeURIComponent(v)}`,
  },
  {
    label: 'Le Bon Coin',
    url: (v) => `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(v)}`,
  },
]

async function jinaFetch(targetUrl) {
  // r.jina.ai convertit n'importe quelle page en markdown lisible par l'IA
  const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
    headers: {
      Accept: 'text/plain',
      'X-Return-Format': 'text',
      'X-Timeout': '8',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const text = await res.text()
  // Garder les 2500 premiers caractères pertinents
  return text.replace(/\[.*?\]\(.*?\)/g, '').trim().slice(0, 2500)
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  const vehicle = searchParams.get('vehicle')

  if (!vehicle) {
    return new Response(JSON.stringify({ error: 'vehicle requis' }), { status: 400 })
  }

  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const content = await jinaFetch(source.url(vehicle))
      return { source: source.label, content, url: source.url(vehicle) }
    }),
  )

  const snippets = results
    .filter((r) => r.status === 'fulfilled' && r.value.content?.length > 100)
    .map((r) => r.value)

  return new Response(
    JSON.stringify({
      snippets,
      fetchedAt: new Date().toISOString(),
      vehicle,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
