import { Car, Euro, TrendingUp, Building2 } from 'lucide-react'
import KpiCard from '@/components/dashboard/KpiCard'
import SalesChart from '@/components/dashboard/SalesChart'
import TopModels from '@/components/dashboard/TopModels'
import RegionMap from '@/components/dashboard/RegionMap'
import { useSalesData } from '@/hooks/useSalesData'
import { useSettings } from '@/contexts/SettingsContext'

const KPI_ICONS = { total: Car, revenue: Euro, margin: TrendingUp, dealers: Building2 }

export default function Dashboard() {
  const { kpiData, monthlySales, topModels, regionData } = useSalesData()
  const { t } = useSettings()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} icon={KPI_ICONS[kpi.id]} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={monthlySales} />
        </div>
        <TopModels models={topModels} />
      </div>

      {/* Region */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RegionMap data={regionData} />

        {/* Quick insight */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">{t('dashboard_insight_title')}</h3>
            <p className="text-xs text-slate-500 mb-4">{t('dashboard_insight_subtitle')}</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t('dashboard_insight_p1')}{' '}
              <span className="text-cyan-400 font-semibold">+14,8 %</span>{' '}
              {t('dashboard_insight_p2')}{' '}
              <span className="text-red-400 font-semibold">-2,3 %</span>{' '}
              {t('dashboard_insight_p3')}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-700/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-slow" />
            <span className="text-xs text-slate-500">{t('dashboard_insight_analyzed')} · 23 mai 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
