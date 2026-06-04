import { useState } from 'react'
import { Ruler, AlertCircle, RefreshCw, RotateCcw, Info } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { useSettings } from '@/contexts/SettingsContext'
import AIProgress from '@/components/ui/AIProgress'
import VehicleDetails, { EMPTY_DETAILS, vehicleNameOf, formatVehicleDetails } from '@/components/ui/VehicleDetails'

function parseAIJson(raw) {
  const s = raw.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) return JSON.parse(fenced[1])
  const obj = s.match(/(\{[\s\S]*\})/)
  if (obj) return JSON.parse(obj[1])
  return JSON.parse(s)
}

function CarSilhouette() {
  const c = '#50E5E5'
  return (
    <svg viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg mx-auto block" aria-hidden="true">
      <line x1="8" y1="84" x2="272" y2="84" stroke={c} strokeWidth="1" strokeDasharray="5,4" opacity="0.2" />
      <path d="M20,78 L20,57 Q24,40 46,32 L92,22 L158,19 L183,22 L206,38 L228,57 L228,78 Z"
        stroke={c} strokeWidth="2" fill={`${c}0C`} />
      <line x1="92" y1="22" x2="104" y2="56" stroke={c} strokeWidth="1.8" />
      <line x1="183" y1="22" x2="172" y2="56" stroke={c} strokeWidth="1.8" />
      <line x1="92" y1="22" x2="183" y2="19" stroke={c} strokeWidth="1.5" />
      <path d="M107,25 L170,22 L172,54 L104,56 Z" fill={`${c}10`} stroke={c} strokeWidth="1" />
      <line x1="134" y1="22" x2="134" y2="56" stroke={c} strokeWidth="0.8" opacity="0.4" />
      <line x1="152" y1="21" x2="152" y2="55" stroke={c} strokeWidth="0.8" opacity="0.4" />
      <path d="M20,78 Q12,78 10,70 L20,57" stroke={c} strokeWidth="1.5" />
      <path d="M228,78 Q236,78 238,70 L228,57" stroke={c} strokeWidth="1.5" />
      <path d="M46,78 Q46,62 63,62 Q80,62 80,78" stroke={c} strokeWidth="1.8" fill={`${c}0A`} />
      <path d="M172,78 Q172,62 189,62 Q206,62 206,78" stroke={c} strokeWidth="1.8" fill={`${c}0A`} />
      <circle cx="63" cy="80" r="10" stroke={c} strokeWidth="2.2" />
      <circle cx="63" cy="80" r="4" stroke={c} strokeWidth="1.5" fill={`${c}20`} />
      <circle cx="189" cy="80" r="10" stroke={c} strokeWidth="2.2" />
      <circle cx="189" cy="80" r="4" stroke={c} strokeWidth="1.5" fill={`${c}20`} />
    </svg>
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

function CompCard({ car, refVehicle }) {
  const lenRatio = refVehicle?.length > 0 ? car.length / refVehicle.length : 1
  const hRatio   = refVehicle?.height > 0 ? car.height / refVehicle.height : 1
  const barW = Math.round(Math.min(100, lenRatio * 100))
  const barH = Math.round(Math.max(10, Math.min(32, hRatio * 28)))

  return (
    <div className="glass-card p-3.5 hover:border-cyan-400/25 transition-colors group">
      <p className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
        {car.make} {car.model}
      </p>
      <p className="text-[10px] text-slate-500 mb-2.5 truncate">
        {[car.year, car.version, car.power ? `${car.power} ch` : null].filter(Boolean).join(' · ')}
      </p>

      <div className="relative mb-2.5" style={{ height: '38px' }}>
        <div className="absolute bottom-0 left-0 w-full rounded border border-dashed border-slate-700/40"
          style={{ height: '28px' }} />
        <div className="absolute bottom-0 left-0 rounded border border-cyan-400/30"
          style={{ width: `${barW}%`, height: `${barH}px`, background: 'rgba(80,229,229,0.08)' }} />
      </div>

      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-[11px] font-semibold text-cyan-400">{car.length?.toLocaleString('fr-FR')}</span>
        <span className="text-[10px] text-slate-600">×</span>
        <span className="text-[10px] text-slate-400">{car.width?.toLocaleString('fr-FR')}</span>
        <span className="text-[10px] text-slate-600">×</span>
        <span className="text-[10px] text-slate-400">{car.height?.toLocaleString('fr-FR')} mm</span>
      </div>
      {car.segment && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{car.segment}</p>}
    </div>
  )
}

const SUGGESTIONS = [
  'Toyota Yaris Cross 2024', 'Renault Austral E-Tech 2024', 'Volkswagen ID.4 2024',
  'Peugeot 308 2024', 'BMW X1 2024', 'Mercedes GLC 2024', 'Dacia Duster 2024',
]

export default function Compare() {
  const { t, lang } = useSettings()
  const [details, setDetails]   = useState(EMPTY_DETAILS)
  const [loading, setLoading]   = useState(false)
  const [data, setData]         = useState(null)
  const [error, setError]       = useState(null)

  const vehicleName = vehicleNameOf(details)

  const analyze = async (overrideName) => {
    const name = (overrideName || vehicleName).trim()
    if (!name) return
    const descriptor = overrideName ? '' : formatVehicleDetails(details)
    const fullLabel  = [name, descriptor].filter(Boolean).join(' — ')

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const prompt = `Tu es expert automobile. Pour le véhicule "${fullLabel}", fournis:
1. Ses dimensions exactes et spécifications techniques
2. 6 à 8 modèles concurrents/équivalents de gabarit similaire (même segment) avec leurs dimensions

Réponds UNIQUEMENT en JSON valide (sans aucun texte autour, sans backticks markdown) avec exactement cette structure:
{
  "vehicle": {
    "make": "string",
    "model": "string",
    "year": number,
    "version": "string ou null",
    "segment": "string",
    "body": "string",
    "length": number,
    "width": number,
    "height": number,
    "wheelbase": number,
    "weight": number,
    "trunk": number,
    "engine": "string",
    "power": number,
    "torque": number,
    "co2": number_ou_null,
    "fuel": "string",
    "gearbox": "string",
    "acceleration": number,
    "topSpeed": number
  },
  "comparables": [
    {
      "make": "string",
      "model": "string",
      "year": number,
      "version": "string ou null",
      "segment": "string",
      "length": number,
      "width": number,
      "height": number,
      "wheelbase": number,
      "weight": number_ou_null,
      "power": number_ou_null
    }
  ]
}
Dimensions en mm, poids en kg, volumes en litres, puissance en ch, CO₂ en g/km WLTP.
Si une valeur est inconnue, mets null. JSON pur, rien d'autre.`

      const result = await sendMessage(
        [{ role: 'user', content: prompt }],
        { lang, maxTokens: 3000, expert: true, temperature: 0, tool: 'dimensions', stream: false },
      )
      setData(parseAIJson(result))
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setData(null); setError(null) }

  const veh   = data?.vehicle
  const comps = data?.comparables ?? []

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
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30 flex-shrink-0">
              <RotateCcw size={11} /> {t('dim_new_search')}
            </button>
          )}
        </div>

        {!loading && (
          <>
            <VehicleDetails value={details} onChange={setDetails} />
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
            <AIProgress active={loading} compact estimatedMs={10000} persistKey="dimensions" />
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

      {/* Vehicle hero */}
      {veh && (
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-xl font-black text-white leading-tight">
                {veh.make} {veh.model}
                {veh.year && <span className="text-slate-400 font-normal text-base ml-2">{veh.year}</span>}
              </h3>
              {veh.version && <p className="text-sm text-cyan-400 font-medium mt-0.5">{veh.version}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {veh.segment && (
                <span className="text-[10px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20
                                 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {veh.segment}
                </span>
              )}
              {veh.body && <span className="text-[10px] text-slate-500">{veh.body}</span>}
            </div>
          </div>

          {/* Car silhouette */}
          <div className="mb-4">
            <CarSilhouette />
          </div>

          {/* Wheelbase */}
          {veh.wheelbase && (
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/60 to-slate-700/60" />
              <span className="text-[10px] text-slate-500 font-medium px-2 whitespace-nowrap">
                {t('dim_wheelbase')} {veh.wheelbase?.toLocaleString('fr-FR')} mm
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-700/60 to-slate-700/60" />
            </div>
          )}

          {/* L × l × H */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-navy-900/60 border border-navy-700/40 mb-4">
            <DimStat label={t('dim_length')} value={veh.length} unit="mm" accent="text-cyan-400" />
            <DimStat label={t('dim_width')}  value={veh.width}  unit="mm" accent="text-emerald-400" />
            <DimStat label={t('dim_height')} value={veh.height} unit="mm" accent="text-purple-400" />
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {veh.power        != null && <SpecCell label={t('dim_power')}        value={`${veh.power} ch`} />}
            {veh.torque       != null && <SpecCell label={t('dim_torque')}       value={`${veh.torque} Nm`} />}
            {veh.co2          != null && <SpecCell label={t('dim_co2')}          value={`${veh.co2} g/km`} />}
            {veh.acceleration != null && <SpecCell label={t('dim_acceleration')} value={`${veh.acceleration} s`} />}
            {veh.fuel              && <SpecCell label={t('dim_fuel')}        value={veh.fuel} />}
            {veh.gearbox           && <SpecCell label={t('dim_gearbox')}     value={veh.gearbox} />}
            {veh.trunk        != null && <SpecCell label={t('dim_trunk')}        value={`${veh.trunk} L`} />}
            {veh.weight       != null && <SpecCell label={t('dim_weight')}       value={`${veh.weight?.toLocaleString('fr-FR')} kg`} />}
            {veh.topSpeed     != null && <SpecCell label={t('dim_top_speed')}    value={`${veh.topSpeed} km/h`} />}
            {veh.engine            && <SpecCell label={t('dim_engine')}      value={veh.engine} />}
          </div>
        </div>
      )}

      {/* Comparables */}
      {comps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3 px-0.5">
            <h3 className="text-sm font-bold text-white">{t('dim_comparables_title')}</h3>
            <span className="text-xs text-slate-500">{t('dim_comparables_subtitle')}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comps.map((car, i) => (
              <CompCard key={i} car={car} refVehicle={veh} />
            ))}
          </div>

          <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <Info size={10} className="flex-shrink-0" />
            {t('dim_disclaimer')}
          </p>
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
