import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2, Car, Sparkles } from 'lucide-react'
import { parseImportFile, productsFromRows } from '@/services/importParser'
import { extractVehiclesSmart } from '@/services/smartImport'
import { useSettings } from '@/contexts/SettingsContext'
import useFocusTrap from '@/hooks/useFocusTrap'

/**
 * Import d'un fichier de stock (CSV / Excel .xlsx) → fiches produit groupées
 * par modèle, avec veille prix interne (min / moyen / max) calculée sur le
 * stock réel. Aperçu avant validation, aucune donnée perdue.
 */
// Ligne canonique (smartImport) → schéma normalizeRow attendu par productsFromRows.
const toProductRow = (v) => ({
  model: [v.make, v.model, v.version].filter(Boolean).join(' '),
  couleur: v.couleur || '',
  vin: v.vin || '',
  equipements: '',
  carburant: v.fuel || '',
  boite: v.gearbox || '',
  kms: v.mileageKm,
  co2: v.co2,
  prix_ht: v.prixHt,
  prix_ttc: v.priceEur,
  prix: v.priceEur ?? v.prixHt,
  immatStr: '',
  year: v.year,
})

export default function ImportModal({ onImported, onClose }) {
  const { t, formatCurrency, lang } = useSettings()
  const fileRef = useRef(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null) // { products, vehicleCount, modelCount }
  const [smartUsed, setSmartUsed] = useState(false)
  const [fileName, setFileName] = useState('')
  const trapRef = useFocusTrap()

  // Close on Escape — standard dialog affordance for keyboard users.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setParsing(true)
    setError(null)
    setPreview(null)
    setSmartUsed(false)
    try {
      const res = await parseImportFile(file)
      setPreview(res)
    } catch {
      // Format libre non reconnu → lecture adaptative IA (comme Claude chat).
      try {
        const { vehicles, source } = await extractVehiclesSmart(file, { lang })
        const rows = vehicles.map(toProductRow).filter((r) => r.model)
        if (!rows.length) throw new Error(t('pw_batch_none'))
        setPreview(productsFromRows(rows))
        setSmartUsed(source === 'ai')
      } catch (smartErr) {
        setError(smartErr.message)
      }
    } finally {
      setParsing(false)
    }
  }

  const confirm = () => {
    if (!preview?.products?.length) return
    preview.products.forEach((p) => onImported(p))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('import_title')}
        className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-navy-800
                      border border-navy-700/70 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-navy-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-white">{t('import_title')}</p>
              <p className="text-xs text-slate-500">{t('import_subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('close') || 'Fermer'} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {/* Zone de dépôt */}
          {!preview && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 px-4
                         border-2 border-dashed border-navy-600/60 rounded-2xl
                         hover:border-cyan-400/40 hover:bg-cyan-400/5 transition disabled:opacity-50"
            >
              {parsing
                ? <Loader2 size={28} className="text-cyan-400 animate-spin" />
                : <Upload size={28} className="text-slate-500" />}
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {parsing ? t('import_parsing') : t('import_drop')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{t('import_formats')}</p>
                {fileName && <p className="text-[11px] text-cyan-400/80 mt-2">{fileName}</p>}
              </div>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xlsm,.txt,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Erreur */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Aperçu */}
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-300">
                  {t('import_detected')
                    .replace('{v}', preview.vehicleCount)
                    .replace('{m}', preview.modelCount)}
                </p>
              </div>

              {smartUsed && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-400/10 border border-violet-400/20">
                  <Sparkles size={13} className="text-violet-400 flex-shrink-0" />
                  <p className="text-[11px] text-violet-300">{t('import_smart_badge')}</p>
                </div>
              )}

              <div className="space-y-2">
                {preview.products.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-navy-900/40 border border-navy-700/40">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Car size={14} className="text-cyan-400 flex-shrink-0" />
                        <p className="text-sm font-semibold text-white truncate">{p.fullName}</p>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        {p._importStats.count} u.
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-2">
                      <div>
                        <p className="text-xs font-bold text-white">{formatCurrency(p._importStats.prixMin)}</p>
                        <p className="text-[9px] text-slate-500">{t('import_price_min')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-cyan-400">{formatCurrency(p._importStats.prixMoy)}</p>
                        <p className="text-[9px] text-slate-500">{t('import_price_avg')} {p._importStats.priceBasis}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{formatCurrency(p._importStats.prixMax)}</p>
                        <p className="text-[9px] text-slate-500">{t('import_price_max')}</p>
                      </div>
                    </div>
                    {p._importStats.co2Moy > 0 && (
                      <p className="text-[10px] text-slate-500 mt-2 text-center">
                        CO₂ ~{p._importStats.co2Moy} g/km
                        {p._importStats.kmMoy != null && ` · ${p._importStats.kmMoy.toLocaleString('fr-FR')} km moy.`}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={confirm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 text-navy-900
                             text-sm font-bold rounded-xl hover:bg-cyan-300 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={16} />
                  {t('import_confirm').replace('{m}', preview.modelCount)}
                </button>
                <button
                  onClick={() => { setPreview(null); setFileName('') }}
                  className="px-4 py-3 text-sm text-slate-400 border border-navy-600/50 rounded-xl hover:text-white transition"
                >
                  {t('import_reset')}
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-600 mt-4 text-center">{t('import_disclaimer')}</p>
        </div>
      </div>
    </div>
  )
}
