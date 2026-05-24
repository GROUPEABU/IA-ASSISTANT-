import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw, Globe, ExternalLink, Info, CheckCircle2 } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { fetchMarketData, buildMarketPrompt } from '@/services/marketSearch'
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

function SourceBadges({ snippets }) {
  if (!snippets?.length) return null
  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {snippets.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400
                     bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full
                     hover:bg-emerald-400/20 transition"
        >
          <CheckCircle2 size={9} />
          {s.source}
          <ExternalLink size={8} />
        </a>
      ))}
    </div>
  )
}

function AnalysisText({ text }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (/^\*\*\d+\./.test(line) || (line.startsWith('**') && line.endsWith('**'))) {
          return (
            <h4 key={i} className="text-sm font-bold text-cyan-400 mt-5 mb-2 first:mt-0 pt-2 border-t border-navy-700/30 first:border-0 first:pt-0">
              {line.replace(/\*\*/g, '')}
            </h4>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <p key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-cyan-400/20 my-1 leading-relaxed">
              {line.slice(2)}
            </p>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export default function MarketAnalysis({ product }) {
  const [analysis, setAnalysis] = useState('')
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setSnippets([])
    setAnalysis('')

    try {
      // Étape 1 : collecte web (Jina AI — gratuit, sans clé)
      setLoadingStep("Lecture L'Argus · La Centrale · Caradisiac · AutoScout24…")
      const webData = await fetchMarketData(product.fullName)

      if (webData.snippets?.length) {
        setSnippets(webData.snippets)
        setFetchedAt(webData.fetchedAt)
        setLoadingStep(`${webData.snippets.length} sources lues · Analyse IA en cours…`)
      } else {
        setLoadingStep('Analyse avec les données de Claude…')
      }

      // Étape 2 : analyse Claude
      const prompt = buildMarketPrompt(product.fullName, webData.snippets || [], product)
      const result = await sendMessage([{ role: 'user', content: prompt }])
      setAnalysis(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats produit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="PDM cible" value={product.marche.part_marche_cible} sub="sur segment" />
        <StatCard
          label="Croissance segment"
          value={product.marche.croissance_segment.split(' ')[0]}
          sub={product.marche.croissance_segment.split(' ').slice(1).join(' ')}
          trend={8.4}
        />
        <StatCard label="Prix de base" value={`${formatNumber(product.prix.base)} €`} sub="hors malus" />
        <StatCard
          label="Avantage prix moy."
          value={`-${formatNumber(Math.round(product.concurrents.reduce((a, c) => a + c.prix, 0) / product.concurrents.length - product.prix.base))} €`}
          sub="vs concurrence"
        />
      </div>

      {/* Opportunités / Risques */}
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

      {/* Analyse principale */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-cyan-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white">Analyse marché temps réel</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              L'Argus · La Centrale · Caradisiac · AutoScout24 → Claude
            </p>
            {snippets.length > 0 && <SourceBadges snippets={snippets} />}
            {fetchedAt && (
              <p className="text-[10px] text-slate-600 mt-1">
                Actualisé le {new Date(fetchedAt).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={analysis ? 'ghost' : 'primary'}
            onClick={generate}
            disabled={loading}
            className="flex-shrink-0"
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
            {loading ? 'En cours…' : analysis ? 'Actualiser' : 'Analyser'}
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size="md" />
            <p className="text-xs text-slate-400 text-center max-w-xs">{loadingStep}</p>
            <div className="w-48 h-1 bg-navy-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!analysis && !loading && !error && (
          <div className="text-center py-10">
            <Globe size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-1 font-medium">Analyse VN & VO en temps réel</p>
            <p className="text-xs text-slate-600 mb-4">
              Lit L'Argus, La Centrale, Caradisiac et AutoScout24<br />
              puis génère une analyse complète avec Claude
            </p>
            <p className="text-[11px] text-cyan-400/60">Gratuit · Sans inscription · Sans carte bancaire</p>
          </div>
        )}

        {/* Analyse */}
        {analysis && !loading && <AnalysisText text={analysis} />}
      </div>

      {/* Disclaimer */}
      {analysis && (
        <div className="flex gap-2 p-3 rounded-xl bg-navy-900/40">
          <Info size={12} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Analyse générée automatiquement à partir de sources publiques. Vérifiez les données chiffrées avant utilisation commerciale.
          </p>
        </div>
      )}
    </div>
  )
}
