import { useState, useRef } from 'react'
import {
  Bell, Search, RefreshCw, RotateCcw, TrendingUp, TrendingDown, Minus,
  AlertCircle, ExternalLink, Clock, SlidersHorizontal, Download, History, Trash2,
} from 'lucide-react'
import { sendMessage, extractJSON } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { formatNumber } from '@/utils/formatters'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { exportToPdf } from '@/utils/exportPdf'

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
async function fetchPrices(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

async function analyzePrices(filters, sourcesData, fuels, gearboxes, bodies, lang = 'fr') {
  const context = sourcesData.map(s => `=== ${s.name} ===\n${s.content}`).join('\n\n')
  const vehicleDesc = [
    filters.make, filters.model,
    filters.finition || '',
    filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
      : filters.yearMin ? `à partir de ${filters.yearMin}`
      : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
    filters.mileageMax ? `< ${Number(filters.mileageMax).toLocaleString()} km` : '',
    filters.fuel ? fuels.find(f => f.code === filters.fuel)?.label : '',
    filters.gearbox ? gearboxes.find(g => g.code === filters.gearbox)?.label : '',
    filters.carrosserie ? bodies.find(b => b.code === filters.carrosserie)?.label : '',
  ].filter(Boolean).join(' · ')

  const finitionFilter = filters.finition
    ? `\n⚠️ FILTRE FINITION STRICT : Ne prends en compte QUE les annonces mentionnant la finition "${filters.finition}". Ignore toutes les autres finitions/versions.`
    : ''

  const prompt = `Tu es expert en cote automobile pour Autobuyunion. Analyse STRICTEMENT les annonces ${filters.type === 'vn' ? 'VN (neuf)' : 'VO (occasion)'} pour : "${vehicleDesc}"${finitionFilter}

RÈGLE ABSOLUE : N'analyse QUE les annonces qui correspondent EXACTEMENT à "${filters.make} ${filters.model}"${filters.finition ? ` finition "${filters.finition}"` : ''}. Élimine tout ce qui ne correspond pas (autres modèles, autres marques, autres finitions).

Données sources :
${context}

MÉTHODE :
- Extrais uniquement les prix des annonces correspondant exactement au véhicule cible
- Supprime 10% les plus bas et 10% les plus hauts (aberrants)
- Prix moyen = moyenne des 80% restants
- Q1/Q3 = 25e/75e percentile

Réponds UNIQUEMENT en JSON strict (sans texte avant/après) :
{
  "prix_moyen": 0,
  "prix_median": 0,
  "prix_q1": 0,
  "prix_q3": 0,
  "nb_annonces_estim": 0,
  "tendance": "hausse|baisse|stable",
  "tendance_pct": 0,
  "alerte": "texte court si données insuffisantes ou anomalie, sinon null",
  "analyse": "2-3 phrases précises sur le marché pour ce modèle/finition exact",
  "conseil_achat": "conseil chiffré et actionnable pour acheter au meilleur prix",
  "conseil_vente": "conseil chiffré et actionnable pour vendre rapidement"
}`

  const raw = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 1500, expert: true })
  return extractJSON(raw, 'object')
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

function KpiCard({ label, value, highlight, sub }) {
  return (
    <div className="glass-card p-3 text-center">
      <p className={`text-lg font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{sub}</p>}
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
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
                item.type === 'vo' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
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

  const [type, setType]           = useState('vo')
  const [make, setMake]           = useState('')
  const [model, setModel]         = useState('')
  const [finition, setFinition]   = useState('')
  const [carrosserie, setCarrosserie] = useState('')
  const [yearMin, setYearMin]     = useState('')
  const [yearMax, setYearMax]     = useState('')
  const [mileageMax, setMileageMax] = useState('')
  const [fuel, setFuel]           = useState('')
  const [gearbox, setGearbox]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [step, setStep]           = useState('')
  const [result, setResult]       = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const [exporting, setExporting] = useState(false)
  const { history, add: addHistory, clear: clearHistory } = useHistory('pricewatch')

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    // Résoudre le code La Centrale si l'utilisateur a tapé un label connu
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

      setStep(t('price_step_calculating'))
      const analysis = await analyzePrices(filters, raw.sources || [], FUELS, GEARBOXES, BODIES, lang)
      const finalResult = { ...analysis, sources: raw.sources }
      setResult(finalResult)
      addHistory({ searchLabel: label, type: filters.type, result: finalResult })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  const TrendIcon   = result?.tendance === 'hausse' ? TrendingUp : result?.tendance === 'baisse' ? TrendingDown : Minus
  const trendColor  = result?.tendance === 'hausse' ? 'text-red-400' : result?.tendance === 'baisse' ? 'text-emerald-400' : 'text-slate-400'
  const trendBg     = result?.tendance === 'hausse' ? 'bg-red-400/10' : result?.tendance === 'baisse' ? 'bg-emerald-400/10' : 'bg-slate-700/40'
  const trendLabel  = result?.tendance === 'hausse' ? t('market_up') : result?.tendance === 'baisse' ? t('market_down') : t('market_stable')

  const fmtEur = (v) => v ? `${formatNumber(v)} €` : 'N/D'

  const handlePdf = async () => {
    setExporting(true)
    try {
      await exportToPdf(resultRef, `veille_prix_${searchLabel.replace(/ /g, '_')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  const reset = () => { setResult(null); setMake(''); setModel(''); setFinition(''); setCarrosserie(''); setYearMin(''); setYearMax(''); setMileageMax(''); setFuel(''); setGearbox(''); setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null) }

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
                type === tab.id
                  ? 'bg-cyan-400 text-navy-900'
                  : 'text-slate-400 hover:text-white'
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
              type="text"
              value={make}
              onChange={e => setMake(e.target.value)}
              list="makes-list"
              placeholder={t('make_ph')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
            />
            <datalist id="makes-list">
              {MAKES.map(m => <option key={m.code} value={m.label} />)}
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('model_label')}</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={t('price_model_ph')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
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
              type="text"
              value={finition}
              onChange={e => setFinition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={t('price_finition_ph')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
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
            onClick={() => search()}
            disabled={!canSearch || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Spinner size="sm" /> : <Search size={14} />}
            {loading ? t('analyzing') : t('analyze_btn')}
          </button>

          {centraleUrl && !loading && (
            <a
              href={centraleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                         px-3 py-2.5 rounded-xl hover:text-cyan-400 hover:border-cyan-400/30 transition"
            >
              <ExternalLink size={12} /> {t('price_see_listing')}
            </a>
          )}
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 text-center">{step}</p>
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
      {result && !loading && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-white">{searchLabel}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  type === 'vo' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
                }`}>{type === 'vo' ? t('used_vehicle') : t('new_vehicle')}</span>
                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePdf}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                           px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
              >
                {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                {t('download_pdf')}
              </button>
              <button
                onClick={() => search()}
                className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                           px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition"
              >
                <RefreshCw size={12} /> {t('analyze_btn')}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
              >
                <RotateCcw size={11} /> {t('new_analysis_btn')}
              </button>
            </div>
          </div>

          <div ref={resultRef} className="space-y-3">
          {/* Alerte */}
          {result.alerte && (
            <div className="flex gap-2 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300 font-medium">{result.alerte}</p>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiCard
              label={t('avg_price')}
              value={fmtEur(result.prix_moyen)}
              highlight
              sub={t('excl_outliers')}
            />
            <KpiCard
              label={t('median_price')}
              value={fmtEur(result.prix_median)}
            />
            <KpiCard
              label={t('price_range')}
              value={result.prix_q1 && result.prix_q3
                ? `${formatNumber(result.prix_q1)} – ${formatNumber(result.prix_q3)} €`
                : 'N/D'}
              sub={t('percentile')}
            />
            <KpiCard
              label={t('listings_est')}
              value={result.nb_annonces_estim ? `~${result.nb_annonces_estim}` : 'N/D'}
            />
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
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{result.analyse}</p>
            </div>
          </div>

          {/* Conseils */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">{t('buy_advice')}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_achat}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">{t('sell_advice')}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_vente}</p>
            </div>
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
