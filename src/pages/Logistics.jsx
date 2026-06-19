import { useState, useRef, useEffect } from 'react'
import { Truck, FileSpreadsheet, Sparkles, RotateCcw, Download, FileText, MapPin, AlertTriangle, Send, RefreshCw } from 'lucide-react'
import { extractVehiclesSmart } from '@/services/smartImport'
import { askLogisticsChat } from '@/services/logistics'
import { downloadCsv } from '@/utils/exportCsv'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { pdfFileName } from '@/utils/exportPdf'
import { useExport } from '@/hooks/useExport'
import Spinner from '@/components/ui/Spinner'
import { useSettings } from '@/contexts/SettingsContext'
import { useToast } from '@/components/ui/Toast'
import { useToolSession, useToolTasks } from '@/contexts/ToolTasksContext'
import { BTN_SECONDARY, BTN_TERTIARY } from '@/utils/buttonStyles'

const TOOL = 'logistics'
const EMPTY_SESSION = { fileName: '', vehicles: [], smartUsed: false, plan: null, chatMessages: [] }

const fmtKm = (n) => (n != null ? `${Number(n).toLocaleString('fr-FR')} km` : '—')

function stripJsonBlock(text) {
  return text.replace(/```json[\s\S]*?```/g, '').trim()
}

function hasPlanJson(text) {
  return /```json/.test(text) && /"trucks"/.test(text)
}

function extractPlan(text) {
  if (!hasPlanJson(text)) return null
  const m = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!m) return null
  try {
    const p = JSON.parse(m[1])
    if (Array.isArray(p.trucks) && p.trucks.length > 0) {
      return { trucks: p.trucks, unassignedIdx: p.unassignedIdx || [], summary: p.summary || '' }
    }
  } catch { /* malformed JSON — ignore */ }
  return null
}

export default function Logistics() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const fileRef = useRef(null)
  const { exporting, withExporting } = useExport()

  // État métier persistant (survit à la navigation interne) ────────────────────
  const [session, setSession] = useToolSession(TOOL)
  const s = session ?? EMPTY_SESSION
  const { fileName, vehicles, smartUsed, plan, chatMessages } = s

  // Statut de la tâche de fond (pour l'indicateur de navigation + le spinner)
  const { tasks, startTask, finishTask, clearTask } = useToolTasks()
  const running = tasks[TOOL]?.status === 'running'

  // États éphémères, propres à la vue (pas besoin de survivre à la navigation)
  const [parsing, setParsing] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  // Tant que la page est ouverte, l'indicateur du menu n'a pas lieu d'être :
  // dès qu'une tâche est terminée (ou en erreur) et qu'on est sur l'outil, on
  // l'efface. Si on était ailleurs à la fin, l'indicateur a persisté pour nous
  // prévenir, puis se nettoie au retour (au montage de cette page).
  useEffect(() => {
    const status = tasks[TOOL]?.status
    if (status === 'done' || status === 'error') clearTask(TOOL)
  }, [tasks, clearTask])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParsing(true)
    try {
      const { vehicles: rows, source } = await extractVehiclesSmart(file, { lang })
      const usable = rows.filter((v) => v.make || v.model)
      if (!usable.length) throw new Error(t('pw_batch_none'))
      setSession({ fileName: file.name, vehicles: usable, smartUsed: source === 'ai', plan: null, chatMessages: [] })
      clearTask(TOOL)
      if (!usable.some((v) => v.location)) {
        toast(t('lg_no_location_warn'), 'info', 6000)
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setParsing(false)
    }
  }

  const reset = () => {
    setSession(EMPTY_SESSION)
    clearTask(TOOL)
  }

  // ── Chat send ───────────────────────────────────────────────────────────────
  // Le flux écrit dans la SESSION du provider (toujours montée), pas dans l'état
  // local : la réponse continue d'arriver et le plan se met à jour même si on a
  // quitté la page entre-temps.
  const sendChat = async (text) => {
    const msg = (text || chatInput).trim()
    if (!msg || running) return

    const base = s
    const userMsg = { role: 'user', content: msg }
    const historyForAPI = [...base.chatMessages, userMsg]
    const vehiclesSnapshot = base.vehicles

    setSession((prev) => {
      const b = prev ?? EMPTY_SESSION
      return { ...b, chatMessages: [...b.chatMessages, userMsg, { role: 'assistant', content: '', streaming: true }] }
    })
    setChatInput('')
    startTask(TOOL, t('lg_chat_title'))

    let accum = ''
    try {
      // onChunk reçoit le TEXTE COMPLET accumulé (pas un delta).
      await askLogisticsChat(historyForAPI, vehiclesSnapshot, {
        lang,
        onChunk: (fullText) => {
          accum = fullText
          setSession((prev) => {
            const b = prev ?? EMPTY_SESSION
            const msgs = [...b.chatMessages]
            msgs[msgs.length - 1] = { role: 'assistant', content: accum, streaming: true }
            return { ...b, chatMessages: msgs }
          })
        },
      })

      const nextPlan = extractPlan(accum)
      setSession((prev) => {
        const b = prev ?? EMPTY_SESSION
        const msgs = [...b.chatMessages]
        msgs[msgs.length - 1] = { role: 'assistant', content: accum }
        return { ...b, chatMessages: msgs, plan: nextPlan ?? b.plan }
      })
      finishTask(TOOL, 'done')
      if (nextPlan) toast(t('lg_chat_plan_updated'), 'success')
    } catch (err) {
      setSession((prev) => {
        const b = prev ?? EMPTY_SESSION
        const msgs = [...b.chatMessages]
        msgs[msgs.length - 1] = { role: 'assistant', content: err.message, error: true }
        return { ...b, chatMessages: msgs }
      })
      finishTask(TOOL, 'error')
    }
  }

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
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
      `${vehicles.length} ${t('pw_batch_vehicles')} · ${plan.trucks.length} ${t('lg_trucks')}`,
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
      {/* ── Import + pavé d'instructions ─────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('lg_title')}</h2>
        </div>

        {/* Fichier */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing || running}
          className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-navy-600/60
                     text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 transition disabled:opacity-40 mb-1.5"
        >
          {parsing ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
          {parsing ? t('import_parsing') : (fileName || t('pw_batch_drop'))}
        </button>
        <p className="text-[10px] text-slate-600 mb-4">{t('lg_file_hint')}</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.txt,text/csv" className="hidden" onChange={onFile} />

        {vehicles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
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
            <button
              onClick={reset}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition px-2 py-1 rounded-lg hover:bg-navy-700/30"
            >
              <RotateCcw size={10} /> {t('new_analysis_btn')}
            </button>
          </div>
        )}

        {/* Légende du pavé */}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('lg_chat_label')}</p>

        {/* ── PAVÉ D'INSTRUCTIONS (chat) — directement sous le fichier ───────── */}
        <div className="rounded-xl border border-navy-700/40 bg-navy-900/30 overflow-hidden">
          {/* Messages */}
          {chatMessages.length > 0 && (
            <div className="px-3 py-3 space-y-2 max-h-72 overflow-y-auto border-b border-navy-700/30">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-400/15 border border-cyan-400/20 text-slate-200 rounded-br-sm'
                        : msg.error
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-sm'
                          : 'bg-navy-800/60 border border-navy-700/40 text-slate-300 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <span className="whitespace-pre-wrap">{stripJsonBlock(msg.content) || (msg.streaming ? '' : '…')}</span>
                        {hasPlanJson(msg.content) && !msg.streaming && (
                          <span className="flex items-center gap-1 text-[10px] text-cyan-400 mt-1.5 font-medium">
                            <RefreshCw size={9} /> {t('lg_chat_plan_updated')}
                          </span>
                        )}
                        {msg.streaming && (
                          <span className="inline-block w-1.5 h-3 bg-cyan-400/70 rounded-sm ml-0.5 animate-pulse" />
                        )}
                      </>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Saisie */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat() }}
            className="flex items-end gap-2 p-3"
          >
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder={vehicles.length ? t('lg_chat_ph') : t('lg_chat_ph_nofile')}
              rows={1}
              disabled={running}
              className="flex-1 bg-navy-800/60 border border-navy-700/50 rounded-xl px-3
                         text-xs text-slate-200 placeholder-slate-600 resize-none
                         focus:outline-none focus:border-cyan-400/50 transition
                         disabled:opacity-50"
              style={{ height: '40px', paddingTop: '11px', paddingBottom: '11px', lineHeight: '18px', overflowY: 'hidden' }}
            />
            <button
              type="submit"
              disabled={running || !chatInput.trim()}
              className="w-10 h-10 rounded-xl bg-cyan-400 text-navy-900 flex items-center justify-center
                         hover:bg-cyan-300 active:scale-95 transition-all
                         disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
            >
              {running ? <Spinner size="sm" /> : <Send size={15} />}
            </button>
          </form>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">{t('lg_rules_hint')}</p>
      </div>

      {/* ── Plan de chargement ─────────────────────────────────────────────── */}
      {plan && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">
              {plan.trucks.length} {t('lg_trucks')} · {vehicles.length} {t('pw_batch_vehicles')}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={handleExcel} className={BTN_TERTIARY}>
                <FileText size={12} /> Excel
              </button>
              <button onClick={handlePdf} disabled={exporting} className={BTN_SECONDARY}>
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
    </div>
  )
}
