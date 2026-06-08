import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Search, RotateCcw, ExternalLink, Clock, Download, FileText,
  Wifi, WifiOff, Calculator, Sparkles, ShieldCheck,
} from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { buildPrompt } from '@/services/veillePrixPrompt'
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

const COUNTRIES = [
  { code: 'FR', label: 'France',      tva: 1.20,  transport: 450,  tld: 'fr', as24cy: 'F',   sites: 'La Centrale, LeBonCoin, AutoScout24.fr' },
  { code: 'BE', label: 'Belgique',    tva: 1.21,  transport: 450,  tld: 'be', as24cy: 'B',   sites: 'AutoScout24.be, 2dehands.be, Vroom.be' },
  { code: 'LU', label: 'Luxembourg',  tva: 1.17,  transport: 450,  tld: 'lu', as24cy: 'L',   sites: 'AutoScout24.lu, Luxauto.lu' },
  { code: 'DE', label: 'Allemagne',   tva: 1.19,  transport: 450,  tld: 'de', as24cy: 'D',   sites: 'mobile.de, AutoScout24.de' },
  { code: 'NL', label: 'Pays-Bas',    tva: 1.21,  transport: 450,  tld: 'nl', as24cy: 'NL',  sites: 'AutoScout24.nl, Marktplaats.nl' },
  { code: 'ES', label: 'Espagne',     tva: 1.21,  transport: 450,  tld: 'es', as24cy: 'E',   sites: 'AutoScout24.es, Coches.net' },
  { code: 'IT', label: 'Italie',      tva: 1.22,  transport: 450,  tld: 'it', as24cy: 'I',   sites: 'AutoScout24.it, Subito.it' },
  { code: 'PT', label: 'Portugal',    tva: 1.23,  transport: 450,  tld: 'pt', as24cy: 'P',   sites: 'AutoScout24.pt, CustoJusto.pt' },
  { code: 'CH', label: 'Suisse',      tva: 1.081, transport: 450, tld: 'ch', as24cy: 'CH',  currency: 'CHF', sites: 'AutoScout24.ch, Tutti.ch' },
  { code: 'HR', label: 'Croatie',     tva: 1.25,  transport: 450, tld: 'hr', as24cy: 'HR',  sites: 'AutoScout24.hr, Njuškalo.hr' },
  { code: 'PL', label: 'Pologne',     tva: 1.23,  transport: 450, tld: 'pl', as24cy: 'PL',  currency: 'PLN', sites: 'OtoMoto.pl, AutoScout24.pl' },
  { code: 'SE', label: 'Suède',       tva: 1.25,  transport: 450, tld: 'se', as24cy: 'S',   currency: 'SEK', sites: 'Blocket.se, AutoScout24.se' },
  { code: 'NO', label: 'Norvège',     tva: 1.25,  transport: 450, tld: 'no', as24cy: 'N',   currency: 'NOK', sites: 'Finn.no, AutoScout24.no' },
  { code: 'FI', label: 'Finlande',    tva: 1.255, transport: 450, tld: 'fi', as24cy: 'FIN', sites: 'Nettiauto.com, AutoScout24.fi' },
  { code: 'MA', label: 'Maroc',       tva: 1.20,  transport: 450, tld: 'ma', as24cy: null,  currency: 'MAD', sites: 'Avito.ma, Moteur.ma' },
  { code: 'TN', label: 'Tunisie',     tva: 1.19,  transport: 450, tld: 'tn', as24cy: null,  currency: 'TND', sites: 'Tayara.tn' },
  { code: 'DZ', label: 'Algérie',     tva: 1.19,  transport: 450, tld: 'dz', as24cy: null,  currency: 'DZD', sites: 'Ouedkniss.com' },
]

const AS24_FUEL = { ES: '1', GO: '2', GP: '3', EL: '6', HY: '8', GH: '10' }
function buildAs24Url(ctry, filters) {
  if (!ctry.as24cy) return null
  const makeSlug = (filters.make || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const modelSlug = (filters.model || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const p = ['atype=C', `cy=${ctry.as24cy}`, 'damaged_listing=exclude', 'sort=standard', 'ustate=N%2CU']
  if (filters.yearMin)    p.push(`fregfrom=${filters.yearMin}`)
  if (filters.yearMax)    p.push(`fregto=${filters.yearMax}`)
  if (filters.mileageMin) p.push(`kmfrom=${filters.mileageMin}`)
  if (filters.mileageMax) p.push(`kmto=${filters.mileageMax}`)
  if (filters.fuel && AS24_FUEL[filters.fuel]) p.push(`fuel=${AS24_FUEL[filters.fuel]}`)
  const base = makeSlug ? `https://www.autoscout24.${ctry.tld}/lst/${makeSlug}${modelSlug ? '/' + modelSlug : ''}` : `https://www.autoscout24.${ctry.tld}/`
  return `${base}?${p.join('&')}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchSources(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
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

  const MILEAGE_MIN_OPTS = [
    { label: t('km_min'), value: '' },
    { label: '≥ 500 km', value: '500' },
    { label: '≥ 5 000 km', value: '5000' },
    { label: '≥ 10 000 km', value: '10000' },
    { label: '≥ 20 000 km', value: '20000' },
    { label: '≥ 30 000 km', value: '30000' },
    { label: '≥ 50 000 km', value: '50000' },
  ]
  const MILEAGE_MAX_OPTS = [
    { label: t('km_max'), value: '' },
    { label: '< 10 000 km', value: '10000' },
    { label: '< 20 000 km', value: '20000' },
    { label: '< 30 000 km', value: '30000' },
    { label: '< 50 000 km', value: '50000' },
    { label: '< 80 000 km', value: '80000' },
    { label: '< 100 000 km', value: '100000' },
    { label: '< 150 000 km', value: '150000' },
    { label: '< 200 000 km', value: '200000' },
  ]

  const POWER_MIN_OPTS = [
    { label: t('power_min'), value: '' },
    { label: '≥ 50 ch', value: '50' },
    { label: '≥ 75 ch', value: '75' },
    { label: '≥ 90 ch', value: '90' },
    { label: '≥ 100 ch', value: '100' },
    { label: '≥ 110 ch', value: '110' },
    { label: '≥ 130 ch', value: '130' },
    { label: '≥ 150 ch', value: '150' },
    { label: '≥ 170 ch', value: '170' },
    { label: '≥ 200 ch', value: '200' },
    { label: '≥ 250 ch', value: '250' },
    { label: '≥ 300 ch', value: '300' },
    { label: '≥ 400 ch', value: '400' },
  ]
  const POWER_MAX_OPTS = [
    { label: t('power_max'), value: '' },
    { label: '< 75 ch', value: '75' },
    { label: '< 90 ch', value: '90' },
    { label: '< 100 ch', value: '100' },
    { label: '< 110 ch', value: '110' },
    { label: '< 130 ch', value: '130' },
    { label: '< 150 ch', value: '150' },
    { label: '< 170 ch', value: '170' },
    { label: '< 200 ch', value: '200' },
    { label: '< 250 ch', value: '250' },
    { label: '< 300 ch', value: '300' },
    { label: '< 400 ch', value: '400' },
    { label: '< 500 ch', value: '500' },
  ]

  const [type, setType]           = useState(() => readPwSession('type', 'vo'))
  const [make, setMake]           = useState(() => readPwSession('make', ''))
  const [model, setModel]         = useState(() => readPwSession('model', ''))
  const [finition, setFinition]   = useState(() => readPwSession('finition', ''))
  const [carrosserie, setCarrosserie] = useState(() => readPwSession('carrosserie', ''))
  const [yearMin, setYearMin]     = useState(() => readPwSession('yearMin', ''))
  const [yearMax, setYearMax]     = useState(() => readPwSession('yearMax', ''))
  const [mileageMin, setMileageMin] = useState(() => readPwSession('mileageMin', ''))
  const [mileageMax, setMileageMax] = useState(() => readPwSession('mileageMax', ''))
  const [fuel, setFuel]           = useState(() => readPwSession('fuel', ''))
  const [gearbox, setGearbox]     = useState(() => readPwSession('gearbox', ''))
  const [powerMin, setPowerMin]   = useState(() => readPwSession('powerMin', ''))
  const [powerMax, setPowerMax]   = useState(() => readPwSession('powerMax', ''))
  const [country, setCountry]     = useState(() => readPwSession('country', 'FR'))

  const [loading, setLoading]     = useState(false)   // avant le 1er token
  const [streaming, setStreaming] = useState(false)   // tokens en cours d'arrivée
  const [report, setReport]       = useState('')      // texte Markdown streamé
  const [hasLiveData, setHasLiveData] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [sources, setSources]     = useState([])
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory('pricewatch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()

  // Persist filter state across page navigations (session-scoped)
  useEffect(() => {
    try {
      sessionStorage.setItem(PW_SESSION, JSON.stringify(
        { type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, country }
      ))
    } catch {}
  }, [type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, country])

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    const rawMake = overrides.make ?? make
    const matchedMake = MAKES.find(m => m.label.toLowerCase() === rawMake.toLowerCase())
    const resolvedMake = matchedMake ? matchedMake.code : rawMake
    const filters = { make: resolvedMake, model, finition, carrosserie, type, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, ...overrides }
    // Libellés lisibles des filtres énumérés, pour que l'analyse les applique en STRICT.
    filters.fuelLabel        = filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label || '' : ''
    filters.gearboxLabel     = filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label || '' : ''
    filters.carrosserieLabel = filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label || '' : ''
    const ctry = COUNTRIES.find(c => c.code === (overrides.country ?? country)) ?? COUNTRIES[0]

    const vehicleDesc = [
      rawMake, filters.model, filters.finition,
      filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
        : filters.yearMin ? `depuis ${filters.yearMin}` : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
      (filters.mileageMin || filters.mileageMax)
        ? filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
        : '',
      filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label : '',
      filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label : '',
      filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label : '',
      (filters.powerMin || filters.powerMax)
        ? filters.powerMin && filters.powerMax
          ? `${filters.powerMin}–${filters.powerMax} ch`
          : filters.powerMin ? `≥ ${filters.powerMin} ch` : `< ${filters.powerMax} ch`
        : '',
    ].filter(Boolean).join(' · ')

    const label = [
      filters.make, filters.model, filters.finition,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      (filters.mileageMin || filters.mileageMax) && (
        filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
      ),
      (filters.powerMin || filters.powerMax) && (
        filters.powerMin && filters.powerMax
          ? `${filters.powerMin}–${filters.powerMax} ch`
          : filters.powerMin ? `≥ ${filters.powerMin} ch` : `< ${filters.powerMax} ch`
      ),
      ctry.label,
    ].filter(Boolean).join(' · ')

    saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
    setSearchLabel(label)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')
    setHasLiveData(false)

    try {
      // Liens de référence — for non-France markets, use AutoScout24 country URL.
      if (ctry.code === 'FR') {
        const meta = await fetchSources(filters)
        setFetchedAt(meta.fetchedAt)
        setCentraleUrl(meta.centraleUrl || '')
        setSources(meta.sources || [])
      } else {
        const as24Url = buildAs24Url(ctry, filters)
        const q = encodeURIComponent([filters.make, filters.model].filter(Boolean).join(' '))
        const SECONDARY = {
          DE: { name: 'mobile.de', url: `https://suchen.mobile.de/auto/search.html?makeModelVariant1.makeName=${encodeURIComponent(filters.make || '')}&makeModelVariant1.searchText=${encodeURIComponent(filters.model || '')}` },
          BE: { name: '2dehands.be', url: `https://www.2dehands.be/q/${q}/` },
          NL: { name: 'Marktplaats.nl', url: `https://www.marktplaats.nl/q/${q}/` },
          IT: { name: 'Subito.it', url: `https://www.subito.it/annunci-italia/vendita/usato/auto/?q=${q}` },
          ES: { name: 'Coches.net', url: `https://www.coches.net/segunda-mano/?q=${q}` },
          PT: { name: 'CustoJusto.pt', url: `https://www.custojusto.pt/portugal/carros-e-motos/carros/?q=${q}` },
          LU: { name: 'Luxauto.lu', url: 'https://www.luxauto.lu/' },
          CH: { name: 'Tutti.ch', url: `https://www.tutti.ch/de/suche/auto?q=${q}` },
          HR: { name: 'Njuškalo.hr', url: `https://www.njuskalo.hr/auti?q=${q}` },
          PL: { name: 'OtoMoto.pl', url: `https://www.otomoto.pl/osobowe?search[filter_str]=${q}` },
          SE: { name: 'Blocket.se', url: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=${q}` },
          NO: { name: 'Finn.no', url: `https://www.finn.no/car/used/search.html?q=${q}` },
          FI: { name: 'Nettiauto.com', url: `https://www.nettiauto.com/en/?search[q]=${q}` },
          MA: { name: 'Avito.ma', url: `https://www.avito.ma/fr/voitures?query=${q}` },
          TN: { name: 'Tayara.tn', url: `https://www.tayara.tn/search/?q=${q}` },
          DZ: { name: 'Ouedkniss.com', url: `https://www.ouedkniss.com/auto-vehicule-occasion?q=${q}` },
        }
        setFetchedAt(new Date().toISOString())
        if (as24Url) {
          setCentraleUrl(as24Url)
          setSources([
            { name: `AutoScout24 ${ctry.label}`, url: as24Url },
            ...(SECONDARY[ctry.code] ? [SECONDARY[ctry.code]] : []),
          ])
        } else {
          const sec = SECONDARY[ctry.code]
          setCentraleUrl(sec?.url || '')
          setSources(sec ? [sec] : [])
        }
      }

      // Analyse streamée en direct (comme le chat) — le texte s'affiche au fil
      // de l'eau dès le 1er token reçu. Passe UNIQUE : la grille de prix et
      // l'auto-vérification sont intégrées au prompt (plus de 2e passe).
      let first = true
      const { text, usedWebSearch } = await sendMessage(
        [{ role: 'user', content: buildPrompt(filters, vehicleDesc, ctry) }],
        {
          lang, expert: true, temperature: 0, tool: 'veilleprix',
          webSearch: true, maxSearches: 3, maxTokens: 4500,
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
      addHistory({ searchLabel: label, country: ctry.code, type: filters.type, report: text, hasLiveData: !!usedWebSearch, fetchedAt: new Date().toISOString(), sources: [], centraleUrl: '' })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => {
    const ctryLabel = (COUNTRIES.find(c => c.code === country)?.label || country).toUpperCase()
    const pdfTitle = `Veille prix ${ctryLabel}`
    return withExporting(() =>
      exportReportPdf(report, pdfFileName(searchLabel, pdfTitle), { title: pdfTitle, subtitle: searchLabel }))
  }

  const reset = () => {
    setReport(''); setMake(''); setModel(''); setFinition(''); setCarrosserie('')
    setYearMin(''); setYearMax(''); setMileageMin(''); setMileageMax(''); setFuel(''); setGearbox(''); setPowerMin(''); setPowerMax('')
    setCountry('FR')
    setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null); setSources([]); setHasLiveData(false)
  }

  const restore = (item) => {
    setReport(item.report || '')
    setSearchLabel(item.searchLabel)
    setType(item.type)
    setCountry(item.country || 'FR')
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
        </div>

        {/* VO / VN toggle + Marché */}
        <div className="flex items-end justify-between gap-4 mb-4">
          <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit border border-navy-700/40">
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
          <div className="min-w-[180px]">
            <FilterSelect label={t('price_country_label')} value={country} onChange={setCountry}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </FilterSelect>
          </div>
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

        {/* Ligne 2 : Km min + Km max (VO only) + Carburant + Boîte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {type === 'vo' && (
            <FilterSelect label={t('km_min')} value={mileageMin} onChange={setMileageMin}>
              {MILEAGE_MIN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          {type === 'vo' && (
            <FilterSelect label={t('km_max')} value={mileageMax} onChange={setMileageMax}>
              {MILEAGE_MAX_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          <FilterSelect label={t('fuel_label')} value={fuel} onChange={setFuel}>
            {FUELS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('gearbox_label')} value={gearbox} onChange={setGearbox}>
            {GEARBOXES.map(g => <option key={g.code} value={g.code}>{g.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('power_min')} value={powerMin} onChange={setPowerMin}>
            {POWER_MIN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('power_max')} value={powerMax} onChange={setPowerMax}>
            {POWER_MAX_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              <ExternalLink size={12} />
              {country === 'FR' ? t('price_see_listing') : `AutoScout24 ${COUNTRIES.find(c => c.code === country)?.label}`}
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
                  <>
                    {hasLiveData ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                        <Wifi size={9} /> {t('price_live_badge')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                        <WifiOff size={9} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      <ShieldCheck size={9} /> {t('price_guardrail_done')}
                    </span>
                  </>
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
                  <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
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
        onRemove={removeHistory}
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
