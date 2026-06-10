import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Link2, Upload, Search, RefreshCw, RotateCcw, Download, Copy, Bell, ChevronDown, FileText } from 'lucide-react'
import { analyzeStock, scrapeStockWithSearch } from '@/services/stockAnalysis'
import { computeStockStats } from '@/utils/stockStats'
import { extractVehiclesSmart, toStockVehicles } from '@/services/smartImport'
import { sendToTool, takeBridgePayload } from '@/utils/toolBridge'
import { copyReportText } from '@/utils/mdToPlainText'
import { downloadCsv } from '@/utils/exportCsv'
import { MILEAGE_MIN_VALUES, MILEAGE_MAX_VALUES } from '@/data/vehicleFilters'
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

// Mappe un véhicule du stock vers les filtres de la Veille Prix (codes identiques).
const FUEL_CODE = [
  [/rechargeable|phev|plug/i, 'GH'],
  [/hybride|hybrid/i, 'HY'],
  [/électrique|electrique|electric/i, 'EL'],
  [/diesel/i, 'GO'],
  [/gpl|lpg/i, 'GP'],
  [/essence|petrol|gasoline/i, 'ES'],
]
function vehicleToPwFilters(v) {
  const km = Number(v.mileageKm) || 0
  const fuel = (FUEL_CODE.find(([re]) => re.test(v.fuel || '')) || [])[1] || ''
  const gearbox = /auto/i.test(v.gearbox || '') ? 'A' : /manuelle|manual/i.test(v.gearbox || '') ? 'M' : ''
  return {
    type: 'vo',
    make: String(v.make || '').trim(),
    model: String(v.model || '').trim(),
    finition: String(v.version || '').trim(),
    carrosserie: '',
    yearMin: v.year ? String(v.year) : '',
    yearMax: v.year ? String(v.year) : '',
    mileageMin: String([...MILEAGE_MIN_VALUES].reverse().find((x) => x <= km) || ''),
    mileageMax: String(MILEAGE_MAX_VALUES.find((x) => x >= km) || ''),
    fuel, gearbox, powerMin: '', powerMax: '', country: 'FR',
  }
}

// Liste repliable des véhicules extraits — chaque ligne peut partir en Veille Prix.
function VehiclesList({ vehicles, t, onPriceWatch }) {
  const [open, setOpen] = useState(false)
  if (!vehicles?.length) return null
  const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR') + ' €'
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cyan-400/5 transition"
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t('stock_vehicles_title')} ({vehicles.length})
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="max-h-80 overflow-y-auto divide-y divide-navy-700/30">
          {vehicles.map((v, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-navy-900/40 transition">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">
                  {v.make} {v.model}{v.version ? ` ${v.version}` : ''}
                </p>
                <p className="text-[10px] text-slate-600">
                  {[v.year, v.mileageKm != null ? `${Number(v.mileageKm).toLocaleString('fr-FR')} km` : null, v.fuel].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-xs font-bold text-cyan-400 flex-shrink-0">{eur(v.priceEur)}</span>
              <button
                onClick={() => onPriceWatch(v)}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-navy-600/50
                           px-2 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition flex-shrink-0"
              >
                <Bell size={10} /> {t('stock_pw_btn')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyseStock() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const navigate = useNavigate()
  const resultRef = useRef(null)
  const fileRef = useRef(null)

  const [mode, setMode] = useState('url') // 'url' | 'csv'
  const [url, setUrl] = useState('')
  const [company, setCompany] = useState('')
  const [fileName, setFileName] = useState('')

  const [phase, setPhase] = useState('idle') // idle | scraping | analyzing | streaming | done
  const [report, setReport] = useState('')
  const [scrapeLog, setScrapeLog] = useState('')
  const [stats, setStats] = useState(null)
  const [vehiclesList, setVehiclesList] = useState([])
  const [dealerName, setDealerName] = useState('')
  const [ignored, setIgnored] = useState(0)
  const [error, setError] = useState(null)

  const { history, add: addHistory, remove: removeHistory, clear: clearHistory, togglePin } = useHistory('analysestock')
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && phase === 'done')

  const busy = phase === 'scraping' || phase === 'analyzing' || phase === 'streaming'

  const runAnalysis = async (dealer, vehicles) => {
    const computed = computeStockStats(vehicles)
    setStats(computed)
    setVehiclesList(vehicles)
    setDealerName(dealer.name || company || '')
    setPhase('analyzing')
    setReport('')
    setScrapeLog('')

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
    addHistory({ generatedFor: label, report: text, stats: computed, dealerName: company || dealer.name || '', vehicles: vehicles.slice(0, 100) })
  }

  const analyzeFromUrl = async () => {
    if (!url.trim()) return
    setError(null); setReport(''); setStats(null); setIgnored(0); setScrapeLog('')
    setPhase('scraping')
    try {
      const { vehicles, dealer } = await scrapeStockWithSearch(url.trim(), {
        lang,
        onChunk: (raw) => {
          // Show narration before the JSON array — hide raw data extraction
          const cut = raw.search(/\n\[/)
          const narration = (cut >= 0 ? raw.slice(0, cut) : raw)
            .replace(/^DEALER:.*$/m, '').trim()
          if (narration) setScrapeLog(narration)
        },
      })
      if (!company && dealer?.name) setCompany(dealer.name)
      await runAnalysis(dealer || { name: company }, vehicles)
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
      // Lecture adaptative : colonnes reconnues d'abord, sinon extraction IA
      // (le fichier n'a pas besoin de suivre un format imposé).
      const { vehicles: rawVehicles, ignored: ign0, dealer, source } = await extractVehiclesSmart(file, { lang })
      const { vehicles, ignored: ign1 } = source === 'ai' ? toStockVehicles(rawVehicles) : { vehicles: rawVehicles, ignored: 0 }
      const ign = ign0 + ign1
      if (!vehicles.length) throw new Error(t('pw_batch_none'))
      setIgnored(ign)
      if (source === 'ai') toast(t('import_smart_badge'), 'info')
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

  const handleExcel = () => {
    if (!vehiclesList.length) return
    const rows = [[
      t('make_label'), t('model_label'), t('price_finition_label'), t('veh_year_label'),
      'Km', t('fuel_label'), t('gearbox_label'), 'Prix TTC (€)',
    ]]
    for (const v of vehiclesList) {
      rows.push([v.make ?? '', v.model ?? '', v.version ?? '', v.year ?? '', v.mileageKm ?? '', v.fuel ?? '', v.gearbox ?? '', v.priceEur ?? ''])
    }
    downloadCsv(`ABU Stock ${dealerName || ''} - ${new Date().toLocaleDateString('fr-FR').replace(/\//g, '.')}.csv`.replace(/\s+/g, ' '), rows)
  }

  const reset = () => {
    setReport(''); setStats(null); setVehiclesList([]); setDealerName(''); setUrl(''); setCompany(''); setFileName(''); setIgnored(0); setError(null); setPhase('idle'); setScrapeLog('')
  }

  const restore = (item) => {
    setReport(item.report || '')
    setStats(item.stats || null)
    setVehiclesList(item.vehicles || [])
    setDealerName(item.dealerName || '')
    setPhase('done')
  }

  // Hub « Reprendre » → restaure l'analyse archivée correspondante.
  useEffect(() => {
    const p = takeBridgePayload('/stock-analysis')
    if (p?.restoreId != null) {
      const item = history.find((h) => (h.id ?? h.savedAt) === p.restoreId)
      if (item) restore(item)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    await copyReportText(report)
    toast(t('copy_done'), 'success')
  }

  // Pont sortant : un véhicule du stock → Veille Prix pré-remplie et lancée.
  const toPriceWatch = (v) => sendToTool(navigate, '/price-watch', { filters: vehicleToPwFilters(v) })

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
                placeholder={t('stock_url_ph')} className={inputClass}
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
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <Spinner />
            <p className="text-sm text-slate-400">{phase === 'scraping' ? t('stock_scraping') : t('stock_analyzing')}</p>
          </div>
          {phase === 'scraping' && scrapeLog && (
            <div className="w-full mt-1 rounded-xl bg-navy-900/60 border border-navy-700/40 px-4 py-3 font-mono text-[11px] text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {scrapeLog}
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-60 bg-cyan-400" />
            </div>
          )}
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
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                  <Copy size={12} /> {t('copy_btn')}
                </button>
                <button onClick={handlePdf} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />} {t('download_pdf')}
                </button>
                {vehiclesList.length > 0 && (
                  <button onClick={handleExcel}
                    className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                    <FileText size={12} /> Excel
                  </button>
                )}
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

          {phase === 'done' && (
            <VehiclesList vehicles={vehiclesList} t={t} onPriceWatch={toPriceWatch} />
          )}
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onRemove={removeHistory} onClear={clearHistory} onTogglePin={togglePin} primary={(item) => item.generatedFor} />
    </div>
  )
}
