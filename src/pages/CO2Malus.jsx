import { ExternalLink } from 'lucide-react'

export default function CO2Malus() {
  return (
    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white">CO₂ & Malus Mondial</h2>
          <p className="text-xs text-slate-500">Calculateur sur 40 pays · Autobuyunion v42</p>
        </div>
        <a
          href="https://co2-malus.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                     px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition"
        >
          <ExternalLink size={13} />
          Ouvrir en plein écran
        </a>
      </div>

      <div className="glass-card flex-1 overflow-hidden">
        <iframe
          src="https://co2-malus.vercel.app"
          title="CO₂ & Malus Mondial"
          className="w-full h-full rounded-xl"
          style={{ border: 'none', minHeight: '500px' }}
          allow="same-origin"
        />
      </div>
    </div>
  )
}
