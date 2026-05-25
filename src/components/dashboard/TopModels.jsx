import Badge from '@/components/ui/Badge'
import { useSettings } from '@/contexts/SettingsContext'

export default function TopModels({ models }) {
  const { t } = useSettings()
  const max = Math.max(...models.map((m) => m.units))

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">{t('top_models_title')}</h3>
      <p className="text-xs text-slate-500 mb-4">{t('top_models_month')}</p>

      <ul className="space-y-3">
        {models.map((model, i) => (
          <li key={model.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 w-4">{i + 1}</span>
                <span className="text-sm font-medium text-slate-200">{model.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{model.units.toLocaleString()}</span>
                <Badge variant={model.trend >= 0 ? 'success' : 'danger'}>
                  {model.trend >= 0 ? '+' : ''}{model.trend}%
                </Badge>
              </div>
            </div>
            <div className="h-1.5 bg-navy-900/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${(model.units / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
