import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useSettings } from '@/contexts/SettingsContext'

const CustomTooltip = ({ active, payload, label }) => {
  const { t } = useSettings()
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-800 border border-navy-700/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-cyan-400">
        {`${payload[0].value.toLocaleString()} ${t('sales_chart_vehicles')}`}
      </p>
    </div>
  )
}

export default function SalesChart({ data }) {
  const { t } = useSettings()
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">{t('sales_chart_title')}</h3>
          <p className="text-xs text-slate-500">{t('sales_chart_subtitle')}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#50E5E5" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#50E5E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a4468" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#50E5E5', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#50E5E5"
            strokeWidth={2}
            fill="url(#salesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#50E5E5', stroke: '#0D273C', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
