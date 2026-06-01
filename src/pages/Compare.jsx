import { useState } from 'react'
import { GitCompare, Plus, X, Trophy, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { getMalus } from '@/utils/malus'
import { formatNumber } from '@/utils/formatters'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { useSettings } from '@/contexts/SettingsContext'

function getBestIndex(row, products) {
  if (!row.rawVal || !row.better) return -1
  const vals = products.map((p) => row.rawVal(p))
  const best = row.better === 'min' ? Math.min(...vals) : Math.max(...vals)
  const idx = vals.indexOf(best)
  return vals.filter((v) => v === best).length === 1 ? idx : -1
}

export default function Compare() {
  const { t, lang } = useSettings()
  const [selected, setSelected] = useState([null, null])
  const [verdict, setVerdict] = useState('')
  const [loadingVerdict, setLoadingVerdict] = useState(false)
  const [error, setError] = useState(null)
  const { generated } = useGeneratedProducts()
  const allProducts = [...PRODUCTS, ...generated]

  const ROWS = [
    { key: 'prix_base', label: t('compare_row_prix_base'), format: (p) => `${formatNumber(p.prix.base)} €`, better: 'min' },
    { key: 'prix_haut', label: t('compare_row_prix_max'), format: (p) => `${formatNumber(p.prix.haut)} €`, better: 'min' },
    { key: 'malus', label: t('compare_row_malus'), format: (p) => { const m = getMalus(p.specs.co2_wltp, p.prix.haut); return m > 0 ? `+${formatNumber(m)} €` : t('compare_malus_exempt') }, rawVal: (p) => getMalus(p.specs.co2_wltp, p.prix.haut), better: 'min' },
    { key: 'budget_total', label: t('compare_row_budget'), format: (p) => `${formatNumber(p.prix.base + getMalus(p.specs.co2_wltp, p.prix.haut))} €`, rawVal: (p) => p.prix.base + getMalus(p.specs.co2_wltp, p.prix.haut), better: 'min' },
    { key: 'co2', label: 'CO₂ WLTP', format: (p) => `${p.specs.co2_wltp} g/km`, rawVal: (p) => p.specs.co2_wltp, better: 'min' },
    { key: 'puissance', label: t('compare_row_power'), format: (p) => p.specs.puissance, rawVal: (p) => parseInt(p.specs.puissance), better: 'max' },
    { key: 'couple', label: t('compare_row_torque'), format: (p) => p.specs.couple, rawVal: (p) => parseInt(p.specs.couple), better: 'max' },
    { key: 'coffre', label: t('compare_row_trunk'), format: (p) => `${p.specs.coffre} L`, rawVal: (p) => p.specs.coffre, better: 'max' },
    { key: 'conso', label: t('compare_row_conso'), format: (p) => p.specs.consommation, rawVal: (p) => parseFloat(p.specs.consommation), better: 'min' },
    { key: 'longueur', label: t('compare_row_length'), format: (p) => `${p.specs.longueur} mm`, rawVal: (p) => p.specs.longueur, better: null },
    { key: 'segment', label: t('compare_row_segment'), format: (p) => p.segment, better: null },
    { key: 'origine', label: t('compare_row_origin'), format: (p) => p.origin, better: null },
  ]

  const reset = () => { setVerdict(''); setSelected([null, null]); setError(null) }

  const addSlot = () => { if (selected.length < 3) setSelected([...selected, null]) }
  const removeSlot = (i) => setSelected(selected.filter((_, idx) => idx !== i))
  const setSlot = (i, id) => {
    const next = [...selected]
    next[i] = id || null
    setSelected(next)
  }

  const activeProducts = selected.map((id) => allProducts.find((p) => p.id === id)).filter(Boolean)
  const canCompare = activeProducts.length >= 2

  const generateVerdict = async () => {
    setLoadingVerdict(true)
    setError(null)
    try {
      const prompt = `Tu es expert automobile pour Autobuyunion. Compare ces ${activeProducts.length} véhicules :

${activeProducts.map((p, i) => `${i + 1}. ${p.fullName}
   - Prix : ${formatNumber(p.prix.base)}€ – ${formatNumber(p.prix.haut)}€
   - CO₂ : ${p.specs.co2_wltp} g/km · Malus : ${getMalus(p.specs.co2_wltp, p.prix.haut) > 0 ? formatNumber(getMalus(p.specs.co2_wltp, p.prix.haut)) + '€' : 'exonéré'}
   - Puissance : ${p.specs.puissance} · Coffre : ${p.specs.coffre}L
   - Segment : ${p.segment}`).join('\n\n')}

Rédige un verdict comparatif expert et chiffré :
**Gagnant global** : lequel recommander et pourquoi (2-3 phrases, avec chiffres)
**Rapport qualité-prix** : positionnement prix VN vs prestations, et coût réel malus inclus
**Valeur résiduelle / VO** : lequel décote le moins à 3 ans (estimation % de la valeur conservée), tension du marché de l'occasion
**BtoB** : meilleur choix pour flottes/entreprises (TCO, fiscalité, récupération TVA)
**BtoC** : meilleur choix pour particuliers (budget, financement, malus, garantie)

Sois direct, argumenté et chiffré.`

      const result = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 3500, expert: true, temperature: 0.3, tool: 'comparateur' })
      setVerdict(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingVerdict(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('compare_title')}</h2>
          <span className="text-xs text-slate-500">{t('compare_subtitle')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {selected.map((id, i) => (
            <div key={i} className="relative">
              <select
                value={id || ''}
                onChange={(e) => setSlot(i, e.target.value)}
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                           text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition pr-8"
              >
                <option value="">{`-- ${t('compare_vehicle_n').replace('{n}', i + 1)} --`}</option>
                {allProducts
                  .filter((p) => !selected.includes(p.id) || p.id === id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
              </select>
              {selected.length > 2 && (
                <button onClick={() => removeSlot(i)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-400 transition">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          {selected.length < 3 && (
            <button onClick={addSlot}
              className="flex items-center justify-center gap-2 border border-dashed border-navy-600/60
                         rounded-xl py-2.5 text-sm text-slate-600 hover:text-cyan-400 hover:border-cyan-400/30 transition">
              <Plus size={14} /> {t('compare_add_third')}
            </button>
          )}
        </div>

        {canCompare && (
          <button
            onClick={generateVerdict}
            disabled={loadingVerdict}
            className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-cyan-400 text-navy-900
                       text-sm font-bold rounded-xl hover:bg-cyan-300 active:scale-95 transition-all
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            {loadingVerdict ? <Spinner size="sm" /> : <Trophy size={14} />}
            {loadingVerdict ? t('compare_analyzing') : t('compare_verdict_btn')}
          </button>
        )}
      </div>

      {/* Tableau comparatif */}
      {canCompare && (
        <div className="glass-card overflow-hidden">
          {/* Headers produits */}
          <div className={`grid border-b border-navy-700/50`}
            style={{ gridTemplateColumns: `180px repeat(${activeProducts.length}, 1fr)` }}>
            <div className="p-3" />
            {activeProducts.map((p) => (
              <div key={p.id} className="p-3 text-center border-l border-navy-700/30">
                <p className="text-xs font-bold text-white">{p.fullName}</p>
                <p className="text-[10px] text-slate-500">{p.year}</p>
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROWS.map((row) => {
            const bestIdx = getBestIndex(row, activeProducts)
            return (
              <div key={row.key}
                className="grid border-b border-navy-700/20 last:border-0 hover:bg-navy-700/10 transition-colors"
                style={{ gridTemplateColumns: `180px repeat(${activeProducts.length}, 1fr)` }}>
                <div className="px-3 py-2.5 flex items-center">
                  <span className="text-xs text-slate-500">{row.label}</span>
                </div>
                {activeProducts.map((p, i) => (
                  <div key={p.id}
                    className={`px-3 py-2.5 text-center border-l border-navy-700/20 flex items-center justify-center gap-1
                                ${bestIdx === i ? 'bg-emerald-400/5' : ''}`}>
                    <span className={`text-xs font-semibold ${bestIdx === i ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {row.format(p)}
                    </span>
                    {bestIdx === i && <Trophy size={10} className="text-emerald-400" />}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Verdict IA */}
      {(verdict || loadingVerdict || error) && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} className="text-warn" />
            <h3 className="text-sm font-semibold text-white">{t('compare_verdict_title')}</h3>
          </div>

          {loadingVerdict && (
            <div className="flex items-center gap-3 py-4">
              <Spinner size="sm" />
              <p className="text-sm text-slate-400">{t('compare_analyzing_progress')}</p>
            </div>
          )}

          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {verdict && !loadingVerdict && (
            <div className="space-y-1">
              {verdict.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h4 key={i} className="text-sm font-bold text-warn mt-4 mb-1 first:mt-0">{line.replace(/\*\*/g, '')}</h4>
                }
                if (line.trim() === '') return <div key={i} className="h-1" />
                return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
              })}
              <div className="flex items-center gap-2 mt-3">
                <button onClick={generateVerdict}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition">
                  <RefreshCw size={11} /> {t('compare_regenerate')}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
                >
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!canCompare && (
        <div className="glass-card p-10 text-center">
          <GitCompare size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('compare_empty_hint1')}</p>
          <p className="text-xs text-slate-600">{t('compare_empty_hint2')}</p>
        </div>
      )}
    </div>
  )
}
