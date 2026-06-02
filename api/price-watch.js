// Vercel Edge Function — Construit les URLs de référence (La Centrale, etc.).
// Le scraping est abandonné (proxy systématiquement bloqué 403) : la donnée
// live provient désormais de l'outil web_search de Claude côté client.
export const config = { runtime: 'edge' }

// Tokens de motorisation / finition / boîte à retirer du nom de modèle pour
// retrouver le NOM COMMERCIAL réel attendu par La Centrale & AutoScout24.
// Ex : "C5 HYBRID 145 CV AIRCROSS" → "C5 AIRCROSS".
const NOISE_TOKENS = [
  'HYBRID', 'HYBRIDE', 'MHEV', 'PHEV', 'HEV', 'MICRO-HYBRID', 'E-TECH', 'ETECH',
  'BLUEHDI', 'PURETECH', 'HDI', 'TDI', 'TSI', 'TFSI', 'DCI', 'CDI', 'CRDI',
  'VTI', 'THP', 'TCE', 'SCE', 'MULTIAIR', 'BOOSTERJET',
  'EAT', 'EAT6', 'EAT8', 'BVA', 'BVM', 'DSG', 'DCT', 'CVT', 'STRONIC', 'TIPTRONIC',
  'GPL', 'E85', 'ETHANOL', 'ESSENCE', 'DIESEL', 'ELECTRIQUE', 'ELECTRIC', 'ELEC',
]

// Retire motorisation / puissance / cylindrée d'un libellé de modèle, en
// préservant les vrais identifiants modèle (308, 3008, C5, A3, ID.4…).
function cleanModelName(raw) {
  if (!raw) return ''
  let s = ' ' + raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' '
  // Puissance : "145 CV", "150CH", "85 KW", "190 HP"
  s = s.replace(/\s\d{2,3}\s?(CV|CH|KW|HP)\b/g, ' ')
  // Cylindrée : "1.5", "2,0", "1.6L", "2.0 L"
  s = s.replace(/\s\d[.,]\d\s?L?\b/g, ' ')
  // Mots-clés motorisation / boîte
  NOISE_TOKENS.forEach(w => { s = s.replace(new RegExp('\\s' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), ' ') })
  s = s.replace(/\s+/g, ' ').trim()
  // Retire les puissances "nues" restantes (2-3 chiffres) qui ne sont PAS le
  // 1er token : un nom commercial commence par son identifiant (308, C5…), la
  // puissance vient après. On garde les modèles à 1 chiffre (Model 3, Mazda 6).
  const tokens = s.split(' ').filter((tok, i) => !(i > 0 && /^\d{2,3}$/.test(tok)))
  s = tokens.join(' ').trim()
  // Si on a tout retiré par erreur, on revient au libellé d'origine.
  return s || raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
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
  const s = (k, max = 100) => (searchParams.get(k) || '').trim().slice(0, max)
  const make        = s('make')
  const model       = s('model')
  const finition    = s('finition')
  const carrosserie = s('carrosserie', 20)
  const type        = ['vo', 'vn'].includes(s('type', 5)) ? s('type', 5) : 'vo'
  const yearMin     = s('yearMin', 4).replace(/\D/g, '')
  const yearMax     = s('yearMax', 4).replace(/\D/g, '')
  const mileageMin  = s('mileageMin', 7).replace(/\D/g, '')
  const mileageMax  = s('mileageMax', 7).replace(/\D/g, '')
  const fuel        = s('fuel', 5)
  const gearbox     = s('gearbox', 5)

  if (!make && !model) {
    return new Response(JSON.stringify({ error: 'make ou model requis' }), { status: 400 })
  }

  // Nom commercial nettoyé (sans motorisation/finition) — c'est ce que les
  // portails attendent. La motorisation reste gérée par la recherche web.
  const cleanModel = cleanModelName(model)
  const makeCode  = normCode(make)
  const modelCode = normCode(cleanModel)
  const makeSlug  = normSlug(make)
  const modelSlug = normSlug(cleanModel)

  // Mapping carburant interne → énumération La Centrale (energies).
  const LC_ENERGIES = { ES: 'ess', GO: 'die', EL: 'elec', HY: 'hyb', GH: 'hyb-rech', GP: 'gpl' }
  const lcEnergy = LC_ENERGIES[normCode(fuel)] || ''

  // La Centrale — format réel : makesModelsCommercialNames=MARQUE::MODELE
  // On ne garde que les paramètres dont le format est fiable (modèle, année,
  // km, énergie mappée). Les codes boîte/carrosserie internes ne correspondent
  // pas à l'énumération du site et généraient des filtres « non reconnus » +
  // 0 résultat : on les laisse à l'utilisateur sur place.
  const makesParam = makeCode && modelCode ? `${makeCode}::${modelCode}` : makeCode || modelCode
  const cParams = [`makesModelsCommercialNames=${encodeURIComponent(makesParam)}`]
  if (type === 'vn') cParams.push('isNew=true')
  if (yearMin)     cParams.push(`yearMin=${encodeURIComponent(yearMin)}`)
  if (yearMax)     cParams.push(`yearMax=${encodeURIComponent(yearMax)}`)
  if (mileageMin)  cParams.push(`mileageMin=${encodeURIComponent(mileageMin)}`)
  if (mileageMax)  cParams.push(`mileageMax=${encodeURIComponent(mileageMax)}`)
  if (lcEnergy)    cParams.push(`energies=${encodeURIComponent(lcEnergy)}`)
  const centraleUrl = `https://www.lacentrale.fr/listing?${cParams.join('&')}`

  const lbcParts = [make, cleanModel ? `"${cleanModel}"` : '', finition ? `"${finition}"` : '', yearMin || ''].filter(Boolean).join(' ')
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
