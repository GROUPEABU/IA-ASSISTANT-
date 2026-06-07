import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw, Globe, ExternalLink, Info, CheckCircle2, Download } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { fetchMarketData, buildMarketPrompt, STATIC_MARKET } from '@/services/marketSearch'
import { veillePrixRefBlock } from '@/utils/veillePrix'
import Spinner from '@/components/ui/Spinner'
import AIProgress from '@/components/ui/AIProgress'
import Button from '@/components/ui/Button'
import { formatNumber } from '@/utils/formatters'
import { mdToHtml } from '@/utils/mdToHtml'
import { useExport } from '@/hooks/useExport'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useSettings } from '@/contexts/SettingsContext'

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

export default function MarketAnalysis({ product }) {
  const { t, lang } = useSettings()
  const [analysis, setAnalysis] = useState('')
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const { exporting, withExporting } = useExport()

  const generate = async () => {
    setLoading(true)
    setStreaming(false)
    setError(null)
    setSnippets([])
    setAnalysis('')

    try {
      // Étape 1 : collecte web (Jina AI — gratuit, sans clé)
      setLoadingStep(t('market_step_reading'))
      const webData = await fetchMarketData(product.fullName)

      if (webData.snippets?.length) {
        setSnippets(webData.snippets)
        setFetchedAt(webData.fetchedAt)
        setLoadingStep(t('market_step_analyzing').replace('{n}', webData.snippets.length))
      } else {
        setLoadingStep(t('market_step_ai'))
      }

      // Étape 2 : analyse IA
      const prompt = buildMarketPrompt(product.fullName, webData.snippets || [], product, lang) + veillePrixRefBlock(product.fullName)
      let first = true
      const result = await sendMessage([{ role: 'user', content: prompt }], {
        lang, maxTokens: 4500, expert: true, temperature: 0.35,
        tool: 'analysemarche', webSearch: true, maxSearches: 4,
        systemStatic: STATIC_MARKET,
        stream: true,
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setAnalysis(full)
        },
      })
      setAnalysis(result)
      setStreaming(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setStreaming(false)
      setLoadingStep('')
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(analysis, pdfFileName(product.fullName, t('market_realtime_title')), { title: t('market_realtime_title'), subtitle: product.fullName })
  )

  const localeDateString = (ts) => {
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-ES' : 'en-GB'
    return new Date(ts).toLocaleString(locale)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats produit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t('market_pdm_label')} value={product.marche.part_marche_cible} sub={t('market_on_segment')} />
        <StatCard
          label={t('market_segment_growth')}
          value={product.marche.croissance_segment.split(' ')[0]}
          sub={product.marche.croissance_segment.split(' ').slice(1).join(' ')}
          trend={8.4}
        />
        <StatCard label={t('market_base_price_label')} value={`${formatNumber(product.prix.base)} €`} sub={t('market_excl_malus')} />
        <StatCard
          label={t('market_price_advantage')}
          value={`-${formatNumber(Math.round(product.concurrents.reduce((a, c) => a + c.prix, 0) / product.concurrents.length - product.prix.base))} €`}
          sub={t('market_vs_competition')}
        />
      </div>

      {/* Opportunités / Risques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={15} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t('market_opportunities')}</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{product.marche.opportunites}</p>
          <p className="text-xs text-slate-500 mt-2 italic">{product.marche.tendance}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-warn" />
            <h3 className="text-xs font-bold text-warn uppercase tracking-wider">{t('market_risks')}</h3>
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
              <h3 className="text-sm font-semibold text-white">{t('market_realtime_title')}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('market_sources_label')}
            </p>
            {snippets.length > 0 && <SourceBadges snippets={snippets} />}
            {fetchedAt && (
              <p className="text-[10px] text-slate-600 mt-1">
                {`${t('market_updated_at')} ${localeDateString(fetchedAt)}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {analysis && !streaming && (
              <Button size="sm" variant="ghost" onClick={handlePdf} disabled={exporting}>
                {exporting ? <Spinner size="sm" /> : <Download size={13} />}
                {t('download_pdf')}
              </Button>
            )}
            <Button
              size="sm"
              variant={analysis ? 'ghost' : 'primary'}
              onClick={generate}
              disabled={loading || streaming}
            >
              {(loading || streaming) ? <Spinner size="sm" /> : <RefreshCw size={13} />}
              {(loading || streaming) ? t('market_loading') : analysis ? t('market_refresh') : t('market_analyze')}
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && !analysis && (
          <div className="py-8">
            <AIProgress active={loading} label={loadingStep} estimatedMs={30000} persistKey="marketanalysis" />
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
        {!analysis && !loading && !streaming && !error && (
          <div className="text-center py-10">
            <Globe size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-1 font-medium">{t('market_empty_title')}</p>
            <p className="text-xs text-slate-600">
              {t('market_empty_desc_1')}<br />
              {t('market_empty_desc_2')}
            </p>
          </div>
        )}

        {/* Analyse */}
        {analysis && (
          <div>
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(analysis) }} />
            {streaming && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {analysis && (
        <div className="flex gap-2 p-3 rounded-xl bg-navy-900/40">
          <Info size={12} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-relaxed">
            {t('market_disclaimer')}
          </p>
        </div>
      )}
    </div>
  )
}
