import { useState, useRef, useEffect } from 'react'
import { Mic, RefreshCw, RotateCcw, Users, Car, Wrench, Building2, Briefcase, Download, Copy, Braces } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { takeBridgePayload } from '@/utils/toolBridge'
import { copyReportText, copyRawText } from '@/utils/mdToPlainText'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'
import { mdToHtml } from '@/utils/mdToHtml'
import { veillePrixRefBlock } from '@/utils/veillePrix'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { useResultFocus } from '@/hooks/useResultFocus'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'
import { BTN_TERTIARY, BTN_QUIET } from '@/utils/buttonStyles'

const PROFILES = [
  { id: 'btoc_famille', labelKey: 'profile_family', subKey: 'profile_family_sub', icon: Users,     segment: 'btoc', color: '#50E5E5' },
  { id: 'btoc_rouleur', labelKey: 'profile_driver', subKey: 'profile_family_sub', icon: Car,       segment: 'btoc', color: '#7DD3FC' },
  { id: 'btob_pme',     labelKey: 'profile_pme',    subKey: 'profile_pme_sub',    icon: Wrench,    segment: 'btob', color: '#E6B450' },
  { id: 'btob_flotte',  labelKey: 'profile_fleet',  subKey: 'profile_fleet_sub',  icon: Building2, segment: 'btob', color: '#CC8B3D' },
  { id: 'btob_cadre',   labelKey: 'profile_exec',   subKey: 'profile_exec_sub',   icon: Briefcase, segment: 'btob', color: '#a78bfa' },
]

export default function PitchGenerator() {
  const { t, lang } = useSettings()
  const pitchRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [profileId, setProfileId] = useState('btoc_famille')
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')

  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const allProducts = [...PRODUCTS, ...generated]
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory, togglePin } = useHistory('pitch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && !loading && !streaming)

  // Pont inter-outils : véhicule reçu (Veille Prix) ou restauration (Hub).
  useEffect(() => {
    const p = takeBridgePayload('/pitch')
    if (!p) return
    if (p.details) setDetails((d) => ({ ...d, ...p.details }))
    if (p.vehicleId) setVehicleId(p.vehicleId)
    if (p.restoreId != null) {
      const item = history.find((h) => (h.id ?? h.savedAt) === p.restoreId)
      if (item) restore(item)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || vehicleNameOf(details)
  const profile = PROFILES.find((p) => p.id === profileId)

  const generate = async () => {
    if (!vehicleName.trim()) return
    saveLastVehicle(vehicleName)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')

    try {
      const productContext = selectedProduct
        ? [
            'DONNÉES PRODUIT :',
            `- Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€`,
            `- Segment : ${selectedProduct.segment}`,
            selectedProduct.specs?.motorisation && `- Motorisation : ${selectedProduct.specs.motorisation}`,
            selectedProduct.specs?.consommation && `- Consommation WLTP : ${selectedProduct.specs.consommation}`,
            `- CO₂ : ${selectedProduct.specs.co2_wltp} g/km`,
            selectedProduct.specs?.autonomie_wltp ? `- Autonomie : ${selectedProduct.specs.autonomie_wltp} km` : null,
            selectedProduct.garantie?.vehicule && `- Garantie : ${selectedProduct.garantie.vehicule}`,
            selectedProduct[profile.segment]?.atouts && `- Atouts ${profile.segment === 'btob' ? 'BtoB' : 'BtoC'} : ${selectedProduct[profile.segment].atouts.join(' | ')}`,
            `- Argument prix : ${selectedProduct[profile.segment]?.argument_prix || selectedProduct.btoc?.argument_prix || ''}`,
            selectedProduct[profile.segment]?.objections && `- Objections courantes : ${selectedProduct[profile.segment].objections.join(' | ')}`,
          ].filter(Boolean).join('\n')
        : ''

      const prompt = `Génère un pitch de vente structuré et percutant pour le ${vehicleName}, destiné à : ${t(profile.subKey)} — ${t(profile.labelKey)}.
${formatVehicleDetails(details) ? `Détails véhicule : ${formatVehicleDetails(details)}. Appuie-toi dessus pour des arguments PRÉCIS (motorisation, âge, kilométrage, finition).` : ''}
${context ? `Contexte client : ${context}` : ''}
${productContext || ''}${veillePrixRefBlock(vehicleName)}`

      let first = true
      const text = await sendMessage([{ role: 'user', content: prompt }], {
        lang, maxTokens: 1800, expert: true, temperature: 0.85,
        tool: 'pitch', stream: true, systemStaticKey: 'pitch',
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setReport(full)
        },
      })
      const label = `${vehicleName} · ${t(profile.subKey)} ${t(profile.labelKey)}`
      setReport(text)
      setStreaming(false)
      setGeneratedFor(label)
      addHistory({ generatedFor: label, report: text })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(vehicleName, t('page_pitch_title')), { title: t('page_pitch_title'), subtitle: vehicleName })
  )

  const handleCopy = async () => {
    await copyReportText(report)
    toast(t('copy_done'), 'success')
  }

  const handleRaw = async () => {
    await copyRawText(report)
    toast(t('data_raw_done'), 'success')
  }

  const reset = () => { setReport(''); setVehicleId(''); setDetails(EMPTY_DETAILS); setContext(''); setGeneratedFor('') }

  const restore = (item) => {
    setReport(item.report || '')
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


        <VehicleDetails value={details} onChange={setDetails} />

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
          disabled={!vehicleName.trim() || loading || streaming}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5
                     bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900 text-sm font-bold rounded-xl
                     hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-400/15"
        >
          {(loading || streaming) ? <Spinner size="sm" /> : <Mic size={14} />}
          {(loading || streaming) ? t('generating') : t('generate_pitch_btn')}
        </button>
      </div>

      {loading && !report && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {!loading && !streaming && <ErrorAlert message={error} onRetry={generate} />}

      {(report || streaming) && (
        <div className="space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor || t('page_pitch_title')}</p>
              <p className="text-xs text-slate-500">{t('pitch_ready')}</p>
            </div>
            {report && !streaming && (
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className={BTN_TERTIARY}>
                  <Copy size={12} /> {t('copy_btn')}
                </button>
                <button onClick={handleRaw} className={BTN_TERTIARY}>
                  <Braces size={12} /> {t('data_raw_btn')}
                </button>
                <button onClick={handlePdf} disabled={exporting} className={BTN_TERTIARY}>
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={generate} className={BTN_QUIET}>
                  <RefreshCw size={11} /> {t('regenerate')}
                </button>
                <button onClick={reset} className={BTN_QUIET}>
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          <div ref={pitchRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {streaming && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </div>
      )}

      <HistoryPanel items={history} onRestore={restore} onRemove={removeHistory} onClear={clearHistory} onTogglePin={togglePin} primary={(item) => item.generatedFor} />
    </div>
  )
}
