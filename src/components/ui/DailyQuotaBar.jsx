import { useState, useEffect } from 'react'
import { Gauge } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getSpend, DAILY_CAP } from '@/utils/spendTracker'

/**
 * Jauge de consommation quotidienne — affichée en continu dans la sidebar
 * (façon Claude) pour visualiser l'usage du jour. Se met à jour en direct
 * après chaque appel IA (événement `abu:spend`) sans recharger la page.
 */
export default function DailyQuotaBar() {
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

  const pct     = Math.min(100, (day / DAILY_CAP) * 100)
  const reached = day >= DAILY_CAP
  const barColor = reached ? 'bg-red-400' : pct > 75 ? 'bg-warn/80' : 'bg-cyan-400/80'

  return (
    <div className="px-3 py-2.5 rounded-xl border border-navy-700/50 bg-navy-900/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <Gauge size={11} className="text-cyan-400/80" />
          {t('quota_daily_label')}
        </span>
        <span className={`text-[10px] font-mono tabular-nums ${reached ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
          €{day.toFixed(2)} / €{DAILY_CAP}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-navy-700/60 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {reached && (
        <p className="text-[9px] text-red-400/90 mt-1 leading-tight">{t('quota_daily_reached')}</p>
      )}
    </div>
  )
}
