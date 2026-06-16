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
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'

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
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')
  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory, togglePin } = useHistory('objections')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && !loading && !streaming)

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

  const generate = async () => {
    if (!vehicleName.trim()) return
    saveLastVehicle(vehicleName)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')

    try {
      const seg = SEGMENTS.find((s) => s.id === segment)
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

      let first = true
      const text = await sendMessage([{ role: 'user', content: prompt }], {
        lang, maxTokens: 2000, expert: true, temperature: 0.55,
        tool: 'objections', stream: true, systemStaticKey: 'objections',
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setReport(full)
        },
      })
      const label = `${vehicleName} · ${segLabel}`
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

  const reset = () => { setReport(''); setVehicleId(''); setDetails(EMPTY_DETAILS); setGeneratedFor('') }

  const restore = (item) => {
    setReport(item.report || '')
    setGeneratedFor(item.generatedFor)
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
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all active:scale-95 ${
                  segment === s.id
                    ? 'bg-cyan-400 text-navy-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{t(s.labelKey)}</span>
                <span className={`text-[10px] leading-tight ${segment === s.id ? 'text-navy-900/70' : 'text-slate-600'}`}>{t(s.subKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!vehicleName.trim() || loading || streaming}
          className="flex items-center justify-center gap-2 px-5 py-2.5
                     bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                     hover:bg-cyan-300 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          {(loading || streaming) ? <Spinner size="sm" /> : <ShieldCheck size={14} />}
          {(loading || streaming) ? t('generating') : t('generate_obj_btn')}
        </button>
      </div>

      {!loading && !streaming && <ErrorAlert message={error} onRetry={generate} />}

      {loading && !report && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {(report || streaming) && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor || t('page_objections_title')}</p>
            </div>
            {report && !streaming && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
                >
                  <Copy size={12} /> {t('copy_btn')}
                </button>
                <button
                  onClick={handleRaw}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
                >
                  <Braces size={12} /> {t('data_raw_btn')}
                </button>
                <button
                  onClick={handlePdf}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
                >
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={generate}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition">
                  <RefreshCw size={11} /> {t('regenerate')}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
                >
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          <div ref={objRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {streaming && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onRemove={removeHistory} onClear={clearHistory} onTogglePin={togglePin} primary={(item) => item.generatedFor} />
    </div>
  )
}
