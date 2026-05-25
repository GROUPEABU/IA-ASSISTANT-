import { Plus, Filter } from 'lucide-react'
import ReportCard from '@/components/reports/ReportCard'
import ReportTable from '@/components/reports/ReportTable'
import Button from '@/components/ui/Button'
import { useSalesData } from '@/hooks/useSalesData'
import { useSettings } from '@/contexts/SettingsContext'

export default function Reports() {
  const { reportList, tableRows } = useSalesData()
  const { t } = useSettings()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Filter size={14} />
            {t('reports_filter')}
          </Button>
          <Button size="sm">
            <Plus size={14} />
            {t('reports_new')}
          </Button>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reportList.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {/* Detailed table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">{t('reports_detailed_title')}</h2>
          <span className="text-xs text-slate-500">{tableRows.length} {t('reports_models_count')}</span>
        </div>
        <ReportTable rows={tableRows} />
      </div>
    </div>
  )
}
