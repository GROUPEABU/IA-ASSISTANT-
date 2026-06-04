import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { generateProductFromWeb } from '@/services/generateProduct'
import { useSettings } from '@/contexts/SettingsContext'
import useFocusTrap from '@/hooks/useFocusTrap'
import AIProgress from '@/components/ui/AIProgress'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'

const SUGGESTIONS = [
  'Toyota Yaris Cross 2024',
  'Renault Austral E-Tech',
  'Volkswagen ID.4 2024',
  'Peugeot e-2008',
  'BMW X1 2024',
  'Tesla Model Y',
  'Hyundai Tucson Hybrid',
  'Dacia Bigster 2025',
]

export default function VehicleSearchModal({ onGenerated, onClose }) {
  const { t } = useSettings()
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [searchLabel, setSearchLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('idle') // idle | loading | done
  const trapRef = useFocusTrap()

  const vehicleName = vehicleNameOf(details)

  // Close on Escape — standard dialog affordance for keyboard users.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const generate = async (overrideName) => {
    const name = (overrideName || vehicleName).trim()
    if (!name) return
    const descriptor = overrideName ? '' : formatVehicleDetails(details)
    setSearchLabel(name)
    setLoading(true)
    setError(null)
    setStep('loading')

    try {
      const product = await generateProductFromWeb(name, descriptor)
      onGenerated(product)
      onClose()
    } catch (err) {
      setError(err.message)
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('modal_generate_sheet')}
        className="relative w-full sm:max-w-lg bg-navy-800 border border-navy-700/70
                      rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-navy-700/50">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-white">{t('modal_generate_sheet')}</p>
              <p className="text-xs text-slate-500">{t('modal_ai_subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('close') || 'Fermer'} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Filtres véhicule (identiques à la Veille Prix) */}
        <div className="p-4">
          {!loading && (
            <>
              <VehicleDetails value={details} onChange={setDetails} />
              <button
                onClick={() => generate()}
                disabled={!vehicleName.trim() || loading}
                className="w-full px-4 py-3 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                           hover:bg-cyan-300 active:scale-95 transition-all
                           disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                {t('modal_generate_btn')}
              </button>
            </>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="text-cyan-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{t('modal_analyzing')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('modal_analyzing_detail')} "{searchLabel}"
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <AIProgress active={loading} compact estimatedMs={16000} persistKey="vehiclesearch" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Suggestions */}
          {!loading && (
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                {t('modal_suggestions')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => generate(s)}
                    className="text-xs text-slate-400 bg-navy-700/50 border border-navy-600/50
                               px-2.5 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-600 mt-4 text-center">
            {t('modal_disclaimer')}
          </p>
        </div>
      </div>
    </div>
  )
}
