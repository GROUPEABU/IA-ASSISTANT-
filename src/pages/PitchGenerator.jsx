import { useState, useRef } from 'react'
import { Mic, Copy, Check, RefreshCw, RotateCcw, AlertCircle, ChevronRight, Users, Car, Wrench, Building2, Briefcase, Download, History, Trash2 } from 'lucide-react'
import { sendMessage, extractJSON } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { exportToPdf } from '@/utils/exportPdf'

const PROFILES = [
  { id: 'btoc_famille', labelKey: 'profile_family', subKey: 'profile_family_sub', icon: Users,     segment: 'btoc', color: '#50E5E5' },
  { id: 'btoc_rouleur', labelKey: 'profile_driver', subKey: 'profile_family_sub', icon: Car,       segment: 'btoc', color: '#7DD3FC' },
  { id: 'btob_pme',     labelKey: 'profile_pme',    subKey: 'profile_pme_sub',    icon: Wrench,    segment: 'btob', color: '#fbbf24' },
  { id: 'btob_flotte',  labelKey: 'profile_fleet',  subKey: 'profile_fleet_sub',  icon: Building2, segment: 'btob', color: '#fb923c' },
  { id: 'btob_cadre',   labelKey: 'profile_exec',   subKey: 'profile_exec_sub',   icon: Briefcase, segment: 'btob', color: '#a78bfa' },
]

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
            <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{item.generatedFor}</p>
            <p className="text-[10px] text-slate-600">{new Date(item.savedAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PitchGenerator() {
  const { t, lang } = useSettings()
  const pitchRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [customVehicle, setCustomVehicle] = useState('')
  const [profileId, setProfileId] = useState('btoc_famille')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [pitch, setPitch] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [generatedFor, setGeneratedFor] = useState('')
  const [exporting, setExporting] = useState(false)

  const { generated } = useGeneratedProducts()
  const allProducts = [...PRODUCTS, ...generated]
  const { history, add: addHistory, clear: clearHistory } = useHistory('pitch')

  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || customVehicle
  const profile = PROFILES.find((p) => p.id === profileId)

  const generate = async () => {
    if (!vehicleName.trim()) return
    setLoading(true)
    setError(null)
    setPitch(null)

    try {
      const productContext = selectedProduct
        ? `
DONNÉES PRODUIT :
- Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€
- Segment : ${selectedProduct.segment}
- Motorisation : ${selectedProduct.specs.motorisation}
- Consommation WLTP : ${selectedProduct.specs.consommation}
- CO₂ : ${selectedProduct.specs.co2_wltp} g/km
- Autonomie : ${selectedProduct.specs.autonomie_wltp} km
- Garantie : ${selectedProduct.garantie.vehicule}
- Atouts ${profile.segment === 'btob' ? 'BtoB' : 'BtoC'} : ${selectedProduct[profile.segment].atouts.join(' | ')}
- Argument prix : ${selectedProduct[profile.segment].argument_prix || selectedProduct.btoc.argument_prix || ''}
- Objections courantes : ${selectedProduct[profile.segment].objections.join(' | ')}`
        : ''

      const prompt = `Tu es un expert commercial automobile pour Autobuyunion.

Génère un pitch de vente structuré et percutant pour le ${vehicleName}, destiné à : ${t(profile.subKey)} — ${t(profile.labelKey)}.
${context ? `\nContexte client : ${context}` : ''}
${productContext}

Réponds UNIQUEMENT en JSON valide :
{
  "accroche": "2-3 phrases d'accroche percutantes, adaptées au profil, avec chiffres si possible",
  "arguments": [
    "Argument 1 concret avec données chiffrées",
    "Argument 2 concret avec données chiffrées",
    "Argument 3 concret avec données chiffrées"
  ],
  "objections": [
    {"question": "Objection probable du client", "reponse": "Réponse commerciale en 2-3 phrases avec argument concret"},
    {"question": "Deuxième objection probable", "reponse": "Réponse commerciale en 2-3 phrases avec argument concret"}
  ],
  "closing": "Phrase de closing engageante avec appel à l'action"
}`

      const raw = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 1500 })
      const data = extractJSON(raw, 'object')
      const label = `${vehicleName} · ${t(profile.subKey)} ${t(profile.labelKey)}`
      setPitch(data)
      setGeneratedFor(label)
      addHistory({ generatedFor: label, pitch: data })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySection = (text) => navigator.clipboard.writeText(text)

  const copyAll = () => {
    if (!pitch) return
    const text = [
      'ACCROCHE\n' + pitch.accroche,
      '\nARGUMENTS CLÉS\n' + pitch.arguments.map((a, i) => `${i + 1}. ${a}`).join('\n'),
      '\nOBJECTIONS\n' + pitch.objections.map((o) => `Q: ${o.question}\nR: ${o.reponse}`).join('\n\n'),
      '\nCLOSING\n' + pitch.closing,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePdf = async () => {
    setExporting(true)
    try {
      await exportToPdf(pitchRef, `pitch_${vehicleName.replace(/ /g, '_')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  const reset = () => { setPitch(null); setVehicleId(''); setCustomVehicle(''); setContext(''); setGeneratedFor('') }

  const restore = (item) => {
    setPitch(item.pitch)
    setGeneratedFor(item.generatedFor)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Config ── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center">
            <Mic size={15} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">{t('page_pitch_title')}</h2>
            <p className="text-[11px] text-slate-500">{t('page_pitch_sub')}</p>
          </div>
        </div>

        {/* Vehicle */}
        <div className="mb-3">
          <label className="section-label block mb-1">{t('vehicle_label')}</label>
          <input
            type="text"
            value={customVehicle}
            onChange={(e) => { setCustomVehicle(e.target.value); setVehicleId('') }}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder={t('vehicle_ph')}
            className="input-field"
          />
        </div>

        {/* Catalog shortcuts */}
        {allProducts.length > 0 && (
          <div className="mb-4">
            <p className="section-label block mb-1.5">{t('catalog_shortcuts')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setVehicleId(p.id); setCustomVehicle(p.fullName) }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition truncate text-left ${
                    vehicleId === p.id
                      ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/40'
                      : 'text-slate-400 border-navy-600/50 hover:text-cyan-400 hover:border-cyan-400/30'
                  }`}
                >
                  {p.fullName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile selector */}
        <div className="mb-4">
          <label className="section-label block mb-2">{t('client_profile')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROFILES.map((p) => {
              const Icon = p.icon
              const isActive = profileId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'border-transparent'
                      : 'border-navy-600/50 hover:border-navy-600 hover:bg-navy-700/20'
                  }`}
                  style={isActive ? { background: `${p.color}12`, borderColor: `${p.color}35` } : {}}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? `${p.color}20` : 'rgba(255,255,255,0.04)' }}
                  >
                    <Icon size={14} style={{ color: isActive ? p.color : '#64748b' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isActive ? p.color : '#94a3b8' }}>{t(p.labelKey)}</p>
                    <p className="text-[10px] text-slate-600 truncate">{t(p.subKey)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Context */}
        <div className="mb-4">
          <label className="section-label block mb-1">
            {t('context_label')} <span className="text-slate-600 normal-case font-normal">{t('context_optional')}</span>
          </label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t('context_ph')}
            className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-white placeholder-slate-600 resize-none
                       focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 transition"
          />
        </div>

        <button
          onClick={generate}
          disabled={!vehicleName.trim() || loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5
                     bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900 text-sm font-bold rounded-xl
                     hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-400/15"
        >
          {loading ? <Spinner size="sm" /> : <Mic size={14} />}
          {loading ? t('generating') : t('generate_pitch_btn')}
        </button>
      </div>

      {loading && (
        <div className="glass-card p-10 flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-4 flex gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {pitch !== null && !loading && (
        <div className="space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{generatedFor}</p>
              <p className="text-xs text-slate-500">{t('pitch_ready')}</p>
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
              <button onClick={generate} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition px-2.5 py-1.5 rounded-lg hover:bg-cyan-400/5">
                <RefreshCw size={11} /> {t('regenerate')}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
              >
                <RotateCcw size={11} /> {t('new_analysis_btn')}
              </button>
            </div>
          </div>

          {/* PDF capture zone */}
          <div ref={pitchRef} className="space-y-3">
            {/* Accroche */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                    <span className="text-emerald-400 text-xs font-bold leading-none">1</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{t('hook_label')}</span>
                </div>
                <button onClick={() => copySection(pitch.accroche)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition">
                  <Copy size={12} />
                </button>
              </div>
              <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-xl p-4">
                <p className="text-sm text-slate-200 leading-relaxed">{pitch.accroche}</p>
              </div>
            </div>

            {/* Arguments */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-400/15 flex items-center justify-center">
                  <span className="text-cyan-400 text-xs font-bold leading-none">2</span>
                </div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('key_args')}</span>
              </div>
              <div className="space-y-2">
                {pitch.arguments.map((arg, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-navy-900/30">
                    <span className="text-[10px] font-bold text-cyan-400/60 flex-shrink-0 mt-0.5 w-4">{i + 1}</span>
                    <p className="text-sm text-slate-300 leading-snug">{arg}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Objections */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-amber-400/15 flex items-center justify-center">
                  <span className="text-amber-400 text-xs font-bold leading-none">3</span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t('obj_responses')}</span>
              </div>
              <div className="space-y-2.5">
                {pitch.objections.map((obj, i) => (
                  <div key={i} className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-3.5">
                    <p className="text-sm font-semibold text-slate-300 mb-2">"{obj.question}"</p>
                    <div className="flex items-start gap-2">
                      <ChevronRight size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-400 leading-relaxed">{obj.reponse}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Closing */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-400/15 flex items-center justify-center">
                    <span className="text-violet-400 text-xs font-bold leading-none">4</span>
                  </div>
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">{t('closing_label')}</span>
                </div>
                <button onClick={() => copySection(pitch.closing)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition">
                  <Copy size={12} />
                </button>
              </div>
              <div className="bg-violet-400/5 border border-violet-400/15 rounded-xl p-4">
                <p className="text-sm text-slate-200 leading-relaxed">{pitch.closing}</p>
              </div>
            </div>
          </div>

          {/* Copy all */}
          <button
            onClick={copyAll}
            className="w-full flex items-center justify-center gap-2 px-5 py-3
                       bg-navy-800/60 border border-navy-700/50 rounded-xl
                       text-sm font-semibold text-slate-300
                       hover:border-cyan-400/30 hover:text-cyan-300 active:scale-95 transition-all"
          >
            {copied ? (
              <><Check size={14} className="text-emerald-400" /><span className="text-emerald-400">{t('copied')}</span></>
            ) : (
              <><Copy size={14} />{t('copy_pitch')}</>
            )}
          </button>
        </div>
      )}

      <HistoryPanel history={history} onRestore={restore} onClear={clearHistory} t={t} />
    </div>
  )
}
