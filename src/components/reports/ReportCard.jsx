import { FileBarChart2, Download, Eye } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export default function ReportCard({ report }) {
  const statusVariant = {
    ready: 'success',
    pending: 'warning',
    error: 'danger',
  }[report.status] ?? 'default'

  return (
    <div className="glass-card p-4 flex items-start gap-4 hover:border-cyan-400/20 transition-all duration-150">
      <div className="w-10 h-10 rounded-lg bg-cyan-400/10 border border-cyan-400/20
                      flex items-center justify-center text-cyan-400 flex-shrink-0">
        <FileBarChart2 size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-white truncate">{report.title}</p>
          <Badge variant={statusVariant}>{report.statusLabel}</Badge>
        </div>
        <p className="text-xs text-slate-500 mb-2">{report.description}</p>
        <p className="text-xs text-slate-600">{report.date}</p>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <button className="w-8 h-8 rounded-lg border border-navy-700/50 flex items-center justify-center
                           text-slate-500 hover:text-cyan-400 hover:border-cyan-400/30 transition">
          <Eye size={14} />
        </button>
        <button className="w-8 h-8 rounded-lg border border-navy-700/50 flex items-center justify-center
                           text-slate-500 hover:text-cyan-400 hover:border-cyan-400/30 transition">
          <Download size={14} />
        </button>
      </div>
    </div>
  )
}
