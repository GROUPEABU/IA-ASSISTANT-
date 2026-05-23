import Badge from '@/components/ui/Badge'
import { formatNumber, formatPercent } from '@/utils/formatters'

export default function ReportTable({ rows }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700/50">
              {['Modèle', 'Marque', 'Ventes', 'CA (€)', 'Évolution', 'Région'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/30">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-navy-700/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{row.model}</td>
                <td className="px-4 py-3 text-slate-400">{row.brand}</td>
                <td className="px-4 py-3 text-slate-300">{formatNumber(row.units)}</td>
                <td className="px-4 py-3 text-slate-300">{formatNumber(row.revenue)} €</td>
                <td className="px-4 py-3">
                  <Badge variant={row.delta >= 0 ? 'success' : 'danger'}>
                    {row.delta >= 0 ? '+' : ''}{formatPercent(row.delta)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-400">{row.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
