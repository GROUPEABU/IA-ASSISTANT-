import { useState } from 'react'
import {
  Bell, Search, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertCircle, ExternalLink, Clock, SlidersHorizontal,
} from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { formatNumber } from '@/utils/formatters'
import { useSettings } from '@/contexts/SettingsContext'

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

const FUELS = [
  { label: 'Tous carburants', code: '' },
  { label: 'Essence', code: 'ES' },
  { label: 'Diesel', code: 'GO' },
  { label: 'Électrique', code: 'EL' },
  { label: 'Hybride', code: 'HY' },
  { label: 'Hybride rechargeable', code: 'GH' },
  { label: 'GPL', code: 'GP' },
]

const GEARBOXES = [
  { label: 'Toutes boîtes', code: '' },
  { label: 'Manuelle', code: 'M' },
  { label: 'Automatique', code: 'A' },
]

const MILEAGE_OPTS = [
  { label: 'Kilométrage — sans limite', value: '' },
  { label: '< 10 000 km', value: '10000' },
  { label: '< 20 000 km', value: '20000' },
  { label: '< 30 000 km', value: '30000' },
  { label: '< 50 000 km', value: '50000' },
  { label: '< 80 000 km', value: '80000' },
  { label: '< 100 000 km', value: '100000' },
  { label: '< 150 000 km', value: '150000' },
  { label: '< 200 000 km', value: '200000' },
]

const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchPrices(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
  return res.json()
}

async function analyzePrices(filters, sourcesData) {
  const context = sourcesData.map(s => `=== ${s.name} ===\n${s.content}`).join('\n\n')
  const vehicleDesc = [
    filters.make, filters.model,
    filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
      : filters.yearMin ? `à partir de ${filters.yearMin}`
      : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
    filters.mileageMax ? `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km` : '',
    filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label : '',
    filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label : '',
  ].filter(Boolean).join(' · ')

  const prompt = `Tu es expert en cote automobile pour Autobuyunion.

Analyse les prix du marché ${filters.type === 'vn' ? 'VN (véhicule neuf)' : 'VO (occasion)'} pour : "${vehicleDesc}"

Données collectées :
${context}

MÉTHODE DE CALCUL IMPORTANTE :
- Extrais TOUTES les valeurs de prix mentionnées dans les données
- Supprime les 10% les plus bas ET les 10% les plus hauts (prix aberrants)
- Calcule le prix moyen sur les 80% restants = "prix marché réaliste"
- Q1 = 25e percentile, Q3 = 75e percentile = fourchette courante

Réponds UNIQUEMENT en JSON strict :
{
  "prix_moyen": 0,
  "prix_median": 0,
  "prix_q1": 0,
  "prix_q3": 0,
  "nb_annonces_estim": 0,
  "tendance": "hausse|baisse|stable",
  "tendance_pct": 0,
  "alerte": "texte court si anomalie détectée sinon null",
  "analyse": "2-3 phrases sur l'état du marché, volumes, état des prix",
  "conseil_achat": "conseil concret et chiffré pour acheter au meilleur prix",
  "conseil_vente": "conseil concret et chiffré pour vendre rapidement au bon prix"
}`

  const raw = await sendMessage([{ role: 'user', content: prompt }])
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Parsing erreur — réessayez')
  return JSON.parse(match[0])
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

// ── Page principale ───────────────────────────────────────────────────────────
export default function PriceWatch() {
  const { t } = useSettings()
  const [type, setType]           = useState('vo')
  const [make, setMake]           = useState('')
  const [model, setModel]         = useState('')
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

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    // Résoudre le code La Centrale si l'utilisateur a tapé un label connu
    const rawMake = overrides.make ?? make
    const matchedMake = MAKES.find(m => m.label.toLowerCase() === rawMake.toLowerCase())
    const resolvedMake = matchedMake ? matchedMake.code : rawMake
    const filters = { make: resolvedMake, model, type, yearMin, yearMax, mileageMax, fuel, gearbox, ...overrides }
    const label = [filters.make, filters.model,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      filters.mileageMax && `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`,
    ].filter(Boolean).join(' · ')

    setSearchLabel(label)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setStep('Collecte des annonces La Centrale · Le Bon Coin · L\'Argus…')
      const raw = await fetchPrices(filters)
      setFetchedAt(raw.fetchedAt)
      setCentraleUrl(raw.centraleUrl || '')

      setStep('Calcul des prix moyens du marché…')
      const analysis = await analyzePrices(filters, raw.sources || [])
      setResult({ ...analysis, sources: raw.sources })
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
  const trendLabel  = result?.tendance === 'hausse' ? 'Marché en hausse' : result?.tendance === 'baisse' ? 'Marché en baisse' : 'Marché stable'

  const fmtEur = (v) => v ? `${formatNumber(v)} €` : 'N/D'

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('tool_price_title')}</h2>
          <span className="text-xs text-slate-500 hidden sm:inline">La Centrale · LBC · L'Argus</span>
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
              placeholder="Ex: Renault, BMW…"
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
              placeholder="Ex: Clio, 208, Golf…"
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>

          <FilterSelect label="Année min" value={yearMin} onChange={setYearMin}>
            <option value="">Année min</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>

          <FilterSelect label="Année max" value={yearMax} onChange={setYearMax}>
            <option value="">Année max</option>
            {YEARS.filter(y => !yearMin || y >= Number(yearMin)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>
        </div>

        {/* Ligne 2 : Km max (VO only) + Carburant + Boîte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {type === 'vo' && (
            <FilterSelect label="Kilométrage max" value={mileageMax} onChange={setMileageMax}>
              {MILEAGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}

          <FilterSelect label="Carburant" value={fuel} onChange={setFuel}>
            {FUELS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </FilterSelect>

          <FilterSelect label="Boîte de vitesses" value={gearbox} onChange={setGearbox}>
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
              <ExternalLink size={12} /> Voir sur La Centrale
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
                }`}>{type === 'vo' ? 'Occasion' : 'Neuf'}</span>
                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString('fr-FR')}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => search()}
              className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                         px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition"
            >
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>

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
              sub="hors aberrants"
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
              sub="25e–75e percentile"
            />
            <KpiCard
              label="Annonces estimées"
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
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Conseil achat</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_achat}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Conseil vente</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_vente}</p>
            </div>
          </div>

          {/* Sources + lien La Centrale */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Sources consultées</p>
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
                  <SlidersHorizontal size={10} /> Ouvrir La Centrale avec ces filtres
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!result && !loading && !error && (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">Sélectionnez une marque et un modèle</p>
          <p className="text-xs text-slate-600">Affinez avec les filtres pour obtenir un prix marché précis</p>
        </div>
      )}
    </div>
  )
}
