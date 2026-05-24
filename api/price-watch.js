// Vercel Edge Function — Collecte prix La Centrale avec filtres + LBC + L'Argus
export const config = { runtime: 'edge' }

async function jinaFetch(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain', 'X-Return-Format': 'text', 'X-Timeout': '10' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return (await res.text()).slice(0, 6000)
}

function normCode(str) {
  return str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  const make       = searchParams.get('make') || ''
  const model      = searchParams.get('model') || ''
  const type       = searchParams.get('type') || 'vo'   // vo | vn
  const yearMin    = searchParams.get('yearMin') || ''
  const yearMax    = searchParams.get('yearMax') || ''
  const mileageMax = searchParams.get('mileageMax') || ''
  const fuel       = searchParams.get('fuel') || ''     // ES GO EL HY GH
  const gearbox    = searchParams.get('gearbox') || ''  // M A

  if (!make && !model) {
    return new Response(JSON.stringify({ error: 'make ou model requis' }), { status: 400 })
  }

  // Build La Centrale URL avec filtres structurés
  const makeCode  = normCode(make)
  const modelCode = normCode(model)
  const makesParam = makeCode && modelCode
    ? `${makeCode}:${modelCode}`
    : makeCode || modelCode

  const cp = new URLSearchParams()
  cp.set('makesModelsCommercialNames', makesParam)
  if (type === 'vn') cp.set('isNew', 'true')
  if (yearMin)    cp.set('yearMin', yearMin)
  if (yearMax)    cp.set('yearMax', yearMax)
  if (mileageMax) cp.set('mileageMax', mileageMax)
  if (fuel)       cp.set('energies', fuel)
  if (gearbox)    cp.set('gearbox', gearbox)
  cp.set('sortBy', 'relevance')

  const centraleUrl = `https://www.lacentrale.fr/listing?${cp.toString()}`
  const searchQuery = `${make} ${model} ${yearMin || ''}`.trim()
  const lbcUrl      = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(searchQuery)}&sort=price&order=asc`
  const argusUrl    = `https://www.largus.fr/recherche/?q=${encodeURIComponent(searchQuery)}`

  const sources = [
    { name: 'La Centrale', url: centraleUrl },
    { name: 'Le Bon Coin', url: lbcUrl },
    { name: "L'Argus",    url: argusUrl },
  ]

  const results = await Promise.allSettled(
    sources.map(async (s) => ({ ...s, content: await jinaFetch(s.url) }))
  )

  const data = results
    .filter((r) => r.status === 'fulfilled' && r.value.content?.length > 50)
    .map((r) => r.value)

  return new Response(
    JSON.stringify({
      sources: data,
      fetchedAt: new Date().toISOString(),
      centraleUrl,
      filters: { make, model, type, yearMin, yearMax, mileageMax, fuel, gearbox },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
