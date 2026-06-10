import { useState, useRef } from 'react'
import { Truck, FileSpreadsheet, Sparkles, RotateCcw, Download, FileText, MapPin, AlertTriangle } from 'lucide-react'
import { extractVehiclesSmart } from '@/services/smartImport'
import { planTrucks, DEST_COUNTRIES } from '@/services/logistics'
import { downloadCsv } from '@/utils/exportCsv'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { pdfFileName } from '@/utils/exportPdf'
import { useExport } from '@/hooks/useExport'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import { useSettings } from '@/contexts/SettingsContext'
import { useToast } from '@/components/ui/Toast'

const inputClass = `w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
  text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition`

const fmtKm = (n) => (n != null ? `${Number(n).toLocaleString('fr-FR')} km` : '—')

export default function Logistics() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const fileRef = useRef(null)
  const { exporting, withExporting } = useExport()

  const [fileName, setFileName] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [smartUsed, setSmartUsed] = useState(false)
  const [parsing, setParsing] = useState(false)

  const [destCountry, setDestCountry] = useState('DE')
  const [capacity, setCapacity] = useState(7)
  const [notes, setNotes] = useState('')

  const [planning, setPlanning] = useState(false)
  const [plan, setPlan] = useState(null) // { trucks, unassignedIdx, summary }
  const [error, setError] = useState(null)

  const onCountry = (code) => {
    setDestCountry(code)
    const c = DEST_COUNTRIES.find((x) => x.code === code)
    if (c) setCapacity(c.capacity)
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParsing(true)
    setError(null)
    setPlan(null)
    try {
      const { vehicles: rows, source } = await extractVehiclesSmart(file, { lang })
      const usable = rows.filter((v) => v.make || v.model)
      if (!usable.length) throw new Error(t('pw_batch_none'))
      setVehicles(usable)
      setFileName(file.name)
      setSmartUsed(source === 'ai')
      if (!usable.some((v) => v.location)) {
        toast(t('lg_no_location_warn'), 'info', 6000)
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setParsing(false)
    }
  }

  const organize = async () => {
    if (!vehicles.length || planning) return
    setPlanning(true)
    setError(null)
    setPlan(null)
    try {
      const result = await planTrucks(vehicles, {
        capacity,
        destCountry: DEST_COUNTRIES.find((c) => c.code === destCountry)?.label || destCountry,
        notes,
      }, { lang })
      setPlan(result)
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setPlanning(false)
    }
  }

  const reset = () => {
    setVehicles([]); setFileName(''); setPlan(null); setError(null); setNotes(''); setSmartUsed(false)
  }

  const vehicleLabel = (v) =>
    [[v.make, v.model, v.version].filter(Boolean).join(' '), v.year].filter(Boolean).join(' · ')

  // ── Exports ────────────────────────────────────────────────────────────────
  const handleExcel = () => {
    if (!plan) return
    const rows = [[t('lg_col_truck'), t('lg_col_pos'), t('lg_col_vehicle'), t('lg_col_year'), t('lg_col_km'), t('lg_col_park'), t('lg_col_route')]]
    for (const truck of plan.trucks) {
      truck.vehicleIdx.forEach((idx, i) => {
        const v = vehicles[idx]
        if (!v) return
        rows.push([
          `${t('lg_truck')} ${truck.id}`, i + 1,
          [v.make, v.model, v.version].filter(Boolean).join(' '),
          v.year ?? '', v.mileageKm ?? '', v.location ?? '',
          i === 0 ? (truck.pickupRoute || []).join(' → ') : '',
        ])
      })
    }
    for (const idx of plan.unassignedIdx) {
      const v = vehicles[idx]
      if (v) rows.push([t('lg_unassigned'), '', [v.make, v.model, v.version].filter(Boolean).join(' '), v.year ?? '', v.mileageKm ?? '', v.location ?? '', ''])
    }
    downloadCsv(`ABU Logistique - ${new Date().toLocaleDateString('fr-FR').replace(/\//g, '.')}.csv`, rows)
  }

  const handlePdf = () => {
    if (!plan) return
    const md = [
      `# ${t('lg_pdf_title')}`,
      `${vehicles.length} ${t('pw_batch_vehicles')} · ${plan.trucks.length} ${t('lg_trucks')} · ${t('lg_capacity_label')} ${capacity} · ${DEST_COUNTRIES.find(c => c.code === destCountry)?.label || destCountry}`,
      '',
      ...plan.trucks.flatMap((truck) => [
        `## ${t('lg_truck')} ${truck.id} — ${truck.vehicleIdx.length} ${t('pw_batch_vehicles')} · ${t('lg_km_avg')} ${fmtKm(truck.kmAvg)}`,
        truck.routeNote ? `*${truck.routeNote}*` : '',
        `**${t('lg_route')} :** ${(truck.pickupRoute || []).join(' → ') || '—'}`,
        truck.loadNote ? `**${t('lg_load')} :** ${truck.loadNote}` : '',
        '',
        ...truck.vehicleIdx.map((idx, i) => {
          const v = vehicles[idx]
          return v ? `${i + 1}. **${vehicleLabel(v)}** — ${fmtKm(v.mileageKm)}${v.location ? ` — ${v.location}` : ''}` : ''
        }),
        '',
      ]),
      plan.unassignedIdx.length
        ? `## ${t('lg_unassigned')}\n${plan.unassignedIdx.map((idx) => vehicles[idx] ? `- ${vehicleLabel(vehicles[idx])}${vehicles[idx].location ? ` — ${vehicles[idx].location}` : ''}` : '').join('\n')}`
        : '',
      plan.summary ? `## ${t('lg_summary')}\n${plan.summary}` : '',
    ].filter(Boolean).join('\n')
    return withExporting(() =>
      exportReportPdf(md, pdfFileName('plan-camions', 'Logistique'), { title: t('lg_pdf_title'), subtitle: `${plan.trucks.length} ${t('lg_trucks')} · ${fileName}` }))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Configuration ───────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('lg_title')}</h2>
        </div>

        {/* Fichier */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing || planning}
          className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-navy-600/60
                     text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 transition disabled:opacity-40 mb-1.5"
        >
          {parsing ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
          {parsing ? t('import_parsing') : (fileName || t('pw_batch_drop'))}
        </button>
        <p className="text-[10px] text-slate-600 mb-4">{t('lg_file_hint')}</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.txt,text/csv" className="hidden" onChange={onFile} />

        {vehicles.length > 0 && (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">
                {t('pw_batch_detected').replace('{n}', vehicles.length)}
              </span>
              {smartUsed && (
                <span className="flex items-center gap-1 text-[10px] text-violet-300 bg-violet-400/10 border border-violet-400/20 px-2 py-1 rounded-full">
                  <Sparkles size={10} /> {t('import_smart_badge')}
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                {vehicles.filter((v) => v.location).length}/{vehicles.length} {t('lg_with_location')}
              </span>
            </div>

            {/* Paramètres */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('lg_dest_label')}</label>
                <select value={destCountry} onChange={(e) => onCountry(e.target.value)} className={inputClass}>
                  {DEST_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('lg_capacity_label')}</label>
                <input
                  type="number" min="4" max="10" value={capacity}
                  onChange={(e) => setCapacity(Math.max(4, Math.min(10, Number(e.target.value) || 7)))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('lg_notes_label')}</label>
                <input
                  type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('lg_notes_ph')} className={inputClass}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mb-4">{t('lg_rules_hint')}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={organize} disabled={planning}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                           hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {planning ? <Spinner size="sm" /> : <Truck size={14} />}
                {planning ? t('lg_organizing') : t('lg_organize_btn')}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
              >
                <RotateCcw size={11} /> {t('new_analysis_btn')}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={organize} />}

      {planning && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('lg_organizing')}</p>
          <p className="text-xs text-slate-600">{t('lg_organizing_sub')}</p>
        </div>
      )}

      {/* ── Plan de chargement ─────────────────────────────────────────────── */}
      {plan && !planning && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">
              {plan.trucks.length} {t('lg_trucks')} · {vehicles.length} {t('pw_batch_vehicles')}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={handleExcel}
                className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                           px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                <FileText size={12} /> Excel
              </button>
              <button onClick={handlePdf} disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                           px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition">
                {exporting ? <Spinner size="sm" /> : <Download size={12} />} {t('download_pdf')}
              </button>
            </div>
          </div>

          {plan.summary && (
            <div className="glass-card p-4">
              <p className="text-xs text-slate-300 leading-relaxed">{plan.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.trucks.map((truck) => (
              <div key={truck.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                      <Truck size={15} className="text-cyan-400" />
                    </div>
                    <p className="text-sm font-bold text-white">{t('lg_truck')} {truck.id}</p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                    {truck.vehicleIdx.length} {t('pw_batch_vehicles')} · {t('lg_km_avg')} {fmtKm(truck.kmAvg)}
                  </span>
                </div>
                {truck.loadNote && <p className="text-[10px] text-slate-500 mb-1">{truck.loadNote}</p>}
                {(truck.pickupRoute || []).length > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-2 flex-wrap">
                    <MapPin size={11} className="text-cyan-400 flex-shrink-0" />
                    {truck.pickupRoute.join(' → ')}
                  </p>
                )}
                {truck.routeNote && <p className="text-[10px] text-slate-600 italic mb-2">{truck.routeNote}</p>}
                <div className="divide-y divide-navy-700/30">
                  {truck.vehicleIdx.map((idx, i) => {
                    const v = vehicles[idx]
                    if (!v) return null
                    return (
                      <div key={idx} className="flex items-center gap-2 py-1.5">
                        <span className="text-[10px] font-bold text-slate-600 w-4 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 truncate">{vehicleLabel(v)}</p>
                          <p className="text-[10px] text-slate-600">
                            {[fmtKm(v.mileageKm), v.location].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {plan.unassignedIdx.length > 0 && (
            <div className="glass-card p-4 border border-warn/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} className="text-warn" />
                <p className="text-xs font-bold text-warn">{t('lg_unassigned')} ({plan.unassignedIdx.length})</p>
              </div>
              {plan.unassignedIdx.map((idx) => vehicles[idx] && (
                <p key={idx} className="text-xs text-slate-400 py-0.5">
                  {vehicleLabel(vehicles[idx])} {vehicles[idx].location ? `— ${vehicles[idx].location}` : ''}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!vehicles.length && !parsing && (
        <div className="glass-card p-10 text-center">
          <Truck size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('lg_empty_title')}</p>
          <p className="text-xs text-slate-600">{t('lg_empty_desc')}</p>
        </div>
      )}
    </div>
  )
}
