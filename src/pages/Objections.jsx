import { useState, useRef } from 'react'
import { ShieldCheck, RefreshCw, RotateCcw, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { sendMessage, extractJSON } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import AIProgress from '@/components/ui/AIProgress'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle, readLastVehicleName } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { useResultFocus } from '@/hooks/useResultFocus'
import { exportToPdf, pdfFileName } from '@/utils/exportPdf'
import { useToast } from '@/components/ui/Toast'

const SEGMENTS = [
  { id: 'btoc', labelKey: 'btoc', subKey: 'btoc_sub' },
  { id: 'btob', labelKey: 'btob', subKey: 'btob_sub' },
]

const CATEGORY_COLORS = {
  prix: 'bg-warn/10 text-warn border-warn/20',
  marque: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  qualité: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  financement: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'après-vente': 'bg-warn/10 text-warn border-warn/20',
  revente: 'bg-red-400/10 text-red-400 border-red-400/20',
  malus: 'bg-red-400/10 text-red-400 border-red-400/20',
  concurrence: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
}

function ObjectionCard({ item, index, isOpen, onToggle, noAnimate }) {
  const { t } = useSettings()
  const catColor = CATEGORY_COLORS[item.categorie?.toLowerCase()] || CATEGORY_COLORS.concurrence

  return (
    <div className={`glass-card overflow-hidden transition-all duration-200 ${isOpen ? 'border-cyan-400/30' : ''}`}>
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start gap-3">
        <span className="text-xs font-bold text-slate-600 w-5 flex-shrink-0 mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-200 leading-snug">"{item.objection}"</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.categorie && (
                <span className={`hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                  {item.categorie}
                </span>
              )}
              {isOpen
                ? <ChevronUp size={15} className="text-cyan-400" />
                : <ChevronDown size={15} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className={`px-4 pb-4 pl-8 ${noAnimate ? '' : 'animate-fade-in'}`}>
          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">{t('recommended_answer')}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{item.reponse}</p>
          </div>
          {item.argument_cle && (
            <div className="mt-2 flex items-start gap-2">
              <ShieldCheck size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-cyan-300 italic">{item.argument_cle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Objections() {
  const { t, lang } = useSettings()
  const objRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [segment, setSegment] = useState('btoc')
  const [details, setDetails] = useState(() => ({ ...EMPTY_DETAILS, model: readLastVehicleName() }))
  const [loading, setLoading] = useState(false)
  const [objections, setObjections] = useState([])
  const [openIndex, setOpenIndex] = useState(0)
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')
  const [forceOpenAll, setForceOpenAll] = useState(false)
  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const { history, add: addHistory, clear: clearHistory } = useHistory('objections')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(objections.length > 0 && !loading)

  const allProducts = [...PRODUCTS, ...generated]
  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || vehicleNameOf(details)

  const generate = async () => {
    if (!vehicleName.trim()) return
    saveLastVehicle(vehicleName)
    setLoading(true)
    setError(null)
    setObjections([])

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
      const prompt = `Tu es expert commercial automobile pour Autobuyunion.

Génère exactement 10 objections clients fréquentes pour le ${vehicleName}, segment ${segLabel}.
${detailsLine ? `Détails véhicule : ${detailsLine}. Tiens-en compte pour des objections et réponses PRÉCISES (motorisation, âge, kilométrage, finition).\n` : ''}⚠️ MOTORISATION EXACTE : respecte STRICTEMENT la motorisation du nom du véhicule et des détails. Un « hybride » simple/micro-hybride/full hybrid n'est PAS un « hybride rechargeable » (plug-in/PHEV) : ne parle de recharge, de prise ou d'autonomie 100% électrique que si le véhicule est EXPLICITEMENT rechargeable. Ne substitue jamais une autre variante.
${productContext}

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte ni balise markdown avant ou après :
[
  {
    "objection": "Texte de l'objection telle que la dit le client",
    "categorie": "prix|marque|qualité|financement|après-vente|revente|malus|concurrence",
    "reponse": "Réponse commerciale percutante et chiffrée (2-3 phrases max)",
    "argument_cle": "L'argument massue en une phrase"
  }
]

Les objections doivent être réalistes, variées, couvrir : prix, marque inconnue, fiabilité, valeur de revente, malus, financement, SAV, concurrence. Sois concis pour que le JSON reste complet.`

      const raw = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 8192, expert: true, temperature: 0.55, tool: 'objections', stream: true })
      const data = extractJSON(raw, 'array')
      const label = `${vehicleName} · ${segLabel}`
      setObjections(data)
      setGeneratedFor(label)
      setOpenIndex(0)
      addHistory({ generatedFor: label, objections: data })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePdf = () => withExporting(async () => {
    // Déplie toutes les objections avant la capture : le PDF doit contenir
    // chaque réponse, pas seulement la carte ouverte à l'écran.
    setForceOpenAll(true)
    // Laisse React rendre l'état déplié avant le snapshot html2canvas.
    await new Promise((r) => setTimeout(r, 60))
    try {
      await exportToPdf(objRef, pdfFileName(vehicleName, t('page_objections_title')), { title: t('page_objections_title'), subtitle: vehicleName })
    } finally {
      setForceOpenAll(false)
    }
  })

  const reset = () => { setObjections([]); setVehicleId(''); setDetails(EMPTY_DETAILS); setGeneratedFor('') }

  const restore = (item) => {
    setObjections(item.objections)
    setGeneratedFor(item.generatedFor)
    setOpenIndex(0)
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
          disabled={!vehicleName.trim() || loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5
                     bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                     hover:bg-cyan-300 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? <Spinner size="sm" /> : <ShieldCheck size={14} />}
          {loading ? t('generating') : t('generate_obj_btn')}
        </button>
      </div>

      {!loading && <ErrorAlert message={error} onRetry={generate} />}

      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <AIProgress
            active={loading}
            stages={[t('ai_progress_connect'), t('ai_progress_analyze'), t('ai_progress_format')]}
            estimatedMs={22000}
            persistKey="objections"
          />
        </div>
      )}

      {objections.length > 0 && !loading && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor}</p>
              <p className="text-xs text-slate-500">{objections.length} {t('obj_count_hint')}</p>
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
          </div>

          <div ref={objRef} className="space-y-2">
            {objections.map((item, i) => (
              <ObjectionCard
                key={i}
                item={item}
                index={i}
                isOpen={forceOpenAll || openIndex === i}
                noAnimate={forceOpenAll}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onClear={clearHistory} primary={(item) => item.generatedFor} />
    </div>
  )
}
