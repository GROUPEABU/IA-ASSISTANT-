import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw, Globe, ExternalLink, WifiOff, Info } from 'lucide-react'
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

function SourceList({ snippets }) {
  if (!snippets?.length) return null
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={13} className="text-cyan-400" />
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Sources web consultées</p>
      </div>
      <div className="space-y-1.5">
        {snippets.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-start gap-2 group"
          >
            <span className="text-[10px] font-bold text-slate-600 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 group-hover:text-cyan-400 transition-colors truncate">{s.title}</p>
              <p className="text-[10px] text-slate-600">{s.source}</p>
            </div>
            <ExternalLink size={10} className="text-slate-600 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  )
}

function AnalysisText({ text }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (/^\*\*\d+\./.test(line) || (line.startsWith('**') && line.endsWith('**'))) {
          return (
            <h4 key={i} className="text-sm font-bold text-cyan-400 mt-5 mb-2 first:mt-0">
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
  const [noKey, setNoKey] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setNoKey(false)
    setSnippets([])

    try {
      // Étape 1 : fetch web
      setLoadingStep('Recherche données web (L\'Argus, La Centrale, CCFA…)')
      const webData = await fetchMarketData(product.fullName)

      if (webData.noKey) {
        setNoKey(true)
        setLoadingStep('Analyse avec données d\'entraînement Claude…')
      } else if (webData.snippets?.length) {
        setSnippets(webData.snippets)
        setFetchedAt(webData.fetchedAt)
        setLoadingStep(`${webData.snippets.length} sources trouvées · Analyse IA en cours…`)
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

      {/* Tendances produit */}
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

      {/* Analyse IA avec données web */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Analyse marché temps réel</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {snippets.length > 0
                ? `${snippets.length} sources web · L'Argus, La Centrale, CCFA · analysées par Claude`
                : 'Web + connaissances Claude · VN & VO · Tendances & cotes'}
            </p>
            {fetchedAt && (
              <p className="text-[10px] text-slate-600 mt-0.5">
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
            {loading ? 'Analyse…' : analysis ? 'Actualiser' : 'Analyser le marché'}
          </Button>
        </div>

        {/* No key warning */}
        {noKey && !loading && (
          <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <WifiOff size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Données web non connectées</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Ajoutez <code className="bg-navy-700 px-1 rounded text-cyan-400">BRAVE_SEARCH_API_KEY</code> dans
                vos variables Vercel pour activer la recherche temps réel (gratuit sur{' '}
                <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">
                  brave.com/search/api
                </a>).
                En attendant, l'analyse utilise les connaissances de Claude.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size="md" />
            <p className="text-xs text-slate-400 text-center">{loadingStep}</p>
            <div className="w-48 h-1 bg-navy-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: '60%' }} />
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

        {/* Empty */}
        {!analysis && !loading && !error && (
          <div className="text-center py-10">
            <Globe size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">Analyse marché VN & VO en temps réel</p>
            <p className="text-xs text-slate-600">
              Cotes L'Argus · Prix La Centrale · Immatriculations CCFA · Tendances
            </p>
          </div>
        )}

        {/* Result */}
        {analysis && !loading && <AnalysisText text={analysis} />}
      </div>

      {/* Sources */}
      {snippets.length > 0 && !loading && <SourceList snippets={snippets} />}

      {/* Disclaimer */}
      {analysis && (
        <div className="flex gap-2 p-3 rounded-xl bg-navy-900/40">
          <Info size={12} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Analyse générée automatiquement. Vérifiez les données chiffrées avant utilisation commerciale.
            {snippets.length > 0 ? ` Sources : ${[...new Set(snippets.map(s => s.source))].slice(0, 4).join(', ')}.` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
