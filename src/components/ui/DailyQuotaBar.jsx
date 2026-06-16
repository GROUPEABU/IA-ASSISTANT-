import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gauge, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getSpend, DAILY_CAP } from '@/utils/spendTracker'

/**
 * Jauge de consommation quotidienne — affichée en continu dans la sidebar
 * (façon Claude) pour visualiser l'usage du jour. Se met à jour en direct
 * après chaque appel IA (événement `abu:spend`) sans recharger la page.
 * Cliquable : ouvre le détail de l'utilisation dans les Réglages.
 */
export default function DailyQuotaBar({ onNavigate }) {
  const { user } = useAuth()
  const { t } = useSettings()
  const [day, setDay] = useState(0)

  useEffect(() => {
    if (user?.id == null) return
    const refresh = () => setDay(getSpend(user.id).day)
    refresh()
    window.addEventListener('abu:spend', refresh)
    // Synchronise aussi entre onglets et au retour de focus.
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('abu:spend', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [user?.id])

  if (user?.id == null) return null

  const pct      = Math.min(100, (day / DAILY_CAP) * 100)
  const reached  = day >= DAILY_CAP
  const near     = !reached && pct > 75
  const barWidth = day > 0 ? Math.max(pct, 4) : 0   // sliver visible dès le 1er centime
  const barColor = reached
    ? 'from-red-400 to-red-500'
    : near
      ? 'from-warn/80 to-amber-400'
      : 'from-cyan-400 to-emerald-400'

  return (
    <Link
      to="/settings#usage"
      onClick={onNavigate}
      title={t('quota_daily_tooltip')}
      className="group block px-3.5 py-3 rounded-xl border border-navy-700/50 bg-navy-900/40
                 hover:border-cyan-400/30 hover:bg-navy-900/70 transition-colors"
    >
      {/* Ligne 1 — libellé + indicateur cliquable */}
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">
          <span className="w-5 h-5 rounded-md bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center flex-shrink-0">
            <Gauge size={11} className="text-cyan-400" />
          </span>
          {t('quota_daily_label')}
        </span>
        <ChevronRight
          size={14}
          className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all"
        />
      </div>

      {/* Ligne 2 — montant du jour */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={`text-lg font-bold leading-none tabular-nums ${reached ? 'text-red-400' : 'text-white'}`}>
          €{day.toFixed(2)}
        </span>
        <span className="text-[10px] text-slate-500 leading-none">/ €{DAILY_CAP}</span>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 rounded-full bg-navy-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {reached && (
        <p className="text-[9px] text-red-400/90 mt-1.5 leading-tight">{t('quota_daily_reached')}</p>
      )}
    </Link>
  )
}
