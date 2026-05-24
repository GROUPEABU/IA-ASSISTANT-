import { useState } from 'react'
import { Search, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, ExternalLink, Clock, Bell } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'

const SUGGESTIONS = ['Renault Clio 2022', 'Peugeot 208 2023', 'Dacia Duster 2022', 'Volkswagen Golf 2021', 'Toyota Yaris Cross 2023']

async function fetchPrices(vehicle) {
  const res = await fetch(`/api/price-watch?vehicle=${encodeURIComponent(vehicle)}`)
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
  return res.json()
}

async function analyzePrices(vehicle, sourcesData) {
  const context = sourcesData.map(s => `=== ${s.name} ===\n${s.content}`).join('\n\n')
  const prompt = `Tu es expert en cote automobile pour Autobuyunion.

Analyse les prix du marché VO pour : "${vehicle}"

Données brutes collectées :
${context}

Extrais et synthétise en JSON strict (réponds UNIQUEMENT avec ce JSON, sans texte avant/après) :
{
  "prix_min": 0,
  "prix_max": 0,
  "prix_moyen": 0,
  "nb_annonces_estim": 0,
  "tendance": "hausse|baisse|stable",
  "tendance_pct": 0,
  "cote_argus": 0,
  "alerte": "texte court si anomalie de prix sinon null",
  "analyse": "2-3 phrases sur l'état du marché, les prix pratiqués, les opportunités",
  "conseil_achat": "conseil concret pour acheter au meilleur prix",
  "conseil_vente": "conseil concret pour vendre au bon prix"
}`

  const raw = await sendMessage([{ role: 'user', content: prompt }])
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Parsing erreur')
  return JSON.parse(match[0])
}

export default function PriceWatch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [error, setError] = useState(null)
  const [currentVehicle, setCurrentVehicle] = useState('')

  const watch = async (v) => {
    const vehicle = v || query
    if (!vehicle.trim()) return
    setQuery(vehicle)
    setCurrentVehicle(vehicle)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setStep('Collecte des annonces La Centrale · Le Bon Coin · L\'Argus…')
      const raw = await fetchPrices(vehicle)
      setFetchedAt(raw.fetchedAt)

      setStep('Analyse des prix avec Claude…')
      const analysis = await analyzePrices(vehicle, raw.sources || [])
      setResult({ ...analysis, sources: raw.sources })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  const TrendIcon = result?.tendance === 'hausse'
    ? TrendingUp : result?.tendance === 'baisse'
    ? TrendingDown : Minus

  const trendColor = result?.tendance === 'hausse'
    ? 'text-red-400' : result?.tendance === 'baisse'
    ? 'text-emerald-400' : 'text-slate-400'

  const trendLabel = result?.tendance === 'hausse' ? 'Marché en hausse'
    : result?.tendance === 'baisse' ? 'Marché en baisse' : 'Marché stable'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Veille prix concurrence</h2>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && watch()}
              placeholder="Ex: Renault Clio 2022, Peugeot 3008…"
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl
                         pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>
          <button
            onClick={() => watch()}
            disabled={!query.trim() || loading}
            className="px-4 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all
                       disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 flex-shrink-0"
          >
            {loading ? <Spinner size="sm" /> : <Search size={14} />}
            {loading ? '…' : 'Surveiller'}
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => watch(s)}
              className="text-xs text-slate-400 bg-navy-700/50 border border-navy-600/50
                         px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 text-center">{step}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card p-4 flex gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Header résultat */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">{currentVehicle}</h3>
              {fetchedAt && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={10} className="text-slate-600" />
                  <span className="text-[10px] text-slate-600">
                    {new Date(fetchedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => watch(currentVehicle)}
              className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                         px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition">
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>

          {/* Alerte */}
          {result.alerte && (
            <div className="flex gap-2 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300 font-medium">{result.alerte}</p>
            </div>
          )}

          {/* KPIs prix */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Prix moyen marché', value: result.prix_moyen ? `${result.prix_moyen.toLocaleString('fr-FR')} €` : 'N/D', highlight: true },
              { label: 'Cote Argus', value: result.cote_argus ? `${result.cote_argus.toLocaleString('fr-FR')} €` : 'N/D' },
              { label: 'Fourchette', value: result.prix_min && result.prix_max ? `${result.prix_min.toLocaleString('fr-FR')} – ${result.prix_max.toLocaleString('fr-FR')} €` : 'N/D' },
              { label: 'Annonces estimées', value: result.nb_annonces_estim ? `~${result.nb_annonces_estim}` : 'N/D' },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="glass-card p-4 text-center">
                <p className={`text-lg font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Tendance */}
          <div className="glass-card p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                            ${result.tendance === 'hausse' ? 'bg-red-400/10' : result.tendance === 'baisse' ? 'bg-emerald-400/10' : 'bg-slate-700/50'}`}>
              <TrendIcon size={22} className={trendColor} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-base font-bold ${trendColor}`}>{trendLabel}</p>
                {result.tendance_pct !== 0 && (
                  <span className={`text-sm font-semibold ${trendColor}`}>
                    {result.tendance === 'hausse' ? '+' : result.tendance === 'baisse' ? '-' : ''}{Math.abs(result.tendance_pct)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">{result.analyse}</p>
            </div>
          </div>

          {/* Conseils achat / vente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Conseil achat</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_achat}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Conseil vente</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.conseil_vente}</p>
            </div>
          </div>

          {/* Sources */}
          {result.sources?.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Sources consultées</p>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 bg-navy-700/40 border border-navy-600/30
                               px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                    {s.name} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
