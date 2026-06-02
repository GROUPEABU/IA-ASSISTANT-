import { AlertCircle, RefreshCw } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

/**
 * Bloc d'erreur réutilisable, avec bouton « Réessayer » optionnel.
 *
 * Centralise l'UI d'erreur jusque-là dupliquée dans PriceWatch, Objections,
 * PitchGenerator et Chat. Renvoie `null` si aucun message → l'appelant peut
 * l'inclure inconditionnellement.
 *
 * @param {object}   props
 * @param {string}   [props.message]  — message d'erreur (rien affiché si vide)
 * @param {function} [props.onRetry]  — si fourni, affiche un bouton de relance
 * @param {boolean}  [props.compact]  — variante fine (chat) au lieu d'une carte
 */
export default function ErrorAlert({ message, onRetry, compact = false }) {
  const { t } = useSettings()
  if (!message) return null

  const retryBtn = onRetry && (
    <button
      onClick={onRetry}
      className={`flex items-center gap-1.5 text-xs font-semibold text-cyan-400 border border-cyan-400/30
                  rounded-lg hover:bg-cyan-400/10 transition flex-shrink-0 ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
    >
      <RefreshCw size={compact ? 11 : 12} /> {t('retry_btn')}
    </button>
  )

  if (compact) {
    return (
      <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
        <p className="text-xs text-red-400 flex-1">{message}</p>
        {retryBtn}
      </div>
    )
  }

  return (
    <div className="glass-card p-4 flex items-start gap-2">
      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-400 flex-1">{message}</p>
      {retryBtn}
    </div>
  )
}
