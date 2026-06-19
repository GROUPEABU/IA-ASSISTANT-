import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, RefreshCw, RotateCcw, Download, Copy, Braces } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { takeBridgePayload } from '@/utils/toolBridge'
import { copyReportText, copyRawText } from '@/utils/mdToPlainText'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'
import { mdToHtml } from '@/utils/mdToHtml'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { useResultFocus } from '@/hooks/useResultFocus'
import { useToolBackground } from '@/contexts/ToolTasksContext'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'
import { BTN_TERTIARY, BTN_QUIET } from '@/utils/buttonStyles'

const TOOL = 'objections'
const EMPTY_SESSION = { report: '', generatedFor: '', error: null, replay: null }

const SEGMENTS = [
  { id: 'btoc', labelKey: 'btoc', subKey: 'btoc_sub' },
  { id: 'btob', labelKey: 'btob', subKey: 'btob_sub' },
]

export default function Objections() {
  const { t, lang } = useSettings()
  const objRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [segment, setSegment] = useState('btoc')
  const [details, setDetails] = useState(EMPTY_DETAILS)

  // Résultat + statut persistés (génération en fond + restauration au retour).
  const { s, patch, reset: resetSession, running, start, finish } = useToolBackground(TOOL, EMPTY_SESSION)
  const { report, generatedFor, error } = s

  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory, togglePin } = useHistory('objections')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && !running)

  // Pont inter-outils : véhicule reçu (Veille Prix) ou restauration (Hub).
  useEffect(() => {
    const p = takeBridgePayload('/objections')
    if (!p) return
    if (p.details) setDetails((d) => ({ ...d, ...p.details }))
    if (p.vehicleId) setVehicleId(p.vehicleId)
    if (p.restoreId != null) {
      const item = history.find((h) => (h.id ?? h.savedAt) === p.restoreId)
      if (item) restore(item)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allProducts = [...PRODUCTS, ...generated]
  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || vehicleNameOf(details)

  // Exécute la génération en écrivant dans la session (survit à la navigation).
  const runGenerate = async (replay) => {
    patch({ report: '', generatedFor: '', error: null, replay })
    start(replay.label)
    try {
      const text = await sendMessage(replay.messages, {
        ...replay.opts,
        onChunk: (full) => patch({ report: full }),
      })
      patch({ report: text, generatedFor: replay.label, error: null })
      finish('done')
      addHistory({ generatedFor: replay.label, report: text })
    } catch (err) {
      patch({ error: err.message })
      finish('error')
      toast(err.message, 'error')
    }
  }

  const generate = () => {
    if (!vehicleName.trim() || running) return
    saveLastVehicle(vehicleName)

    const seg = SEGMENTS.find((x) => x.id === segment)
    const segLabel = seg ? `${t(seg.labelKey)} — ${t(seg.subKey)}` : segment
    const productContext = selectedProduct
      ? `Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€
Origine : ${selectedProduct.origin}
CO₂ : ${selectedProduct.specs.co2_wltp} g/km
Segment : ${selectedProduct.segment}`
      : ''

    const detailsLine = formatVehicleDetails(details)
    const prompt = `Génère exactement 10 objections clients fréquentes pour le ${vehicleName}, segment ${segLabel}.
${detailsLine ? `Détails véhicule : ${detailsLine}. Tiens-en compte pour des objections et réponses PRÉCISES (motorisation, âge, kilométrage, finition).` : ''}
${productContext || ''}`

    runGenerate({
      messages: [{ role: 'user', content: prompt }],
      opts: { lang, maxTokens: 2000, expert: true, temperature: 0.55, tool: 'objections', stream: true, systemStaticKey: 'objections' },
      label: `${vehicleName} · ${segLabel}`,
    })
  }

  // Relance : réutilise la dernière requête (fonctionne même après navigation).
  const regenerate = () => { if (s.replay && !running) runGenerate(s.replay) }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(vehicleName, t('page_objections_title')), { title: t('page_objections_title'), subtitle: vehicleName })
  )

  const handleCopy = async () => {
    await copyReportText(report)
    toast(t('copy_done'), 'success')
  }

  const handleRaw = async () => {
    await copyRawText(report)
    toast(t('data_raw_done'), 'success')
  }

  const reset = () => { resetSession(); setVehicleId(''); setDetails(EMPTY_DETAILS) }

  const restore = (item) => {
    patch({ report: item.report || '', generatedFor: item.generatedFor, error: null, replay: null })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Config */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('page_objections_title')}</h2>
        </div>

        <VehicleDetails value={details} onChange={setDetails} />

        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            {t('segment_label')}
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-navy-900/60 rounded-xl border border-navy-700/40">
            {SEGMENTS.map((seg) => (
              <button
                key={seg.id}
                onClick={() => setSegment(seg.id)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all active:scale-95 ${
                  segment === seg.id
                    ? 'bg-cyan-400 text-navy-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{t(seg.labelKey)}</span>
                <span className={`text-[10px] leading-tight ${segment === seg.id ? 'text-navy-900/70' : 'text-slate-600'}`}>{t(seg.subKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!vehicleName.trim() || running}
          className="flex items-center justify-center gap-2 px-5 py-2.5
                     bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                     hover:bg-cyan-300 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          {running ? <Spinner size="sm" /> : <ShieldCheck size={14} />}
          {running ? t('generating') : t('generate_obj_btn')}
        </button>
      </div>

      {!running && <ErrorAlert message={error} onRetry={regenerate} />}

      {running && !report && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {(report || running) && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor || t('page_objections_title')}</p>
            </div>
            {report && !running && (
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
                <button onClick={regenerate} className={BTN_QUIET}>
                  <RefreshCw size={11} /> {t('regenerate')}
                </button>
                <button onClick={reset} className={BTN_QUIET}>
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          <div ref={objRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {running && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onRemove={removeHistory} onClear={clearHistory} onTogglePin={togglePin} primary={(item) => item.generatedFor} />
    </div>
  )
}
