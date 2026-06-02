import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Search, RefreshCw, RotateCcw, TrendingUp, TrendingDown, Minus,
  AlertCircle, ExternalLink, Clock, SlidersHorizontal, Download, History,
  Trash2, Wifi, WifiOff, ShieldCheck, Zap, Tag, FileText, Calculator,
} from 'lucide-react'
import { sendMessage, extractJSON } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import AIProgress from '@/components/ui/AIProgress'
import { formatNumber } from '@/utils/formatters'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { exportToPdf, pdfFileName } from '@/utils/exportPdf'
import { useToast } from '@/components/ui/Toast'

const PW_SESSION = 'abu_pw_filters'
function readPwSession(field, def) {
  try { return JSON.parse(sessionStorage.getItem(PW_SESSION))?.[field] ?? def } catch { return def }
}

// ── Données filtres ────────────────────────────────────────────────────────────
const MAKES = [
  { label: 'Abarth', code: 'ABARTH' }, { label: 'Alfa Romeo', code: 'ALFA ROMEO' },
  { label: 'Audi', code: 'AUDI' }, { label: 'BMW', code: 'BMW' },
  { label: 'Citroën', code: 'CITROEN' }, { label: 'Cupra', code: 'CUPRA' },
  { label: 'Dacia', code: 'DACIA' }, { label: 'DS Automobiles', code: 'DS' },
  { label: 'Fiat', code: 'FIAT' }, { label: 'Ford', code: 'FORD' },
  { label: 'Honda', code: 'HONDA' }, { label: 'Hyundai', code: 'HYUNDAI' },
  { label: 'Jaecoo', code: 'JAECOO' }, { label: 'Jaguar', code: 'JAGUAR' },
  { label: 'Jeep', code: 'JEEP' }, { label: 'Kia', code: 'KIA' },
  { label: 'Land Rover', code: 'LAND ROVER' }, { label: 'Lexus', code: 'LEXUS' },
  { label: 'Mazda', code: 'MAZDA' }, { label: 'Mercedes', code: 'MERCEDES' },
  { label: 'MINI', code: 'MINI' }, { label: 'Mitsubishi', code: 'MITSUBISHI' },
  { label: 'Nissan', code: 'NISSAN' }, { label: 'Omoda', code: 'OMODA' },
  { label: 'Opel', code: 'OPEL' }, { label: 'Peugeot', code: 'PEUGEOT' },
  { label: 'Porsche', code: 'PORSCHE' }, { label: 'Renault', code: 'RENAULT' },
  { label: 'SEAT', code: 'SEAT' }, { label: 'Skoda', code: 'SKODA' },
  { label: 'Smart', code: 'SMART' }, { label: 'Suzuki', code: 'SUZUKI' },
  { label: 'Tesla', code: 'TESLA' }, { label: 'Toyota', code: 'TOYOTA' },
  { label: 'Volkswagen', code: 'VOLKSWAGEN' }, { label: 'Volvo', code: 'VOLVO' },
]

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i)

// ── Règles de cotation Autobuyunion (figées, déterministes) ─────────────────────
// Achat pro HT = Vente HT − transport − marge partenaire.
//   • Vente HT          = prix de vente conseillé TTC ÷ 1,20 (TVA 20%)
//   • Transport UE      = 450 € HT / véhicule
//   • Marge partenaire  = 3 000 € HT (FIXE)
//   • La marge groupe (550 €) est prise EN AMONT → jamais déduite ici.
//   • Le malus est à la charge du client final B2C → jamais déduit ici.
const TVA = 1.20
const TRANSPORT_HT = 450
const MARGE_PARTENAIRE_MIN_HT = 3000 // marge partenaire PLANCHER (au moins 3 000 €)

function applyPricingRules(analysis) {
  const venteTTC = Number(analysis?.prix_conseille_vente) || 0
  if (!venteTTC) return analysis

  // PLAFOND = prix d'achat max pour garder AU MOINS 3 000 € de marge :
  // Vente HT − transport − marge partenaire mini. Acheter en dessous = marge ↑.
  const achatMax = Math.max(0, Math.round(venteTTC / TVA - TRANSPORT_HT - MARGE_PARTENAIRE_MIN_HT))
  // Bas de fourchette = fenêtre réaliste ~1 000 € sous le plafond (cible idéale).
  // On ne descend pas plus bas, sinon le prix devient introuvable sur le marché.
  const FOURCHETTE_BAND = 1000
  const achatMin = Math.max(0, achatMax - FOURCHETTE_BAND)

  return {
    ...analysis,
    fourchette_achat_pro_min: achatMin,
    fourchette_achat_pro_max: achatMax,
    marge_brute_potentielle: MARGE_PARTENAIRE_MIN_HT, // marge au prix d'achat plafond
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchPrices(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

async function analyzePrices(filters, fuels, gearboxes, bodies, lang = 'fr', withWebSearch = true) {
  const vehicleDesc = [
    filters.make, filters.model,
    filters.finition || '',
    filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
      : filters.yearMin ? `depuis ${filters.yearMin}`
      : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
    filters.mileageMax ? `< ${Number(filters.mileageMax).toLocaleString()} km` : '',
    filters.fuel ? fuels.find(f => f.code === filters.fuel)?.label : '',
    filters.gearbox ? gearboxes.find(g => g.code === filters.gearbox)?.label : '',
    filters.carrosserie ? bodies.find(b => b.code === filters.carrosserie)?.label : '',
  ].filter(Boolean).join(' · ')

  const finitionFilter = filters.finition
    ? `\n⚠️ FILTRE FINITION STRICT : Analyse UNIQUEMENT la finition/version "${filters.finition}".`
    : ''

  const dataSection = `RECHERCHE WEB OBLIGATOIRE — utilise l'outil de recherche web (plusieurs requêtes) AVANT toute estimation. Cherche en priorité les annonces les MOINS CHÈRES du marché ("premiers du net"), ex :
- "${filters.make} ${filters.model} ${filters.finition || ''} ${filters.yearMin || ''} occasion prix lacentrale"
- "${filters.make} ${filters.model} ${filters.finition || ''} leboncoin occasion pas cher"
- "${filters.make} ${filters.model} ${filters.finition || ''} autoscout24 moins cher"
OBJECTIF PRINCIPAL : identifier les 10–20% des annonces les moins chères réellement disponibles. Les partenaires Autobuyunion achètent en volume à prix HT compétitif et doivent se positionner PARMI LES PREMIERS DU NET — jamais sur la moyenne haute. Lis les prix réels, repère la fourchette basse du marché, et fixe le prix conseillé vente TTC dans cette fourchette compétitive.
N'invente JAMAIS d'erreur "403/404" : décris ce que tu as réellement trouvé. Si aucune annonce exploitable après recherche, bascule sur ta connaissance experte et l'indique dans "alerte".`

  const prompt = `Tu es expert en cote et marché automobile ${filters.type === 'vn' ? 'VN (véhicule neuf)' : 'VO (occasion)'} pour Autobuyunion, centrale d'achat européenne.
Véhicule cible : "${vehicleDesc}"${finitionFilter}

${dataSection}

MÉTHODE DE COTATION AUTOBUYUNION (applique-la précisément, raisonne PAR VÉHICULE) :
1. PREMIER PRIX DU NET : l'annonce la moins chère réellement disponible (jamais la moyenne).
2. "prix_conseille_vente" TTC = ce premier prix du net (ou légèrement en dessous) pour être 1er du net et vendre vite.
3. CASCADE DE COÛTS pour obtenir le prix d'achat HT recommandé (deal B2B Autobuyunion → partenaire) :
   a. Vente HT = prix_conseille_vente ÷ 1,20 (retrait TVA 20%).
   b. Transport UE = 450 € HT par véhicule.
   c. Marge partenaire = 3 000 € HT MINIMUM (plancher : au moins 3 000 €, jamais moins).
   → fourchette_achat_pro (HT) = prix PLAFOND à payer = Vente HT − 450 (transport) − 3 000 (marge mini). Acheter en dessous augmente la marge.
   NE soustrais PAS de marge groupe ici : la marge Autobuyunion (550 €) est déjà prise EN AMONT, hors de ce calcul.
   Le MALUS n'entre JAMAIS dans cette cascade : il est à la charge du CLIENT FINAL (B2C), pas du deal B2B.
4. "marge_brute_potentielle" = 3 000 € (marge plancher au prix d'achat plafond).
5. "malus_estime" = information pour l'acheteur FINAL B2C uniquement (jamais déduit de l'achat ni de la marge).
6. Écart minimum viable d'un deal ≈ 4 500–5 000 € (davantage sur premium).

RÈGLES DE FORMULATION STRICTES :
- Autobuyunion vend PAR CAMION COMPLET au partenaire : ne recommande JAMAIS un nombre d'unités ni "lots de X unités". Raisonne par camion / par véhicule, jamais en quantité conseillée.
- Le MALUS écologique est à la charge du CLIENT FINAL (B2C) à la 1re immat. française — il N'EST JAMAIS déduit du prix d'achat pro ni de la marge partenaire (deal B2B). Affiche-le seulement à titre informatif. N'écris jamais qu'il est "déjà absorbé", "inclus" ou "amorti".
- NE cite JAMAIS de noms de réseaux, mandataires, enseignes, concessions, labels (type Spoticar) ni de villes/codes postaux précis (tu les inventerais → risque de crédibilité). Reste sur des formulations génériques et chiffrées.
- KILOMÉTRAGE : ne déconseille JAMAIS les véhicules à fort kilométrage. Plus le kilométrage est élevé, plus le prix d'acquisition cible BAISSE sous le plafond — ce qui PRÉSERVE la marge de 3 000 € HT minimum ET offre un coût TTC plus bas au client final. Adapte le prix à la baisse, ne rejette pas ces unités.
- "conseil_achat" : COURT et SIMPLE (3–4 phrases max, pas de §1/§2, pas de pavé). Ton mesuré et nuancé — évite les avis trop tranchés ("irréprochable", "doit", "le meilleur du marché"). Dis simplement : le type de véhicule à privilégier, et que le prix d'achat HT cible descend quand le kilométrage monte pour garder ≥ 3 000 € de marge et un TTC plus compétitif. Une seule fourchette de prix indicative suffit.

Génère une analyse experte complète de type fiche pro. Tous les prix sont en euros TTC sauf indication HT.

Réponds UNIQUEMENT en JSON strict (aucun texte avant/après, aucune balise markdown) :
{
  "prix_moyen": <prix moyen marché TTC>,
  "prix_median": <prix médian TTC>,
  "prix_q1": <25e percentile TTC>,
  "prix_q3": <75e percentile TTC>,
  "nb_annonces_estim": <nombre annonces estimé sur marché FR>,
  "tendance": "hausse|baisse|stable",
  "tendance_pct": <variation 3 mois en %, ex: 2.5>,
  "prix_neuf_catalogue": <PVC neuf TTC catalogue actuel ou à l'époque>,
  "decote_annuelle_pct": <décote annuelle moyenne en %, ex: 12>,
  "valeur_residuelle_1an": <valeur estimée dans 1 an TTC>,
  "valeur_residuelle_3ans": <valeur estimée dans 3 ans TTC>,
  "fourchette_achat_pro_min": <prix achat pro recommandé minimum HT>,
  "fourchette_achat_pro_max": <prix achat pro recommandé maximum HT>,
  "malus_estime": <malus écologique CO2+masse à la charge du CLIENT FINAL B2C à la 1re immat. française, en € (info seule, JAMAIS déduit de l'achat/marge)>,
  "marge_brute_potentielle": <toujours 3000 (marge partenaire fixe)>,
  "prix_meilleur_marche": <prix des 10% annonces les moins chères observées TTC — référence "premier du net">,
  "prix_conseille_vente": <prix de vente conseillé TTC pour se positionner parmi les 20% moins chers du marché : compétitif et rapide à vendre>,
  "cote_argus_min": <cote Argus basse TTC>,
  "cote_argus_max": <cote Argus haute TTC>,
  "alerte": <"texte si données insuffisantes ou anomalie" | null>,
  "analyse": "<3-4 phrases expertes : positionnement marché, demande, liquidité, points clés>",
  "conseil_achat": "<COURT (3-4 phrases), simple et nuancé : type de véhicule à privilégier + le prix d'achat HT cible baisse quand le km monte (garder ≥ 3 000 € de marge, TTC plus compétitif). Pas de pavé, pas d'avis tranché, aucun nom de réseau/ville/label inventé.>",
  "conseil_vente": "<stratégie PREMIERS DU NET : prix exact conseillé TTC, écart vs prix moyen marché, argument face aux concurrents en ligne, délai rotation estimé si bien positionné>",
  "equipements_recherches": ["<équip1 très recherché>", "<équip2>", "<équip3>", "<équip4>"],
  "arguments_commerciaux": ["<argument fort 1 avec chiffre>", "<argument fort 2>", "<argument fort 3>"],
  "points_vigilance": ["<point vigilance 1>", "<point vigilance 2>", "<point vigilance 3>"],
  "annonces_par_source": [{"source": "<nom source>", "prix_min": 0, "prix_moy": 0, "prix_max": 0, "nb": 0}]
}`

  const { text: raw, usedWebSearch } = await sendMessage(
    [{ role: 'user', content: prompt }],
    { lang, maxTokens: withWebSearch ? 4096 : 2048, expert: true, temperature: 0.3, tool: 'veilleprix', webSearch: withWebSearch, maxSearches: 5, returnMeta: true }
  )
  return { ...extractJSON(raw, 'object'), usedWebSearch }
}

// ── Composants UI ─────────────────────────────────────────────────────────────
const selectClass = `w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
  text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition`

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </div>
  )
}

function KpiCard({ label, value, highlight, sub, small }) {
  return (
    <div className="glass-card p-3 text-center">
      <p className={`font-bold ${small ? 'text-sm' : 'text-lg'} ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{sub}</p>}
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function SectionTitle({ icon: Icon, label, color = 'text-slate-500' }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {Icon && <Icon size={11} className={color} />}
      <p className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</p>
    </div>
  )
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────
function HistoryPanel({ history, onRestore, onClear, t }) {
  if (history.length === 0) return null
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('history_title')} ({history.length})</span>
        </div>
        <button onClick={onClear} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 transition">
          <Trash2 size={10} /> {t('history_clear')}
        </button>
      </div>
      <div className="space-y-1.5">
        {history.map((item, i) => (
          <button
            key={i}
            onClick={() => onRestore(item)}
            className="w-full text-left px-3 py-2 rounded-xl bg-navy-900/40 border border-navy-700/30
                       hover:border-cyan-400/30 hover:bg-cyan-400/5 transition group"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{item.searchLabel}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                item.type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
              }`}>{item.type?.toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-slate-600">{new Date(item.savedAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PriceWatch() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const resultRef = useRef(null)

  const FUELS = [
    { label: t('price_fuel_all'), code: '' },
    { label: t('price_fuel_petrol'), code: 'ES' },
    { label: t('price_fuel_diesel'), code: 'GO' },
    { label: t('price_fuel_electric'), code: 'EL' },
    { label: t('price_fuel_hybrid'), code: 'HY' },
    { label: t('price_fuel_phev'), code: 'GH' },
    { label: t('price_fuel_lpg'), code: 'GP' },
  ]

  const GEARBOXES = [
    { label: t('price_gearbox_all'), code: '' },
    { label: t('price_gearbox_manual'), code: 'M' },
    { label: t('price_gearbox_auto'), code: 'A' },
  ]

  const BODIES = [
    { label: t('price_body_all'), code: '' },
    { label: t('price_body_berline'), code: 'berline' },
    { label: t('price_body_break'), code: 'break' },
    { label: t('price_body_suv'), code: 'suvcrossover' },
    { label: t('price_body_coupe'), code: 'coupe' },
    { label: t('price_body_cabriolet'), code: 'cabriolet' },
    { label: t('price_body_monospace'), code: 'monospace' },
    { label: t('price_body_citadine'), code: 'citadine' },
    { label: t('price_body_pickup'), code: 'pickup' },
  ]

  const MILEAGE_OPTS = [
    { label: t('price_mileage_all'), value: '' },
    { label: '< 10 000 km', value: '10000' },
    { label: '< 20 000 km', value: '20000' },
    { label: '< 30 000 km', value: '30000' },
    { label: '< 50 000 km', value: '50000' },
    { label: '< 80 000 km', value: '80000' },
    { label: '< 100 000 km', value: '100000' },
    { label: '< 150 000 km', value: '150000' },
    { label: '< 200 000 km', value: '200000' },
  ]

  const [type, setType]           = useState(() => readPwSession('type', 'vo'))
  const [make, setMake]           = useState(() => readPwSession('make', ''))
  const [model, setModel]         = useState(() => readPwSession('model', ''))
  const [finition, setFinition]   = useState(() => readPwSession('finition', ''))
  const [carrosserie, setCarrosserie] = useState(() => readPwSession('carrosserie', ''))
  const [yearMin, setYearMin]     = useState(() => readPwSession('yearMin', ''))
  const [yearMax, setYearMax]     = useState(() => readPwSession('yearMax', ''))
  const [mileageMax, setMileageMax] = useState(() => readPwSession('mileageMax', ''))
  const [fuel, setFuel]           = useState(() => readPwSession('fuel', ''))
  const [gearbox, setGearbox]     = useState(() => readPwSession('gearbox', ''))
  const [loading, setLoading]     = useState(false)
  const [step, setStep]           = useState('')
  const [result, setResult]       = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const [exporting, setExporting] = useState(false)
  const [isPartial, setIsPartial] = useState(false)
  const { history, add: addHistory, clear: clearHistory } = useHistory('pricewatch')

  // Persist filter state across page navigations (session-scoped)
  useEffect(() => {
    try {
      sessionStorage.setItem(PW_SESSION, JSON.stringify(
        { type, make, model, finition, carrosserie, yearMin, yearMax, mileageMax, fuel, gearbox }
      ))
    } catch {}
  }, [type, make, model, finition, carrosserie, yearMin, yearMax, mileageMax, fuel, gearbox])

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    const rawMake = overrides.make ?? make
    const matchedMake = MAKES.find(m => m.label.toLowerCase() === rawMake.toLowerCase())
    const resolvedMake = matchedMake ? matchedMake.code : rawMake
    const filters = { make: resolvedMake, model, finition, carrosserie, type, yearMin, yearMax, mileageMax, fuel, gearbox, ...overrides }
    const label = [filters.make, filters.model, filters.finition,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      filters.mileageMax && `< ${Number(filters.mileageMax).toLocaleString()} km`,
    ].filter(Boolean).join(' · ')

    setSearchLabel(label)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setStep(t('price_step_collecting'))
      const raw = await fetchPrices(filters)
      setFetchedAt(raw.fetchedAt)
      setCentraleUrl(raw.centraleUrl || '')

      // Phase 1 — estimation experte rapide (sans recherche web, ~5-8 s)
      // On affiche une première réponse pendant que la recherche web tourne.
      setStep(t('price_step_calculating'))
      try {
        const fastRaw = await analyzePrices(filters, FUELS, GEARBOXES, BODIES, lang, false)
        const fastAnalysis = applyPricingRules(fastRaw)
        setResult({ ...fastAnalysis, sources: raw.sources, hasLiveData: false, isPartial: true })
        setIsPartial(true)
        setLoading(false) // libère l'UI mais continue en arrière-plan
        setStep('')
      } catch { /* si la phase rapide échoue, on continue silencieusement */ }

      // Phase 2 — analyse complète avec recherche web réelle
      setLoading(true)
      setStep(t('ai_progress_search'))
      const rawAnalysis = await analyzePrices(filters, FUELS, GEARBOXES, BODIES, lang, true)
      // Achat pro + marge recalculés de façon déterministe (jamais l'arithmétique
      // approximative de l'IA) : Vente HT − 450 transport − 3 000 marge partenaire.
      const analysis = applyPricingRules(rawAnalysis)
      // hasLiveData = vrai uniquement si Claude a réellement effectué une
      // recherche web (server_tool_use), sinon estimation experte.
      const finalResult = { ...analysis, sources: raw.sources, hasLiveData: analysis.usedWebSearch, isPartial: false }
      setResult(finalResult)
      setIsPartial(false)
      addHistory({ searchLabel: label, type: filters.type, result: finalResult })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  const handleCsv = () => {
    if (!result) return
    const rows = [
      ['Véhicule', searchLabel],
      ['Type', type === 'vo' ? 'Occasion' : 'Neuf'],
      ['Date', fetchedAt ? new Date(fetchedAt).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')],
      ['Prix moyen TTC (€)', result.prix_moyen ?? ''],
      ['Prix médian TTC (€)', result.prix_median ?? ''],
      ['Quartile bas Q1 (€)', result.prix_q1 ?? ''],
      ['Quartile haut Q3 (€)', result.prix_q3 ?? ''],
      ['Nb annonces estimé', result.nb_annonces_estim ?? ''],
      ['Tendance', result.tendance ?? ''],
      ['Évolution (%)', result.tendance_pct ?? ''],
      ['Meilleur prix du net (€)', result.prix_meilleur_marche ?? ''],
      ['Prix conseillé vente (€)', result.prix_conseille_vente ?? ''],
      ['Achat HT min (€)', result.prix_achat_ht_min ?? ''],
      ['Achat HT max (€)', result.prix_achat_ht_max ?? ''],
      ['Cote Argus min (€)', result.cote_argus_min ?? ''],
      ['Cote Argus max (€)', result.cote_argus_max ?? ''],
      ['Malus client final B2C (€)', result.malus_estime ?? ''],
      ['Marge brute potentielle (€)', result.marge_brute_potentielle ?? ''],
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFileName(searchLabel).replace('.pdf', '.csv')
    a.click()
    URL.revokeObjectURL(url)
  }

  const TrendIcon   = result?.tendance === 'hausse' ? TrendingUp : result?.tendance === 'baisse' ? TrendingDown : Minus
  const trendColor  = result?.tendance === 'hausse' ? 'text-red-400' : result?.tendance === 'baisse' ? 'text-emerald-400' : 'text-slate-400'
  const trendBg     = result?.tendance === 'hausse' ? 'bg-red-400/10' : result?.tendance === 'baisse' ? 'bg-emerald-400/10' : 'bg-slate-700/40'
  const trendLabel  = result?.tendance === 'hausse' ? t('market_up') : result?.tendance === 'baisse' ? t('market_down') : t('market_stable')

  const fmtEur = (v) => v ? `${formatNumber(v)} €` : 'N/D'
  const fmtHT  = (v) => v ? `${formatNumber(v)} € HT` : 'N/D'
  const fmtPct = (v) => v ? `${v}%` : 'N/D'

  const handlePdf = async () => {
    setExporting(true)
    try {
      await exportToPdf(resultRef, pdfFileName(searchLabel), { title: t('tool_price_title'), subtitle: searchLabel })
    } finally {
      setExporting(false)
    }
  }

  const reset = () => {
    setResult(null); setMake(''); setModel(''); setFinition(''); setCarrosserie('')
    setYearMin(''); setYearMax(''); setMileageMax(''); setFuel(''); setGearbox('')
    setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null)
  }

  const restore = (item) => {
    setResult(item.result)
    setSearchLabel(item.searchLabel)
    setType(item.type)
    setFetchedAt(null)
    setCentraleUrl('')
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('tool_price_title')}</h2>
          <span className="text-xs text-slate-500 hidden sm:inline">{t('price_sources_label')}</span>
        </div>

        {/* VO / VN toggle */}
        <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit mb-4 border border-navy-700/40">
          {[{ id: 'vo', label: t('used_vehicle') }, { id: 'vn', label: t('new_vehicle') }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setType(tab.id); if (tab.id === 'vn') setMileageMax('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                type === tab.id ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ligne 1 : Marque + Modèle + Année min + Année max */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('make_label')}</label>
            <input
              type="text" value={make} onChange={e => setMake(e.target.value)}
              list="makes-list" placeholder={t('make_ph')} aria-label={t('make_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
            <datalist id="makes-list">
              {MAKES.map(m => <option key={m.code} value={m.label} />)}
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('model_label')}</label>
            <input
              type="text" value={model} onChange={e => setModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_model_ph')} aria-label={t('model_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>

          <FilterSelect label={t('year_min')} value={yearMin} onChange={setYearMin}>
            <option value="">{t('year_min')}</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>

          <FilterSelect label={t('year_max')} value={yearMax} onChange={setYearMax}>
            <option value="">{t('year_max')}</option>
            {YEARS.filter(y => !yearMin || y >= Number(yearMin)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>
        </div>

        {/* Ligne 1b : Finition + Carrosserie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('price_finition_label')}</label>
            <input
              type="text" value={finition} onChange={e => setFinition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_finition_ph')} aria-label={t('price_finition_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>
          <FilterSelect label={t('price_body_label')} value={carrosserie} onChange={setCarrosserie}>
            {BODIES.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
          </FilterSelect>
        </div>

        {/* Ligne 2 : Km max (VO only) + Carburant + Boîte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {type === 'vo' && (
            <FilterSelect label={t('km_max')} value={mileageMax} onChange={setMileageMax}>
              {MILEAGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          <FilterSelect label={t('fuel_label')} value={fuel} onChange={setFuel}>
            {FUELS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('gearbox_label')} value={gearbox} onChange={setGearbox}>
            {GEARBOXES.map(g => <option key={g.code} value={g.code}>{g.label}</option>)}
          </FilterSelect>
        </div>

        {/* Bouton */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => search()} disabled={!canSearch || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Spinner size="sm" /> : <Search size={14} />}
            {loading ? t('analyzing') : t('analyze_btn')}
          </button>

          {centraleUrl && !loading && (
            <a href={centraleUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                         px-3 py-2.5 rounded-xl hover:text-cyan-400 hover:border-cyan-400/30 transition">
              <ExternalLink size={12} /> {t('price_see_listing')}
            </a>
          )}
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <AIProgress
            active={loading}
            stages={[t('price_step_collecting'), t('ai_progress_search'), t('ai_progress_analyze'), t('ai_progress_format')]}
            estimatedMs={38000}
            persistKey="pricewatch"
          />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="glass-card p-4 flex gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Résultats ────────────────────────────────────────────────────────── */}
      {result && (!loading || isPartial) && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{searchLabel}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
                }`}>{type === 'vo' ? t('used_vehicle') : t('new_vehicle')}</span>

                {/* Data source badge — piloté par hasLiveData (API), pas par l'IA */}
                {result.hasLiveData ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                    <Wifi size={9} /> {t('price_live_badge')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                    <WifiOff size={9} /> {t('price_knowledge_badge')}
                  </span>
                )}

                {result.isPartial && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 animate-pulse">
                    <RefreshCw size={9} /> Mise à jour live…
                  </span>
                )}

                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
              <button onClick={handleCsv}
                className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                           px-3 py-1.5 rounded-lg hover:text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition flex-shrink-0">
                <FileText size={12} />
                {t('csv_export')}
              </button>
              <button onClick={handlePdf} disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                           px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                {t('download_pdf')}
              </button>
              <button onClick={() => search()}
                className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                           px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition flex-shrink-0">
                <RefreshCw size={12} /> {t('analyze_btn')}
              </button>
              <button onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30 flex-shrink-0">
                <RotateCcw size={11} /> {t('new_analysis_btn')}
              </button>
            </div>
          </div>

          <div ref={resultRef} className="space-y-3">

          {/* Alerte */}
          {result.alerte && (
            <div className="flex gap-2 p-3 rounded-xl bg-warn/10 border border-warn/20">
              <AlertCircle size={14} className="text-warn flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warn font-medium">{result.alerte}</p>
            </div>
          )}

          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiCard label={t('avg_price')} value={fmtEur(result.prix_moyen)} highlight sub={t('excl_outliers')} />
            <KpiCard label={t('median_price')} value={fmtEur(result.prix_median)} />
            <KpiCard
              label={t('price_range')}
              value={result.prix_q1 && result.prix_q3
                ? `${formatNumber(result.prix_q1)} – ${formatNumber(result.prix_q3)} €`
                : 'N/D'}
              sub={t('percentile')}
            />
            <KpiCard label={t('listings_est')} value={result.nb_annonces_estim ? `~${result.nb_annonces_estim}` : 'N/D'} />
          </div>

          {/* Analyse expert + pro en 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* Cotation expert */}
            <div className="glass-card p-4">
              <SectionTitle icon={Tag} label={t('price_expert_section')} color="text-cyan-400" />
              <div className="grid grid-cols-2 gap-2">
                <KpiCard label={t('price_catalogue_label')} value={fmtEur(result.prix_neuf_catalogue)} small />
                <KpiCard label={t('price_decote_label')} value={fmtPct(result.decote_annuelle_pct)} small />
                <KpiCard label={t('price_vr_1an')} value={fmtEur(result.valeur_residuelle_1an)} small />
                <KpiCard label={t('price_vr_3ans')} value={fmtEur(result.valeur_residuelle_3ans)} small />
              </div>
              {(result.cote_argus_min || result.cote_argus_max) && (
                <div className="mt-2 px-3 py-2 bg-navy-900/40 rounded-lg border border-navy-700/30">
                  <p className="text-[10px] text-slate-500 mb-0.5">{t('price_argus_range')}</p>
                  <p className="text-sm font-bold text-white">
                    {formatNumber(result.cote_argus_min)} – {formatNumber(result.cote_argus_max)} €
                  </p>
                </div>
              )}
            </div>

            {/* Pricing pro */}
            <div className="glass-card p-4">
              <SectionTitle icon={Zap} label={t('price_pro_section')} color="text-emerald-400" />
              {/* Prix compétitifs — priorité absolue */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <KpiCard label={t('price_best_market')} value={fmtEur(result.prix_meilleur_marche)} sub="TOP 10% marché" small />
                <KpiCard label={t('price_conseille_vente')} value={fmtEur(result.prix_conseille_vente)} highlight sub="TTC compétitif" small />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <KpiCard
                  label={t('price_pro_range')}
                  value={result.fourchette_achat_pro_min && result.fourchette_achat_pro_max
                    ? `${formatNumber(result.fourchette_achat_pro_min)} – ${formatNumber(result.fourchette_achat_pro_max)} €`
                    : 'N/D'}
                  sub={t('price_pro_range_sub')} small
                />
                <KpiCard
                  label={t('price_margin_label')}
                  value={fmtEur(result.marge_brute_potentielle)}
                  sub={result.fourchette_achat_pro_max
                    ? t('price_margin_sub').replace('{p}', formatNumber(result.fourchette_achat_pro_max))
                    : t('price_margin_sub_generic')}
                  small
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{result.conseil_achat}</p>
            </div>
          </div>

          {/* Malus client final — lien centré vers le calculateur du site */}
          <div className="glass-card p-4 flex justify-center">
            <Link
              to="/co2-malus"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warn/10 border border-warn/30
                         text-sm font-bold text-warn hover:bg-warn/20 active:scale-95 transition-all"
            >
              <Calculator size={15} /> {t('price_malus_calc_link')}
            </Link>
          </div>

          {/* Tendance */}
          <div className="glass-card p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${trendBg}`}>
              <TrendIcon size={22} className={trendColor} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-base font-bold ${trendColor}`}>{trendLabel}</p>
                {result.tendance_pct !== 0 && (
                  <span className={`text-sm font-semibold ${trendColor}`}>
                    {result.tendance === 'hausse' ? '+' : result.tendance === 'baisse' ? '-' : ''}
                    {Math.abs(result.tendance_pct)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">{result.analyse}</p>
            </div>
          </div>

          {/* Annonces par source */}
          {result.annonces_par_source?.length > 0 && (
            <div className="glass-card p-4">
              <SectionTitle label={t('price_per_source')} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-700/30">
                      <th className="text-left text-slate-500 font-semibold pb-1.5 pr-3">{t('sources_consulted')}</th>
                      <th className="text-right text-slate-500 font-semibold pb-1.5 px-2">{t('import_price_min')}</th>
                      <th className="text-right text-slate-500 font-semibold pb-1.5 px-2">{t('import_price_avg')}</th>
                      <th className="text-right text-slate-500 font-semibold pb-1.5 px-2">{t('import_price_max')}</th>
                      <th className="text-right text-slate-500 font-semibold pb-1.5 pl-2">{t('listings_est')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.annonces_par_source.map((s, i) => (
                      <tr key={i} className="border-b border-navy-700/20 last:border-0">
                        <td className="py-1.5 pr-3 text-slate-300 font-medium">{s.source}</td>
                        <td className="py-1.5 px-2 text-right text-slate-400">{s.prix_min ? formatNumber(s.prix_min) + ' €' : '—'}</td>
                        <td className="py-1.5 px-2 text-right text-cyan-400 font-semibold">{s.prix_moy ? formatNumber(s.prix_moy) + ' €' : '—'}</td>
                        <td className="py-1.5 px-2 text-right text-slate-400">{s.prix_max ? formatNumber(s.prix_max) + ' €' : '—'}</td>
                        <td className="py-1.5 pl-2 text-right text-slate-500">{s.nb ? `~${s.nb}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conseil vente */}
          <div className="glass-card p-4">
            <SectionTitle label={t('sell_advice')} color="text-cyan-400" />
            <p className="text-sm text-slate-200 leading-relaxed">{result.conseil_vente}</p>
          </div>

          {/* Équipements + Arguments + Vigilance en grille */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Équipements recherchés */}
            {result.equipements_recherches?.length > 0 && (
              <div className="glass-card p-4">
                <SectionTitle icon={Tag} label={t('price_equipements_label')} color="text-violet-400" />
                <div className="flex flex-wrap gap-1.5">
                  {result.equipements_recherches.map((eq, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-300 border border-violet-400/20">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Arguments commerciaux */}
            {result.arguments_commerciaux?.length > 0 && (
              <div className="glass-card p-4">
                <SectionTitle icon={Zap} label={t('price_arguments_label')} color="text-emerald-400" />
                <ul className="space-y-1.5">
                  {result.arguments_commerciaux.map((arg, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-xs text-slate-200 leading-relaxed">{arg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Points de vigilance */}
            {result.points_vigilance?.length > 0 && (
              <div className="glass-card p-4">
                <SectionTitle icon={ShieldCheck} label={t('price_vigilance_label')} color="text-warn" />
                <ul className="space-y-1.5">
                  {result.points_vigilance.map((pt, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-warn mt-0.5 flex-shrink-0">⚠</span>
                      <span className="text-xs text-slate-200 leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sources + lien La Centrale */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">{t('sources_consulted')}</p>
            <div className="flex flex-wrap gap-2">
              {result.sources?.map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-slate-400 bg-navy-700/40 border border-navy-600/30
                             px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                  {s.name} <ExternalLink size={10} />
                </a>
              ))}
              {!result.hasLiveData && (
                <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-400/5 border border-violet-400/20 px-2.5 py-1 rounded-lg">
                  <WifiOff size={10} /> {t('price_knowledge_badge')}
                </span>
              )}
              {centraleUrl && (
                <a href={centraleUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/5 border border-cyan-400/20
                             px-2.5 py-1 rounded-lg hover:bg-cyan-400/10 transition ml-auto">
                  <SlidersHorizontal size={10} /> {t('open_la_centrale')}
                </a>
              )}
            </div>
          </div>

          </div>{/* end resultRef */}
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!result && !loading && !error && (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('select_brand_model')}</p>
          <p className="text-xs text-slate-600">{t('refine_filters')}</p>
        </div>
      )}

      <HistoryPanel history={history} onRestore={restore} onClear={clearHistory} t={t} />
    </div>
  )
}
