// Vercel Edge Function — Collecte prix La Centrale avec filtres + LBC + L'Argus
export const config = { runtime: 'edge' }

async function jinaFetch(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain', 'X-Return-Format': 'text', 'X-Timeout': '10' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return (await res.text()).slice(0, 8000)
}

function normCode(str) {
  return str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  const make        = searchParams.get('make') || ''
  const model       = searchParams.get('model') || ''
  const finition    = searchParams.get('finition') || ''
  const carrosserie = searchParams.get('carrosserie') || ''
  const type        = searchParams.get('type') || 'vo'   // vo | vn
  const yearMin     = searchParams.get('yearMin') || ''
  const yearMax     = searchParams.get('yearMax') || ''
  const mileageMax  = searchParams.get('mileageMax') || ''
  const fuel        = searchParams.get('fuel') || ''     // ES GO EL HY GH
  const gearbox     = searchParams.get('gearbox') || ''  // M A

  if (!make && !model) {
    return new Response(JSON.stringify({ error: 'make ou model requis' }), { status: 400 })
  }

  // Build La Centrale URL — format réel : makesModelsCommercialNames=MARQUE::MODELE
  // (double deux-points ; le nom commercial garde ses espaces, encodés en %20)
  // ex: CITROEN::C5 AIRCROSS  →  CITROEN%3A%3AC5%20AIRCROSS
  const makeCode  = normCode(make)
  const modelCode = normCode(model)
  const mileageMin = searchParams.get('mileageMin') || ''

  const makesParam = makeCode && modelCode
    ? `${makeCode}::${modelCode}`
    : makeCode || modelCode

  // Construction manuelle pour encoder les espaces en %20 (et non +)
  const cParams = [`makesModelsCommercialNames=${encodeURIComponent(makesParam)}`]
  if (type === 'vn') cParams.push('isNew=true')
  if (yearMin)     cParams.push(`yearMin=${encodeURIComponent(yearMin)}`)
  if (yearMax)     cParams.push(`yearMax=${encodeURIComponent(yearMax)}`)
  if (mileageMin)  cParams.push(`mileageMin=${encodeURIComponent(mileageMin)}`)
  if (mileageMax)  cParams.push(`mileageMax=${encodeURIComponent(mileageMax)}`)
  if (fuel)        cParams.push(`energies=${encodeURIComponent(fuel)}`)
  if (gearbox)     cParams.push(`gearbox=${encodeURIComponent(gearbox)}`)
  if (carrosserie) cParams.push(`carTypes=${encodeURIComponent(carrosserie)}`)

  const centraleUrl = `https://www.lacentrale.fr/listing?${cParams.join('&')}`

  // LBC : modèle exact entre guillemets + finition si précisée
  const lbcParts = [make, model ? `"${model}"` : '', finition ? `"${finition}"` : '', yearMin || ''].filter(Boolean).join(' ')
  const lbcUrl = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(lbcParts)}&sort=price&order=asc`

  const sources = [
    { name: 'La Centrale', url: centraleUrl },
    { name: 'Le Bon Coin', url: lbcUrl },
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
      filters: { make, model, finition, carrosserie, type, yearMin, yearMax, mileageMax, fuel, gearbox },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
