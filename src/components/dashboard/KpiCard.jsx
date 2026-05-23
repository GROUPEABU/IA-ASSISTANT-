import clsx from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function KpiCard({ title, value, delta, deltaLabel, icon: Icon, color = 'cyan' }) {
  const isPositive = delta >= 0

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          color === 'cyan' ? 'bg-cyan-400/10 text-cyan-400' : 'bg-emerald-400/10 text-emerald-400',
        )}>
          <Icon size={16} />
        </div>
      </div>

      <p className="text-2xl font-bold text-white mb-2">{value}</p>

      <div className="flex items-center gap-1.5">
        {isPositive
          ? <TrendingUp size={13} className="text-emerald-400" />
          : <TrendingDown size={13} className="text-red-400" />}
        <span className={clsx('text-xs font-semibold', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? '+' : ''}{delta}%
        </span>
        <span className="text-xs text-slate-500">{deltaLabel}</span>
      </div>
    </div>
  )
}
