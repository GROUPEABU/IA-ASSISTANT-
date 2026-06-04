import { useState, useRef } from 'react'
import { Ruler, AlertCircle, RefreshCw, RotateCcw, Info, ImageOff, Sparkles, History, FileDown, Receipt } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { useSettings } from '@/contexts/SettingsContext'
import AIProgress from '@/components/ui/AIProgress'
import Spinner from '@/components/ui/Spinner'
import { MAKES, YEARS } from '@/data/vehicleFilters'
import { getMalus, getMalusLabel } from '@/utils/malus'
import { useExport } from '@/hooks/useExport'
import { exportToPdf, pdfFileName } from '@/utils/exportPdf'

const EMPTY = { make: '', model: '', year: '', version: '' }

function parseAIJson(raw) {
  const s = raw.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) return JSON.parse(fenced[1])
  const obj = s.match(/(\{[\s\S]*\})/)
  if (obj) return JSON.parse(obj[1])
  return JSON.parse(s)
}

/**
 * URL d'image MÊME ORIGINE via notre proxy `/api/car-image`, qui résout la vraie
 * photo Wikipedia côté serveur. Same-origin = passe la CSP (`img-src 'self'`) ET
 * évite le « taint » du canvas à l'export PDF (html2canvas).
 */
function carImg(c) {
  const wiki = c?.wiki || ''
  const q    = `${c?.make || ''} ${c?.model || ''}`.trim()
  if (!wiki && !q) return null
  const p = new URLSearchParams()
  if (wiki) p.set('wiki', wiki)
  if (q)    p.set('q', q)
  return `/api/car-image?${p.toString()}`
}

/** Renseigne `_img` (URL proxy) sur chaque véhicule. */
function attachImages(parsed) {
  const cars = [
    parsed.vehicle,
    ...(parsed.comparablesNew || []),
    ...(parsed.comparablesPrevious || []),
  ].filter(Boolean)
  cars.forEach((c) => { c._img = carImg(c) })
  return parsed
}

/** Image with graceful fallback to a placeholder when the URL is dead/blocked. */
function Photo({ src, alt, className }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div className={`flex items-center justify-center bg-navy-900/70 ${className}`}>
        <ImageOff size={20} className="text-slate-700" />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy" crossOrigin="anonymous"
      onError={() => setErr(true)}
      className={`object-cover bg-navy-900/70 ${className}`} />
  )
}

function DimStat({ label, value, unit, accent = 'text-cyan-400' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight text-center">{label}</span>
      <span className={`text-2xl font-black tabular-nums leading-tight ${accent}`}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : (value ?? '—')}
      </span>
      <span className="text-[11px] text-slate-500">{unit}</span>
    </div>
  )
}

function SpecCell({ label, value }) {
  return (
    <div className="bg-navy-900/50 rounded-xl px-3 py-2.5 border border-navy-700/40">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5 leading-tight">{label}</p>
      <p className="text-sm font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}

function CompCard({ car, refLen }) {
  const ratio = refLen > 0 && car.length > 0 ? car.length / refLen : 1
  const barW = Math.round(Math.min(100, Math.max(35, ratio * 100)))
  const delta = refLen > 0 && car.length > 0 ? car.length - refLen : null

  return (
    <div className="glass-card overflow-hidden hover:border-cyan-400/25 transition-colors group">
      <Photo src={car._img} alt={`${car.make} ${car.model}`} className="w-full h-28" />
      <div className="p-3">
        <p className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
          {car.make} {car.model}
        </p>
        <p className="text-[10px] text-slate-500 mb-2 truncate">
          {[car.year, car.version].filter(Boolean).join(' · ')}
        </p>

        {/* Proportional length bar */}
        <div className="relative h-1.5 rounded-full bg-navy-900/70 mb-2 overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/40"
            style={{ width: `${barW}%` }} />
        </div>

        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-cyan-400">{car.length?.toLocaleString('fr-FR')}</span>
          <span className="text-[10px] text-slate-600">×</span>
          <span className="text-[10px] text-slate-400">{car.width?.toLocaleString('fr-FR')}</span>
          <span className="text-[10px] text-slate-600">×</span>
          <span className="text-[10px] text-slate-400">{car.height?.toLocaleString('fr-FR')} mm</span>
        </div>
        {delta != null && Math.abs(delta) >= 5 && (
          <p className={`text-[10px] mt-0.5 ${delta > 0 ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
            {delta > 0 ? '+' : ''}{delta.toLocaleString('fr-FR')} mm
          </p>
        )}
      </div>
    </div>
  )
}

function CompGroup({ icon: Icon, title, subtitle, cars, refLen }) {
  if (!cars?.length) return null
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3 px-0.5">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Icon size={14} className="text-cyan-400" /> {title}
        </h3>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cars.map((car, i) => <CompCard key={i} car={car} refLen={refLen} />)}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Alpine A290', 'Renault 5 E-Tech', 'Peugeot 308', 'Volkswagen Golf',
  'Dacia Duster', 'BMW Série 1', 'Toyota Yaris Cross', 'Tesla Model 3',
]

const inputCls  = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition'
const selectCls = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition'

export default function Compare() {
  const { t, lang } = useSettings()
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const { exporting, withExporting } = useExport()
  const pdfRef = useRef(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const vehicleName = [form.make, form.model].filter(Boolean).join(' ').trim()

  const analyze = async (override) => {
    const name = (override || vehicleName).trim()
    if (!name) return
    const ctx = override ? '' : [
      form.year && `année ${form.year}`,
      form.version && `version ${form.version}`,
    ].filter(Boolean).join(', ')
    const label = [name, ctx].filter(Boolean).join(' — ')

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const prompt = `Tu es expert automobile. En t'appuyant sur des recherches web RÉELLES, analyse le véhicule "${label}".

L'ÉQUIVALENCE se fait UNIQUEMENT sur le GABARIT (longueur, largeur, hauteur proches), toutes marques confondues — exactement comme automobiledimension.com.

ÉTAPES :
1. Dimensions officielles exactes + caractéristiques du modèle demandé. Indique s'il s'agit d'un modèle ACTUELLEMENT commercialisé ("current") ou d'une génération REMPLACÉE ("previous"), et par quoi il a été remplacé le cas échéant.
2. "comparablesNew" : 6 à 8 véhicules NEUFS actuellement commercialisés, de gabarit similaire (toutes marques).
3. "comparablesPrevious" : 4 à 6 modèles de générations PRÉCÉDENTES/anciennes (jusqu'à ~15 ans) de gabarit similaire.

Pour CHAQUE véhicule (modèle demandé ET chaque comparable), donne le champ "wiki" = le TITRE EXACT de l'article Wikipedia du modèle (ex : "Peugeot 3008", "Renault Austral", "Alpine A290"). Ce titre sert à récupérer la vraie photo — il doit être précis et correspondre à un article Wikipedia existant.

Réponds ENSUITE UNIQUEMENT en JSON valide (aucun texte autour, pas de backticks) :
{
  "vehicle": {
    "make": "string", "model": "string", "year": number, "version": "string|null",
    "wiki": "Titre exact de l'article Wikipedia",
    "status": "current|previous", "replacedBy": "string|null",
    "segment": "string", "body": "string", "seats": number,
    "length": number, "width": number, "widthMirrors": number|null, "height": number,
    "wheelbase": number, "weight": number, "trunk": number, "turningCircle": number|null,
    "engine": "string", "power": number, "torque": number, "co2": number|null,
    "fuel": "string", "gearbox": "string", "acceleration": number|null, "topSpeed": number|null
  },
  "comparablesNew": [
    { "make": "string", "model": "string", "year": number, "version": "string|null",
      "wiki": "Titre exact de l'article Wikipedia",
      "length": number, "width": number, "height": number }
  ],
  "comparablesPrevious": [
    { "make": "string", "model": "string", "year": number, "version": "string|null",
      "wiki": "Titre exact de l'article Wikipedia",
      "length": number, "width": number, "height": number }
  ]
}
Dimensions en mm, poids en kg, coffre en litres, braquage en m, puissance en ch, couple en Nm, CO₂ en g/km WLTP. Valeur inconnue = null. JSON pur uniquement.`

      const result = await sendMessage(
        [{ role: 'user', content: prompt }],
        { lang, maxTokens: 4500, expert: true, temperature: 0, tool: 'comparateur', webSearch: true, maxSearches: 6 },
      )
      setData(attachImages(parseAIJson(result)))
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setData(null); setError(null) }

  const veh    = data?.vehicle
  const compsN = data?.comparablesNew ?? []
  const compsP = data?.comparablesPrevious ?? []
  const isPrev = veh?.status === 'previous'
  const malus  = veh?.co2 != null ? getMalus(veh.co2) : null
  const vehLabel = veh ? `${veh.make} ${veh.model}${veh.year ? ' ' + veh.year : ''}` : vehicleName

  const handlePdf = () => withExporting(() =>
    exportToPdf(pdfRef, pdfFileName(vehLabel, t('dim_title')), { title: t('dim_title'), subtitle: vehLabel })
  )

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Search card */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Ruler size={16} className="text-cyan-400" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">{t('dim_title')}</h2>
            <p className="text-xs text-slate-500">{t('dim_subtitle')}</p>
          </div>
          {data && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handlePdf} disabled={exporting}
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 border border-cyan-400/30
                           px-2.5 py-1.5 rounded-lg hover:bg-cyan-400/10 transition disabled:opacity-40 disabled:pointer-events-none">
                {exporting ? <Spinner size="sm" /> : <FileDown size={12} />} {t('download_pdf')}
              </button>
              <button onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30">
                <RotateCcw size={11} /> {t('dim_new_search')}
              </button>
            </div>
          )}
        </div>

        {!loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('make_label')}</label>
                <input type="text" value={form.make} onChange={set('make')} list="dim-makes"
                  placeholder={t('make_ph')} className={inputCls} />
                <datalist id="dim-makes">{MAKES.map(m => <option key={m} value={m} />)}</datalist>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('model_label')}</label>
                <input type="text" value={form.model} onChange={set('model')}
                  placeholder={t('price_model_ph')} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('veh_year_label')}</label>
                <select value={form.year} onChange={set('year')} className={selectCls}>
                  <option value="">{t('veh_any')}</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('price_finition_label')}</label>
                <input type="text" value={form.version} onChange={set('version')}
                  placeholder={t('price_finition_ph')} className={inputCls} />
              </div>
            </div>
            <button
              onClick={() => analyze()}
              disabled={!vehicleName.trim()}
              className="w-full px-4 py-3 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                         hover:bg-cyan-300 active:scale-95 transition-all
                         disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Ruler size={16} />
              {t('dim_analyze_btn')}
            </button>
          </>
        )}

        {loading && (
          <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              <p className="text-sm text-white font-medium">{t('dim_analyzing')}</p>
            </div>
            <AIProgress active={loading}
              stages={[t('ai_progress_connect'), t('dim_progress_photos'), t('ai_progress_format')]}
              estimatedMs={24000} persistKey="dimensions" />
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 items-start">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 flex-1 min-w-0">{error}</p>
            <button onClick={() => analyze()}
              className="text-xs text-red-400 hover:text-white flex items-center gap-1 flex-shrink-0">
              <RefreshCw size={11} /> {t('dim_regenerate')}
            </button>
          </div>
        )}

        {!loading && !data && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              {t('modal_suggestions')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => analyze(s)}
                  className="text-xs text-slate-400 bg-navy-700/50 border border-navy-600/50
                             px-2.5 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Résultats (capturés dans le PDF) ─────────────────────────────── */}
      {data && (
      <div ref={pdfRef} className="space-y-5">

      {/* Vehicle hero */}
      {veh && (
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h3 className="text-xl font-black text-white leading-tight">
                {veh.make} {veh.model}
                {veh.year && <span className="text-slate-400 font-normal text-base ml-2">{veh.year}</span>}
              </h3>
              {veh.version && <p className="text-sm text-cyan-400 font-medium mt-0.5">{veh.version}</p>}
              {isPrev && veh.replacedBy && (
                <p className="text-[11px] text-amber-400/90 mt-1">{t('dim_replaced_by')} {veh.replacedBy}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                isPrev ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                       : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'}`}>
                {isPrev ? t('dim_status_previous') : t('dim_status_new')}
              </span>
              {veh.segment && <span className="text-[10px] text-slate-500">{veh.segment}</span>}
              {veh.body && <span className="text-[10px] text-slate-500">{veh.body}{veh.seats ? ` · ${veh.seats} ${t('dim_seats')}` : ''}</span>}
            </div>
          </div>

          {/* Real photo */}
          <div className="mb-5">
            <Photo src={veh._img} alt={`${veh.make} ${veh.model}`} className="w-full h-48 sm:h-64 rounded-xl" />
          </div>

          {/* L × l × H */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-navy-900/60 border border-navy-700/40 mb-3">
            <DimStat label={t('dim_length')} value={veh.length} unit="mm" accent="text-cyan-400" />
            <DimStat label={t('dim_width')}  value={veh.width}  unit={veh.widthMirrors ? `mm · ${veh.widthMirrors.toLocaleString('fr-FR')} ${t('dim_with_mirrors')}` : 'mm'} accent="text-emerald-400" />
            <DimStat label={t('dim_height')} value={veh.height} unit="mm" accent="text-purple-400" />
          </div>

          {/* Malus écologique France 2025 */}
          {malus != null && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-navy-900/60 border border-navy-700/40 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                <Receipt size={16} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold leading-tight">{t('dim_malus')}</p>
                <p className="text-[11px] text-slate-500">{veh.co2} g/km · {getMalusLabel(veh.co2)}</p>
              </div>
              <p className={`text-lg font-black tabular-nums ${malus > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {malus > 0 ? `${malus.toLocaleString('fr-FR')} €` : t('dim_malus_exempt')}
              </p>
            </div>
          )}

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {veh.wheelbase     != null && <SpecCell label={t('dim_wheelbase')}    value={`${veh.wheelbase?.toLocaleString('fr-FR')} mm`} />}
            {veh.trunk         != null && <SpecCell label={t('dim_trunk')}        value={`${veh.trunk} L`} />}
            {veh.weight        != null && <SpecCell label={t('dim_weight')}       value={`${veh.weight?.toLocaleString('fr-FR')} kg`} />}
            {veh.turningCircle != null && <SpecCell label={t('dim_turning')}      value={`${veh.turningCircle} m`} />}
            {veh.power         != null && <SpecCell label={t('dim_power')}        value={`${veh.power} ch`} />}
            {veh.torque        != null && <SpecCell label={t('dim_torque')}       value={`${veh.torque} Nm`} />}
            {veh.co2           != null && <SpecCell label={t('dim_co2')}          value={`${veh.co2} g/km`} />}
            {veh.acceleration  != null && <SpecCell label={t('dim_acceleration')} value={`${veh.acceleration} s`} />}
            {veh.topSpeed      != null && <SpecCell label={t('dim_top_speed')}    value={`${veh.topSpeed} km/h`} />}
            {veh.fuel               && <SpecCell label={t('dim_fuel')}        value={veh.fuel} />}
            {veh.gearbox            && <SpecCell label={t('dim_gearbox')}     value={veh.gearbox} />}
            {veh.engine             && <SpecCell label={t('dim_engine')}      value={veh.engine} />}
          </div>
        </div>
      )}

      {/* Comparables — neufs */}
      <CompGroup icon={Sparkles} title={t('dim_comparables_new')} subtitle={t('dim_comparables_new_sub')}
        cars={compsN} refLen={veh?.length} />

      {/* Comparables — modèles précédents */}
      <CompGroup icon={History} title={t('dim_comparables_prev')} subtitle={t('dim_comparables_prev_sub')}
        cars={compsP} refLen={veh?.length} />

      {(compsN.length > 0 || compsP.length > 0) && (
        <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
          <Info size={10} className="flex-shrink-0" />
          {t('dim_disclaimer')}
        </p>
      )}

      </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="glass-card p-10 text-center">
          <Ruler size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('dim_empty_hint1')}</p>
          <p className="text-xs text-slate-600">{t('dim_empty_hint2')}</p>
        </div>
      )}
    </div>
  )
}
