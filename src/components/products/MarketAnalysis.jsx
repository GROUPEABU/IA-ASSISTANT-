import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatNumber } from '@/utils/formatters'

function StatCard({ label, value, sub, trend }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend >= 0
            ? <TrendingUp size={12} className="text-emerald-400" />
            : <TrendingDown size={12} className="text-red-400" />}
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
  )
}

export default function MarketAnalysis({ product }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const prompt = `Tu es expert en analyse de marché automobile européen pour Autobuyunion.
Génère une analyse de marché complète et structurée pour le ${product.fullName} (${product.year}).

Données produit :
- Segment : ${product.segment}
- Origine : ${product.origin}
- Prix : ${formatNumber(product.prix.base)}€ - ${formatNumber(product.prix.haut)}€
- CO₂ : ${product.specs.co2_wltp} g/km
- Motorisation : ${product.specs.motorisation}
- Principaux concurrents : ${product.concurrents.map(c => `${c.nom} (${formatNumber(c.prix)}€)`).join(', ')}

Contexte marché :
- ${product.marche.tendance}
- ${product.marche.risques}
- ${product.marche.opportunites}

Rédige une analyse structurée en 4 parties :
1. **Positionnement & opportunités marché**
2. **Analyse concurrentielle détaillée**
3. **Stratégie recommandée BtoB / BtoC**
4. **Risques & points de vigilance**

Sois précis, chiffré et actionnable pour les équipes commerciales d'Autobuyunion.`

      const result = await sendMessage([{ role: 'user', content: prompt }])
      setAnalysis(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats marché */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="PDM cible" value={product.marche.part_marche_cible} sub="sur segment" />
        <StatCard label="Croissance segment" value={product.marche.croissance_segment.split(' ')[0]} sub={product.marche.croissance_segment.split(' ').slice(1).join(' ')} trend={8.4} />
        <StatCard label="Prix de base" value={`${formatNumber(product.prix.base)} €`} sub="hors malus" />
        <StatCard label="Avantage prix" value={`-${formatNumber(Math.round(product.concurrents.reduce((a, c) => a + c.prix, 0) / product.concurrents.length - product.prix.base))} €`} sub="vs concurrence moy." />
      </div>

      {/* Tendances & risques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={15} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Opportunités</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{product.marche.opportunites}</p>
          <p className="text-xs text-slate-500 mt-2 italic">{product.marche.tendance}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-400" />
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Risques</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{product.marche.risques}</p>
        </div>
      </div>

      {/* Analyse IA */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Analyse approfondie IA</h3>
            <p className="text-xs text-slate-500">Générée par Claude · Autobuyunion Intelligence</p>
          </div>
          <Button size="sm" variant={analysis ? 'ghost' : 'primary'} onClick={generateAnalysis} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
            {analysis ? 'Actualiser' : 'Générer'}
          </Button>
        </div>

        {!analysis && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Cliquez sur "Générer" pour obtenir une analyse<br />approfondie du marché pour ce véhicule.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size="md" />
            <p className="text-xs text-slate-500">Analyse en cours avec Claude...</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="prose prose-invert prose-sm max-w-none">
            {analysis.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <h4 key={i} className="text-sm font-bold text-cyan-400 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>
              }
              if (line.startsWith('- ') || line.startsWith('• ')) {
                return <p key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-navy-700 my-1">{line.slice(2)}</p>
              }
              if (line.trim() === '') return <br key={i} />
              return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
