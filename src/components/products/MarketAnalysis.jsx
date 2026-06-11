import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw, Globe, Info, Download } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { buildPrompt } from '@/services/veillePrixPrompt'
import { getMarginTarget } from '@/utils/marginTarget'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatNumber } from '@/utils/formatters'
import { mdToHtml } from '@/utils/mdToHtml'
import { useExport } from '@/hooks/useExport'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useSettings } from '@/contexts/SettingsContext'
import { COUNTRIES } from '@/data/marketCountries'

// L'analyse marché de la Fiche IA réutilise la MÊME méthodologie que la Veille
// Prix (prompt partagé, source de vérité unique). Contexte : VO, millésime du
// produit, sans plage de km imposée — le MARCHÉ se choisit via le sélecteur
// (les sources citées dépendent du pays, pas seulement de la France).

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
  const { t, lang } = useSettings()
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [country, setCountry] = useState('FR')
  const { exporting, withExporting } = useExport()

  const ctry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0]

  const generate = async () => {
    setLoading(true)
    setStreaming(false)
    setError(null)
    setAnalysis('')

    try {
      // Même prompt EXACT que la Veille Prix (module partagé verrouillé).
      const filters = {
        type: 'vo', finition: '', carrosserieLabel: '', fuelLabel: '', gearboxLabel: '',
        mileageMin: '', mileageMax: '',
        yearMin: product.year || '', yearMax: product.year || '',
      }
      const prompt = buildPrompt(filters, product.fullName, ctry, getMarginTarget())

      let first = true
      const { text } = await sendMessage([{ role: 'user', content: prompt }], {
        lang, expert: true, temperature: 0, tool: 'veilleprix',
        webSearch: true, maxSearches: 3, maxTokens: 4500,
        returnMeta: true, stream: true,
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setAnalysis(full)
        },
      })
      setAnalysis(text)
      setStreaming(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(analysis, pdfFileName(product.fullName, t('market_realtime_title')), { title: t('market_realtime_title'), subtitle: `${product.fullName} · ${ctry.label}` })
  )

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

      {/* Analyse principale — rapport Veille Prix en direct */}
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-cyan-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white">{t('market_realtime_title')}</h3>
            </div>
            {/* Sources selon le marché sélectionné — pas uniquement les sites FR */}
            <p className="text-xs text-slate-500 mt-0.5">{ctry.sites}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={loading || streaming}
              aria-label={t('price_country_label')}
              className="bg-navy-900/60 border border-navy-700/50 rounded-lg px-2.5 py-2 text-xs
                         text-slate-300 focus:outline-none focus:border-cyan-400/50 transition disabled:opacity-40"
            >
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
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

        {/* Loading avant 1er token — spinner simple (pas de pourcentage) */}
        {loading && !analysis && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Spinner />
            <p className="text-sm text-slate-400">{t('market_loading')}</p>
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

        {/* Analyse (rapport Markdown streamé) */}
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
