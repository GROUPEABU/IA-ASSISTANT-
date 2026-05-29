import { FileSpreadsheet, Palette, Gauge as GaugeIcon } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

/**
 * Panneau « Stock importé + veille prix interne » pour les fiches issues
 * d'un import CSV/Excel. Affiche les statistiques de prix (min/moy/max)
 * calculées sur le stock réel, puis le détail unité par unité (VIN, km,
 * couleur, immatriculation, prix) — aucune donnée perdue.
 */
export default function ImportedStockPanel({ product }) {
  const { t, formatCurrency } = useSettings()
  const stats = product._importStats
  const stock = product._importStock || []
  if (!stats) return null

  return (
    <div className="space-y-3">
      {/* Veille prix interne */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet size={14} className="text-emerald-400" />
          <p className="text-sm font-semibold text-white">{t('import_internal_watch')}</p>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            {stats.count} u. · {stats.priceBasis}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="text-base font-bold text-white">{formatCurrency(stats.prixMin)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('import_price_min')}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-base font-bold text-cyan-400">{formatCurrency(stats.prixMoy)}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">{t('import_price_avg')}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-base font-bold text-white">{formatCurrency(stats.prixMax)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('import_price_max')}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-base font-bold text-white">{stats.co2Moy > 0 ? `${stats.co2Moy}` : '—'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">CO₂ g/km {t('import_avg_short')}</p>
          </div>
        </div>
      </div>

      {/* Détail du stock */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">
          {t('import_stock_detail')} ({stock.length})
        </p>
        <div className="space-y-1.5">
          {stock.map((u, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl
                                    bg-navy-900/40 border border-navy-700/30">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-slate-300 truncate">{u.vin}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {u.couleur && u.couleur !== '—' && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Palette size={9} /> {u.couleur}
                    </span>
                  )}
                  {u.kms != null && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <GaugeIcon size={9} /> {u.kms.toLocaleString('fr-FR')} km
                    </span>
                  )}
                  {u.immat && u.immat !== '—' && (
                    <span className="text-[10px] text-slate-500">{u.immat}</span>
                  )}
                </div>
              </div>
              {u.prix != null && (
                <span className="text-xs font-bold text-cyan-400 flex-shrink-0">
                  {formatCurrency(u.prix)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
