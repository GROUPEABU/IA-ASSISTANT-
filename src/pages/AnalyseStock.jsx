import { useState, useRef } from 'react'
import { Boxes, Link2, Upload, Search, RefreshCw, RotateCcw, Download } from 'lucide-react'
import { analyzeStock } from '@/services/stockAnalysis'
import { computeStockStats } from '@/utils/stockStats'
import { parseStockFile } from '@/utils/stockCsv'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import { mdToHtml } from '@/utils/mdToHtml'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useExport } from '@/hooks/useExport'
import { useResultFocus } from '@/hooks/useResultFocus'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'

const inputClass = `w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
  text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition`

function StatCard({ label, value }) {
  return (
    <div className="glass-card px-3 py-3 text-center">
      <p className="text-base font-bold text-cyan-400 leading-none">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1 leading-tight">{label}</p>
    </div>
  )
}

export default function AnalyseStock() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const resultRef = useRef(null)
  const fileRef = useRef(null)

  const [mode, setMode] = useState('url') // 'url' | 'csv'
  const [url, setUrl] = useState('')
  const [company, setCompany] = useState('')
  const [fileName, setFileName] = useState('')

  const [phase, setPhase] = useState('idle') // idle | scraping | analyzing | streaming | done
  const [report, setReport] = useState('')
  const [stats, setStats] = useState(null)
  const [dealerName, setDealerName] = useState('')
  const [ignored, setIgnored] = useState(0)
  const [error, setError] = useState(null)

  const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory('analysestock')
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && phase === 'done')

  const busy = phase === 'scraping' || phase === 'analyzing' || phase === 'streaming'

  const runAnalysis = async (dealer, vehicles) => {
    const computed = computeStockStats(vehicles)
    setStats(computed)
    setDealerName(dealer.name || company || '')
    setPhase('analyzing')
    setReport('')

    let first = true
    const text = await analyzeStock(
      { dealer: { ...dealer, name: company || dealer.name }, vehicles, stats: computed },
      {
        lang,
        onChunk: (full) => {
          if (first) { first = false; setPhase('streaming') }
          setReport(full)
        },
      }
    )
    setReport(text)
    setPhase('done')
    const label = `${company || dealer.name || 'Stock'} · ${computed.total} véhicules`
    addHistory({ generatedFor: label, report: text, stats: computed, dealerName: company || dealer.name || '' })
  }

  const analyzeFromUrl = async () => {
    if (!url.trim()) return
    setError(null); setReport(''); setStats(null); setIgnored(0)
    setPhase('scraping')
    try {
      const res = await fetch(`/api/price-watch?stockUrl=${encodeURIComponent(url.trim())}`)
      // Réponse non-JSON (ex. page 404 Vercel si la fonction serveur n'est pas
      // déployée) → message clair, jamais de crash « not valid JSON ».
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        setPhase('idle')
        setError(res.status === 404
          ? "L'analyse par lien n'est pas disponible pour le moment (service serveur indisponible). Utilisez l'import CSV ci-dessus — il fonctionne sans cette fonction."
          : `Récupération impossible (HTTP ${res.status}). Utilisez l'import CSV.`)
        return
      }
      const data = await res.json()
      if (data.error) {
        setPhase('idle')
        setError(data.message || "Récupération impossible. Essayez l'import CSV.")
        return
      }
      if (!company && data.dealer?.name) setCompany(data.dealer.name)
      await runAnalysis(data.dealer || { name: company }, data.vehicles || [])
    } catch (err) {
      setPhase('idle')
      setError(err.message)
      toast(err.message, 'error')
    }
  }

  const analyzeFromFile = async (file) => {
    if (!file) return
    setError(null); setReport(''); setStats(null); setIgnored(0)
    setFileName(file.name)
    setPhase('scraping')
    try {
      const { vehicles, ignored: ign, dealer } = await parseStockFile(file)
      setIgnored(ign)
      if (ign) toast(`${ign} ligne(s) ignorée(s) (données incomplètes).`, 'info')
      await runAnalysis(dealer, vehicles)
    } catch (err) {
      setPhase('idle')
      setError(err.message)
      toast(err.message, 'error')
    }
  }

  const onFilePick = (e) => {
    const file = e.target.files?.[0]
    if (file) analyzeFromFile(file)
    e.target.value = ''
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(dealerName || 'stock', t('tool_stock_title')), { title: t('tool_stock_title'), subtitle: dealerName })
  )

  const reset = () => {
    setReport(''); setStats(null); setDealerName(''); setUrl(''); setCompany(''); setFileName(''); setIgnored(0); setError(null); setPhase('idle')
  }

  const restore = (item) => {
    setReport(item.report || '')
    setStats(item.stats || null)
    setDealerName(item.dealerName || '')
    setPhase('done')
  }

  const retry = () => (mode === 'url' ? analyzeFromUrl() : fileRef.current?.click())

  const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR') + ' €'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Configuration ─────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Boxes size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('tool_stock_title')}</h2>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit mb-4 border border-navy-700/40">
          {[{ id: 'url', label: t('stock_mode_url'), icon: Link2 }, { id: 'csv', label: t('stock_mode_csv'), icon: Upload }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === tab.id ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {mode === 'url' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('stock_url_label')}</label>
              <input
                type="text" value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyzeFromUrl()}
                placeholder="https://pros.lacentrale.fr/C043036" className={inputClass}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('stock_company_label')}</label>
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder={t('stock_company_ph')} className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('stock_csv_label')}</label>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-navy-600/60
                         text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 transition disabled:opacity-40"
            >
              <Upload size={16} /> {fileName || t('stock_csv_hint')}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xlsm,text/csv" onChange={onFilePick} className="hidden" />
            <p className="text-[10px] text-slate-600 mt-1.5">{t('stock_csv_cols')}</p>
          </div>
        )}

        {mode === 'url' && (
          <button
            onClick={analyzeFromUrl}
            disabled={!url.trim() || busy}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy ? <Spinner size="sm" /> : <Search size={14} />}
            {phase === 'scraping' ? t('stock_scraping') : busy ? t('stock_analyzing') : t('stock_analyze_btn')}
          </button>
        )}
      </div>

      {!busy && <ErrorAlert message={error} onRetry={retry} />}

      {/* ── Chargement ────────────────────────────────────────────────────── */}
      {(phase === 'scraping' || (phase === 'analyzing' && !report)) && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{phase === 'scraping' ? t('stock_scraping') : t('stock_analyzing')}</p>
        </div>
      )}

      {/* ── Résultat ──────────────────────────────────────────────────────── */}
      {(report || phase === 'streaming') && (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard label={t('stock_stat_count')} value={stats.total} />
              <StatCard label={t('stock_stat_avg')} value={eur(stats.avgPriceEur)} />
              <StatCard label={t('stock_stat_value')} value={eur(stats.totalValueEur)} />
              <StatCard label={t('stock_stat_ev')} value={stats.evCount} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">
              {dealerName || t('tool_stock_title')}{ignored ? ` · ${ignored} ${t('stock_ignored')}` : ''}
            </p>
            {report && phase === 'done' && (
              <div className="flex items-center gap-2">
                <button onClick={handlePdf} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />} {t('download_pdf')}
                </button>
                <button onClick={retry}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition">
                  <RefreshCw size={11} /> {t('regenerate')}
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30">
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          <div ref={resultRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {phase === 'streaming' && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onRemove={removeHistory} onClear={clearHistory} primary={(item) => item.generatedFor} />
    </div>
  )
}
