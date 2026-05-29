// Vercel Edge Function — Collecte prix multi-sources + fallback AI knowledge
export const config = { runtime: 'edge' }

async function jinaFetch(url, timeoutMs = 12000) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: 'text/plain',
      'X-Return-Format': 'text',
      'X-Timeout': '10',
      'X-No-Cache': 'true',
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const text = await res.text()
  if (text.length < 120) throw new Error('empty')
  return text.slice(0, 8000)
}

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

  const makeCode = normCode(make)
  const modelCode = normCode(model)
  const makeSlug  = normSlug(make)
  const modelSlug = normSlug(model)

  // ── La Centrale URL ──────────────────────────────────────────────────────────
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

  // ── Le Bon Coin URL ──────────────────────────────────────────────────────────
  const lbcParts = [make, model ? `"${model}"` : '', finition ? `"${finition}"` : '', yearMin || ''].filter(Boolean).join(' ')
  const lbcUrl = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(lbcParts)}&sort=price&order=asc`

  // ── AutoScout24 France URL ───────────────────────────────────────────────────
  const asParams = []
  if (type === 'vn') asParams.push('atype=N')
  if (yearMin)   asParams.push(`fregfrom=${yearMin}`)
  if (yearMax)   asParams.push(`fregto=${yearMax}`)
  if (mileageMax) asParams.push(`kmto=${mileageMax}`)
  const asQuery = asParams.length ? `?${asParams.join('&')}` : ''
  const autoScoutUrl = makeSlug && modelSlug
    ? `https://www.autoscout24.fr/lst/${makeSlug}/${modelSlug}${asQuery}`
    : null

  // ── Caradisiac URL ───────────────────────────────────────────────────────────
  const caraUrl = makeSlug && modelSlug
    ? `https://www.caradisiac.com/occasion/${makeSlug}/${modelSlug}/`
    : null

  const sources = [
    { name: 'La Centrale', url: centraleUrl },
    { name: 'Le Bon Coin', url: lbcUrl },
    ...(autoScoutUrl ? [{ name: 'AutoScout24', url: autoScoutUrl }] : []),
    ...(caraUrl ? [{ name: 'Caradisiac', url: caraUrl }] : []),
  ]

  const results = await Promise.allSettled(
    sources.map(async (s) => ({ ...s, content: await jinaFetch(s.url) }))
  )

  const data = results
    .filter((r) => r.status === 'fulfilled' && r.value.content?.length > 120)
    .map((r) => r.value)

  return new Response(
    JSON.stringify({
      sources: data,
      hasLiveData: data.length > 0,
      fetchedAt: new Date().toISOString(),
      centraleUrl,
      filters: { make, model, finition, carrosserie, type, yearMin, yearMax, mileageMax, fuel, gearbox },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
