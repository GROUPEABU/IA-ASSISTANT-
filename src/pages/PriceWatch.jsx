import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Search, RotateCcw, ExternalLink, Clock, Download, FileText,
  Wifi, WifiOff, Calculator, Sparkles,
} from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import { mdToHtml } from '@/utils/mdToHtml'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
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

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchSources(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

// Construit le prompt de l'analyse streamée (rapport Markdown, pas de JSON).
function buildPrompt(filters, vehicleDesc) {
  const kmTxt = filters.mileageMax ? `${Number(filters.mileageMax).toLocaleString('fr-FR')} km` : null
  const finitionFilter = filters.finition
    ? `\n⚠️ FINITION STRICTE : analyse UNIQUEMENT la version "${filters.finition}".` : ''
  const kmFilter = kmTxt
    ? `\n⚠️ KILOMÉTRAGE STRICT : analyse UNIQUEMENT les annonces avec ≤ ${kmTxt} réels au compteur. EXCLUS les véhicules quasi-neufs / mandataires (< 5 000 km) — ce ne sont PAS la référence « premier du net » ici, même s'ils sont moins chers.` : ''
  const anneeTxt = filters.yearMin && filters.yearMax
    ? (filters.yearMin === filters.yearMax ? `millésime ${filters.yearMin}` : `millésimes ${filters.yearMin} à ${filters.yearMax}`)
    : filters.yearMin ? `millésime ${filters.yearMin} ou plus récent`
    : filters.yearMax ? `millésime ${filters.yearMax} ou plus ancien` : null
  const anneeFilter = anneeTxt
    ? `\n⚠️ ANNÉE STRICTE : le véhicule analysé est de ${anneeTxt}. Raisonne EXCLUSIVEMENT sur ce millésime. N'écris JAMAIS une autre année (ex. 2024) si elle ne correspond pas au filtre — utilise l'année demandée pour la cote, la décote et les prix.` : ''

  return `Tu es l'analyste cote & marché automobile ${filters.type === 'vn' ? 'VN (neuf)' : 'VO (occasion)'} d'Autobuyunion, centrale d'achat européenne. Tu réponds comme dans une conversation : un rapport clair, direct, en Markdown, prêt à lire.

VÉHICULE CIBLE : "${vehicleDesc}"${finitionFilter}${kmFilter}${anneeFilter}

RECHERCHE WEB : utilise l'outil de recherche web (2-3 requêtes max) pour relever les annonces réelles correspondant EXACTEMENT aux filtres (kilométrage inclus) sur La Centrale, LeBonCoin, AutoScout24, et repérer le niveau des « premiers du net » (annonces les moins chères réellement disponibles). Si rien d'exploitable, base-toi sur ta connaissance experte du marché français et signale-le.

PHILOSOPHIE (à respecter absolument) : l'OBJECTIF est de GÉNÉRER DE LA MARGE, pas de brader. Le partenaire se positionne PARMI LES PREMIERS DU NET (offre attractive, vend bien) et, de temps en temps seulement, légèrement EN DESSOUS du 1er du net pour accélérer — sans jamais casser les prix.

MÉTHODE DE COTATION (applique-la précisément, par véhicule) :
1. PREMIER PRIX DU NET = annonce la moins chère réellement dispo correspondant aux filtres.
2. Prix de revente conseillé TTC = se positionner parmi les premiers du net (au niveau, ou légèrement en dessous pour vendre vite) — JAMAIS brader.
3. CALCUL DU PRIX D'ACHAT PRO — il se déduit DIRECTEMENT du 1er du net, avec la marge plancher de 3 000 € HT.
   FORMULE (applique-la telle quelle) :
     prix d'achat pro HT = (revente 1er du net TTC ÷ 1,20) − 450 (transport UE) − 3 000 (marge plancher).
   N'invente PAS un prix d'achat plus bas pour gonfler la marge : le prix d'achat CONSEILLÉ est celui qui
   sécurise pile 3 000 € de marge tout en se positionnant parmi les premiers du net. Ne déduis JAMAIS de
   marge groupe ni le malus de cette cascade.

   ⚠️ FOURCHETTE PILOTÉE PAR LE KILOMÉTRAGE (point clé) — applique la formule aux DEUX bornes :
   - Borne BASSE = FORT km : prends la revente 1er du net au HAUT de la plage de km autorisée (ex. proche du
     plafond km du filtre, ~40 000–50 000 km), donc la revente la PLUS BASSE. N'utilise PAS une annonce à
     20 000 km pour la borne fort km : ce serait trop haut.
   - Borne HAUTE = FAIBLE km : revente 1er du net faible km (~5 000–12 000 km), la plus haute.
   Les 3 000 € de marge doivent être SÉCURISÉS aux deux bornes (pile 3 000 € à ce prix d'achat).

   EXEMPLE (Citroën C5 Aircross MAX hybride, méthode à reproduire À L'IDENTIQUE) :
   • Fort km (~50 000 km) : 1er du net ~24 000 € TTC → 24 000 ÷ 1,20 − 450 − 3 000 = 16 550 € HT.
   • Faible km (~10 000 km) : 1er du net ~25 200 € TTC → 25 200 ÷ 1,20 − 450 − 3 000 = 17 550 € HT.
   → Prix d'achat pro CONSEILLÉ : 16 550 – 17 550 € HT (3 000 € de marge sécurisés à chaque borne).

   POUR AUGMENTER LA MARGE (conseil, jamais en bradant) : on peut soit négocier l'achat un peu PLUS BAS que
   ces valeurs, soit positionner la revente un peu PLUS HAUT (toujours parmi les premiers du net). Chaque euro
   gagné à l'achat ou à la vente s'ajoute aux 3 000 €. Mais le prix d'achat AFFICHÉ reste celui de la formule
   ci-dessus (ancré sur le 1er du net réel), pas un prix artificiellement bas.

4. Le MALUS écologique est à la charge du CLIENT FINAL (B2C) — info seule, jamais déduit de l'achat/marge.
5. Ne déconseille jamais le fort km : il fait simplement BAISSER le prix d'achat cible (bas de fourchette) tout en préservant la marge et en offrant un TTC plus compétitif au client final.

RÈGLES :
- Vouvoiement, ton mesuré et pro. Pas d'avis trop tranché.
- Ne cite JAMAIS de nom de réseau/mandataire/enseigne/concession/label ni de ville précise (tu les inventerais).
- Chiffres réalistes en €, fourchettes si incertain. Jamais de chiffre inventé donné comme certain.

STYLE DE RÉDACTION : professionnel, sobre et posé. AUCUN emoji, aucune icône, aucun symbole décoratif. Phrases claires et aérées, vouvoiement. Le rendu doit faire haut de gamme.

FORMAT DE SORTIE — Markdown épuré, sections aérées, dans cet ordre EXACT (titres en ## SANS emoji) :

## L'essentiel
- **Revente conseillée (1er du net)** : … € TTC (fort km) – … € TTC (faible km)
- **Prix d'achat pro conseillé** : … – … € HT (calculé sur le 1er du net, marge 3 000 € HT incluse)
- **Marge dégageable** : 3 000 € HT à ce prix d'achat — davantage en négociant l'achat plus bas

**À retenir** : le prix d'achat est calculé à partir du 1er du net (revente ÷ 1,20 − 450 transport − 3 000 marge). Objectif = générer de la marge, pas brader : on se positionne parmi les premiers du net. Pour gagner plus, on achète un peu plus bas ou on revend un peu plus haut, jamais en cassant les prix.

## Repères marché
Tableau Markdown : Prix moyen | Prix médian | Fourchette courante | Nb annonces estimé (tous en TTC).

## Cotation & décote
PVC neuf catalogue, décote annuelle %, valeur résiduelle 1 an / 3 ans, cote Argus indicative.

## Stratégie de vente "1er du net"
Prix exact conseillé TTC, écart vs moyenne marché, argument face aux concurrents en ligne. NE DONNE PAS de délai de rotation (donnée inconnue).

## Arguments commerciaux
3 puces fortes avec chiffres.

## Points de vigilance
3 puces.

NE PARLE PAS du malus dans ce rapport (un bouton dédié renvoie déjà vers le calculateur). Commence directement par "## L'essentiel", sans phrase d'introduction.`
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

  const [loading, setLoading]     = useState(false)   // avant le 1er token
  const [streaming, setStreaming] = useState(false)   // tokens en cours d'arrivée
  const [report, setReport]       = useState('')      // texte Markdown streamé
  const [hasLiveData, setHasLiveData] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [sources, setSources]     = useState([])
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const { history, add: addHistory, clear: clearHistory } = useHistory('pricewatch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()

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

    const vehicleDesc = [
      rawMake, filters.model, filters.finition,
      filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
        : filters.yearMin ? `depuis ${filters.yearMin}` : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
      filters.mileageMax ? `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km` : '',
      filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label : '',
      filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label : '',
      filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label : '',
    ].filter(Boolean).join(' · ')

    const label = [filters.make, filters.model, filters.finition,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      filters.mileageMax && `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`,
    ].filter(Boolean).join(' · ')

    saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
    setSearchLabel(label)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')
    setHasLiveData(false)

    try {
      // Liens de référence (La Centrale, etc.) — affichage immédiat.
      const meta = await fetchSources(filters)
      setFetchedAt(meta.fetchedAt)
      setCentraleUrl(meta.centraleUrl || '')
      setSources(meta.sources || [])

      // Analyse streamée en direct (comme le chat) — le texte s'affiche au fil
      // de l'eau dès le 1er token reçu.
      let first = true
      const { text, usedWebSearch } = await sendMessage(
        [{ role: 'user', content: buildPrompt(filters, vehicleDesc) }],
        {
          lang, expert: true, temperature: 0.3, tool: 'veilleprix',
          webSearch: true, maxSearches: 3, maxTokens: 3500,
          returnMeta: true, stream: true,
          onChunk: (full) => {
            if (first) { first = false; setLoading(false); setStreaming(true) }
            setReport(full)
          },
        }
      )
      setReport(text)
      setHasLiveData(!!usedWebSearch)
      setStreaming(false)
      saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
      addHistory({ searchLabel: label, type: filters.type, report: text, hasLiveData: !!usedWebSearch, fetchedAt: meta.fetchedAt, sources: meta.sources, centraleUrl: meta.centraleUrl })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(searchLabel), { title: t('tool_price_title'), subtitle: searchLabel })
  )

  const reset = () => {
    setReport(''); setMake(''); setModel(''); setFinition(''); setCarrosserie('')
    setYearMin(''); setYearMax(''); setMileageMax(''); setFuel(''); setGearbox('')
    setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null); setSources([]); setHasLiveData(false)
  }

  const restore = (item) => {
    setReport(item.report || '')
    setSearchLabel(item.searchLabel)
    setType(item.type)
    setHasLiveData(!!item.hasLiveData)
    setFetchedAt(item.fetchedAt || null)
    setSources(item.sources || [])
    setCentraleUrl(item.centraleUrl || '')
  }

  const showResult = (loading || streaming || report) && !error

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
            onClick={() => search()} disabled={!canSearch || loading || streaming}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {(loading || streaming) ? <Spinner size="sm" /> : <Search size={14} />}
            {(loading || streaming) ? t('analyzing') : t('analyze_btn')}
          </button>

          {centraleUrl && !loading && !streaming && (
            <a href={centraleUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                         px-3 py-2.5 rounded-xl hover:text-cyan-400 hover:border-cyan-400/30 transition">
              <ExternalLink size={12} /> {t('price_see_listing')}
            </a>
          )}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && <ErrorAlert message={error} onRetry={() => search()} />}

      {/* ── Résultat streamé ─────────────────────────────────────────────────── */}
      {showResult && (
        <>
          {/* Header + actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{searchLabel || t('tool_price_title')}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
                }`}>{type === 'vo' ? t('used_vehicle') : t('new_vehicle')}</span>

                {streaming ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 animate-pulse">
                    <Sparkles size={9} /> {t('price_live_refreshing')}
                  </span>
                ) : report ? (
                  hasLiveData ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      <Wifi size={9} /> {t('price_live_badge')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                      <WifiOff size={9} /> {t('price_knowledge_badge')}
                    </span>
                  )
                ) : null}

                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {report && !streaming && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
                <button onClick={handlePdf} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={() => search()}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                             px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition flex-shrink-0">
                  <Search size={12} /> {t('analyze_btn')}
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30 flex-shrink-0">
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          {/* Loading avant 1er token */}
          {loading && !report && (
            <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
              <Spinner />
              <p className="text-sm text-slate-400">{t('price_step_calculating')}</p>
              <p className="text-xs text-slate-600">{t('price_step_collecting')}</p>
            </div>
          )}

          {/* Rapport Markdown streamé */}
          {report && (
            <div ref={resultRef} className="space-y-3">
              <div className="glass-card p-6 md:p-8">
                <div className="report-md text-slate-200"
                     dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
                {streaming && (
                  <span className="inline-block w-0.5 h-[1em] bg-cyan-400 animate-pulse align-middle ml-0.5 opacity-80" />
                )}
              </div>

              {/* Malus — lien centré vers le calculateur */}
              {!streaming && (
                <div className="glass-card p-4 flex justify-center">
                  <Link to="/co2-malus"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warn/10 border border-warn/30
                               text-sm font-bold text-warn hover:bg-warn/20 active:scale-95 transition-all">
                    <Calculator size={15} /> {t('price_malus_calc_link')}
                  </Link>
                </div>
              )}

              {/* Sources */}
              {!streaming && (sources.length > 0 || centraleUrl) && (
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">{t('sources_consulted')}</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map(s => (
                      <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 bg-navy-700/40 border border-navy-600/30
                                   px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                        {s.name} <ExternalLink size={10} />
                      </a>
                    ))}
                    {!hasLiveData && (
                      <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-400/5 border border-violet-400/20 px-2.5 py-1 rounded-lg">
                        <WifiOff size={10} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!showResult && !error && (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('select_brand_model')}</p>
          <p className="text-xs text-slate-600">{t('refine_filters')}</p>
        </div>
      )}

      <HistoryPanel
        items={history}
        onRestore={restore}
        onClear={clearHistory}
        primary={(item) => item.searchLabel}
        badge={(item) => (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
            item.type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
          }`}>{item.type?.toUpperCase()}</span>
        )}
      />
    </div>
  )
}
