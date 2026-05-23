import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-800 border border-navy-700/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400">{payload[0].payload.region}</p>
      <p className="text-sm font-semibold text-cyan-400">{payload[0].value.toLocaleString('fr-FR')} ventes</p>
    </div>
  )
}

export default function RegionMap({ data }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Ventes par région</h3>
      <p className="text-xs text-slate-500 mb-4">Comparaison Europe</p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barSize={28}>
          <XAxis dataKey="region" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(80,229,229,0.05)' }} />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={index === 0 ? '#50E5E5' : '#1a4468'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
