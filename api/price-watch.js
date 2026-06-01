// Vercel Edge Function — Construit les URLs de référence (La Centrale, etc.).
// Le scraping est abandonné (proxy systématiquement bloqué 403) : la donnée
// live provient désormais de l'outil web_search de Claude côté client.
export const config = { runtime: 'edge' }

function normCode(str) {
  return str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function normSlug(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').trim()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { searchParams } = new URL(req.url)
  const make        = searchParams.get('make') || ''
  const model       = searchParams.get('model') || ''
  const finition    = searchParams.get('finition') || ''
  const carrosserie = searchParams.get('carrosserie') || ''
  const type        = searchParams.get('type') || 'vo'
  const yearMin     = searchParams.get('yearMin') || ''
  const yearMax     = searchParams.get('yearMax') || ''
  const mileageMin  = searchParams.get('mileageMin') || ''
  const mileageMax  = searchParams.get('mileageMax') || ''
  const fuel        = searchParams.get('fuel') || ''
  const gearbox     = searchParams.get('gearbox') || ''

  if (!make && !model) {
    return new Response(JSON.stringify({ error: 'make ou model requis' }), { status: 400 })
  }

  const makeCode  = normCode(make)
  const modelCode = normCode(model)
  const makeSlug  = normSlug(make)
  const modelSlug = normSlug(model)

  // La Centrale — format réel : makesModelsCommercialNames=MARQUE::MODELE
  const makesParam = makeCode && modelCode ? `${makeCode}::${modelCode}` : makeCode || modelCode
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

  const lbcParts = [make, model ? `"${model}"` : '', finition ? `"${finition}"` : '', yearMin || ''].filter(Boolean).join(' ')
  const lbcUrl = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(lbcParts)}&sort=price&order=asc`

  const asParams = []
  if (type === 'vn') asParams.push('atype=N')
  if (yearMin)    asParams.push(`fregfrom=${yearMin}`)
  if (yearMax)    asParams.push(`fregto=${yearMax}`)
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
      filters: { make, model, finition, carrosserie, type, yearMin, yearMax, mileageMax, fuel, gearbox },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
