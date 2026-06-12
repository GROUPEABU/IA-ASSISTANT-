import { useState, useRef, useEffect } from 'react'
import { Ruler, AlertCircle, RefreshCw, RotateCcw, Info, Sparkles, History, FileDown } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { takeBridgePayload } from '@/utils/toolBridge'
import { useSettings } from '@/contexts/SettingsContext'
import AIProgress from '@/components/ui/AIProgress'
import Spinner from '@/components/ui/Spinner'
import { MAKES, YEARS } from '@/data/vehicleFilters'
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

// Détecte une carrosserie haute (SUV/monospace) pour choisir la bonne silhouette.
const TALL_RE = /suv|crossover|4x4|monospace|ludospace|\bvan\b|pick.?up|tout.?terrain|baroudeur|aircross|duster|bigster/i
const isTall = (...parts) => TALL_RE.test(parts.filter(Boolean).join(' '))

/**
 * Silhouette véhicule générique (profil, avant à droite). Tracé en `currentColor`
 * : piloté par la couleur de texte du parent (cyan à l'écran, sombre à l'impression
 * PDF). Remplace avantageusement une photo : 100 % fiable, charte respectée.
 */
function SilhouettePaths({ tall }) {
  const body = tall
    ? 'M14 70 L14 56 Q14 49 23 47 L46 45 L64 30 Q69 25 78 25 L150 25 Q161 25 167 32 L184 46 L200 48 Q208 50 208 59 L208 70 Z'
    : 'M12 70 L12 61 Q12 55 20 53 L44 51 L70 35 Q77 30 88 30 L142 30 Q156 30 163 37 L192 52 L202 54 Q210 56 210 63 L210 70 Z'
  return (
    <>
      <path d={body} fill="currentColor" fillOpacity="0.10" stroke="currentColor"
        strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {[64, 168].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="70" r="16" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="3" />
          <circle cx={cx} cy="70" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </g>
      ))}
    </>
  )
}

function CarSilhouette({ tall, className }) {
  return (
    <svg viewBox="0 0 220 92" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <SilhouettePaths tall={tall} />
    </svg>
  )
}

/**
 * Schéma « blueprint » : silhouette à l'échelle + cotes longueur (bas) et
 * hauteur (gauche). Visuel signature de la page, sans photo.
 */
function DimensionDiagram({ veh }) {
  const tall = isTall(veh.body, veh.segment, veh.model)
  const len = veh.length
  const hgt = veh.height
  return (
    // Hauteur fixée à 160 px : évite que le SVG h-auto devienne ~345 px dans
    // le rendu PDF (windowWidth=760) et fasse déborder la carte de la page.
    <div className="dim-blueprint relative rounded-xl border border-cyan-400/15 bg-navy-900/40 overflow-hidden text-cyan-400"
      style={{
        height: '160px',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}>
      {/* preserveAspectRatio=xMidYMid meet : le viewBox 440×200 se redimensionne
          pour tenir ENTIÈREMENT dans le conteneur 160 px, sans débordement.  */}
      <svg viewBox="0 0 440 200" preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        fill="none" xmlns="http://www.w3.org/2000/svg">
        <svg x="80" y="22" width="300" height="125" viewBox="0 0 220 92" preserveAspectRatio="xMidYMid meet">
          <SilhouettePaths tall={tall} />
        </svg>
        {/* Sol */}
        <line x1="70" y1="140" x2="380" y2="140" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2 5" />
        {/* Cote LONGUEUR (bas) */}
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="96" y1="160" x2="366" y2="160" />
          <line x1="96" y1="154" x2="96" y2="166" />
          <line x1="366" y1="154" x2="366" y2="166" />
        </g>
        {len != null && (
          <text x="231" y="181" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
            {len.toLocaleString('fr-FR')} mm
          </text>
        )}
        {/* Cote HAUTEUR (gauche) */}
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="58" y1="55" x2="58" y2="139" />
          <line x1="52" y1="55" x2="64" y2="55" />
          <line x1="52" y1="139" x2="64" y2="139" />
        </g>
        {hgt != null && (
          <text x="42" y="97" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" transform="rotate(-90 42 97)">
            {hgt.toLocaleString('fr-FR')} mm
          </text>
        )}
      </svg>
    </div>
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

  const tall = isTall(car.body, car.model)

  return (
    <div className="glass-card overflow-hidden hover:border-cyan-400/25 transition-colors group">
      <div className="flex items-center justify-center bg-navy-900/40 px-4 pt-3 pb-1">
        <CarSilhouette tall={tall} className="h-12 w-auto text-slate-500 group-hover:text-cyan-400/80 transition-colors" />
      </div>
      <div className="p-3 pt-2">
        <p className="text-xs font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">
          {car.make} {car.model}
        </p>
        <p className="text-[10px] leading-tight text-slate-500 mt-0.5 mb-2">
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

  // Pont inter-outils : véhicule reçu (Fiche IA) → pré-remplit le formulaire.
  useEffect(() => {
    const p = takeBridgePayload('/compare')
    if (p?.make || p?.model) {
      setForm((f) => ({ ...f, make: p.make || '', model: p.model || '', year: p.year ? String(p.year) : '', version: p.version || '' }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      const prompt = `Analyse le véhicule "${label}". En t'appuyant sur des recherches web RÉELLES.`

      const result = await sendMessage(
        [{ role: 'user', content: prompt }],
        { lang, maxTokens: 4500, expert: true, temperature: 0, tool: 'comparateur',
          webSearch: true, maxSearches: 5, systemStaticKey: 'compare' },
      )
      setData(parseAIJson(result))
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

          {/* Schéma dimensions (silhouette + cotes) — remplace la photo */}
          <div className="mb-5">
            <DimensionDiagram veh={veh} />
          </div>

          {/* L × l × H */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-navy-900/60 border border-navy-700/40 mb-3">
            <DimStat label={t('dim_length')} value={veh.length} unit="mm" accent="text-cyan-400" />
            <DimStat label={t('dim_width')}  value={veh.width}  unit={veh.widthMirrors ? `mm · ${veh.widthMirrors.toLocaleString('fr-FR')} ${t('dim_with_mirrors')}` : 'mm'} accent="text-emerald-400" />
            <DimStat label={t('dim_height')} value={veh.height} unit="mm" accent="text-purple-400" />
          </div>

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
