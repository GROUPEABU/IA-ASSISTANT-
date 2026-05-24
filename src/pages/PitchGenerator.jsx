import { useState } from 'react'
import { Mic, Copy, Check, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'

const PROFILES = [
  { id: 'btoc_famille', label: 'Particulier — Famille', icon: '👨‍👩‍👧', segment: 'btoc' },
  { id: 'btoc_rouleur', label: 'Particulier — Gros rouleur', icon: '🚗', segment: 'btoc' },
  { id: 'btob_pme', label: 'PME / Artisan', icon: '🔧', segment: 'btob' },
  { id: 'btob_flotte', label: 'Grande Flotte', icon: '🏢', segment: 'btob' },
  { id: 'btob_cadre', label: 'Cadre Dirigeant', icon: '💼', segment: 'btob' },
]

export default function PitchGenerator() {
  const [vehicleId, setVehicleId] = useState('')
  const [customVehicle, setCustomVehicle] = useState('')
  const [profileId, setProfileId] = useState('btoc_famille')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [pitch, setPitch] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [generatedFor, setGeneratedFor] = useState('')

  const { generated } = useGeneratedProducts()
  const allProducts = [...PRODUCTS, ...generated]

  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || customVehicle
  const profile = PROFILES.find((p) => p.id === profileId)

  const generate = async () => {
    if (!vehicleName.trim()) return
    setLoading(true)
    setError(null)
    setPitch(null)

    try {
      const productContext = selectedProduct
        ? `
DONNÉES PRODUIT :
- Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€
- Segment : ${selectedProduct.segment}
- Motorisation : ${selectedProduct.specs.motorisation}
- Consommation WLTP : ${selectedProduct.specs.consommation}
- CO₂ : ${selectedProduct.specs.co2_wltp} g/km
- Autonomie : ${selectedProduct.specs.autonomie_wltp} km
- Garantie : ${selectedProduct.garantie.vehicule}
- Atouts ${profile.segment === 'btob' ? 'BtoB' : 'BtoC'} : ${selectedProduct[profile.segment].atouts.join(' | ')}
- Argument prix : ${selectedProduct[profile.segment].argument_prix || selectedProduct.btoc.argument_prix || ''}
- Objections courantes : ${selectedProduct[profile.segment].objections.join(' | ')}`
        : ''

      const prompt = `Tu es un expert commercial automobile pour Autobuyunion.

Génère un pitch de vente structuré et percutant pour le ${vehicleName}, destiné à : ${profile.label}.
${context ? `\nContexte client : ${context}` : ''}
${productContext}

Réponds UNIQUEMENT en JSON valide :
{
  "accroche": "2-3 phrases d'accroche percutantes, adaptées au profil, avec chiffres si possible",
  "arguments": [
    "Argument 1 concret avec données chiffrées",
    "Argument 2 concret avec données chiffrées",
    "Argument 3 concret avec données chiffrées"
  ],
  "objections": [
    {"question": "Objection probable du client", "reponse": "Réponse commerciale en 2-3 phrases avec argument concret"},
    {"question": "Deuxième objection probable", "reponse": "Réponse commerciale en 2-3 phrases avec argument concret"}
  ],
  "closing": "Phrase de closing engageante avec appel à l'action"
}`

      const raw = await sendMessage([{ role: 'user', content: prompt }])
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Parsing erreur — réessayez')
      const data = JSON.parse(match[0])
      setPitch(data)
      setGeneratedFor(`${vehicleName} · ${profile.label}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySection = (text) => {
    navigator.clipboard.writeText(text)
  }

  const copyAll = () => {
    if (!pitch) return
    const text = [
      '🎯 ACCROCHE\n' + pitch.accroche,
      '\n💡 ARGUMENTS CLÉS\n' + pitch.arguments.map((a, i) => `${i + 1}. ${a}`).join('\n'),
      '\n🛡️ OBJECTIONS\n' + pitch.objections.map((o) => `Q: ${o.question}\nR: ${o.reponse}`).join('\n\n'),
      '\n🤝 CLOSING\n' + pitch.closing,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Section 1 — Config ── */}
      <div className="glass-card p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Mic size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Générateur de pitch</h2>
        </div>

        {/* Vehicle — free text input */}
        <div className="mb-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Véhicule
          </label>
          <input
            type="text"
            value={customVehicle}
            onChange={(e) => {
              setCustomVehicle(e.target.value)
              setVehicleId('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="Ex: Peugeot 308 2023, BMW X1, JAECOO J5 HEV…"
            className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-3
                       text-sm text-white placeholder-slate-600
                       focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
          />
        </div>

        {/* Catalog shortcuts */}
        {allProducts.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Raccourcis catalogue
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setVehicleId(p.id)
                    setCustomVehicle(p.fullName)
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition truncate text-left ${
                    vehicleId === p.id
                      ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/40'
                      : 'text-slate-400 border-navy-600/50 hover:text-cyan-400 hover:border-cyan-400/30'
                  }`}
                >
                  {p.fullName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile selector */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Profil client
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => setProfileId(p.id)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                  profileId === p.id
                    ? 'bg-cyan-400/10 border-cyan-400/40 text-cyan-300'
                    : 'border-navy-600/50 text-slate-400 hover:border-cyan-400/20 hover:text-slate-300'
                }`}
              >
                <span className="text-base mr-2">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional context */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Contexte client <span className="text-slate-600 normal-case font-normal">(optionnel)</span>
          </label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Budget évoqué, véhicule actuel, objection soulevée…"
            className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-white placeholder-slate-600 resize-none
                       focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
          />
        </div>

        {/* Generate button */}
        <div className="flex justify-start">
          <button
            onClick={generate}
            disabled={!vehicleName.trim() || loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5
                       bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Spinner size="sm" /> : <Mic size={14} />}
            {loading ? 'Génération…' : 'Générer le pitch'}
          </button>
        </div>
      </div>

      {/* ── Section 2 — Loading ── */}
      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">Génération du pitch commercial…</p>
        </div>
      )}

      {/* ── Section 3 — Error ── */}
      {error && !loading && (
        <div className="glass-card p-4 flex gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Section 4 — Results ── */}
      {pitch !== null && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{generatedFor}</p>
              <p className="text-xs text-slate-500">Pitch prêt · 4 sections</p>
            </div>
            <button
              onClick={generate}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition"
            >
              <RefreshCw size={11} /> Régénérer
            </button>
          </div>

          {/* 🎯 Accroche */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base leading-none">🎯</span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Accroche</span>
              </div>
              <button
                onClick={() => copySection(pitch.accroche)}
                title="Copier l'accroche"
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition"
              >
                <Copy size={12} />
              </button>
            </div>
            <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-4">
              <p className="text-sm text-slate-200 leading-relaxed">{pitch.accroche}</p>
            </div>
          </div>

          {/* 💡 Arguments clés */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-400 text-base leading-none">💡</span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Arguments clés</span>
            </div>
            <div className="space-y-2">
              {pitch.arguments.map((arg, i) => (
                <div
                  key={i}
                  className="border-l-2 border-cyan-400 pl-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-cyan-400 flex-shrink-0 mt-0.5 w-4">{i + 1}.</span>
                    <p className="text-sm text-slate-300 leading-snug">{arg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🛡️ Objections */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-base leading-none">🛡️</span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Réponses aux objections</span>
            </div>
            <div className="space-y-3">
              {pitch.objections.map((obj, i) => (
                <div key={i} className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-3">
                  <p className="text-sm font-semibold text-slate-300 mb-1.5">"{obj.question}"</p>
                  <div className="flex items-start gap-2">
                    <ChevronRight size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400 leading-relaxed">{obj.reponse}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🤝 Closing */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-violet-400 text-base leading-none">🤝</span>
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Closing</span>
              </div>
              <button
                onClick={() => copySection(pitch.closing)}
                title="Copier le closing"
                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition"
              >
                <Copy size={12} />
              </button>
            </div>
            <div className="bg-violet-400/5 border border-violet-400/20 rounded-xl p-4">
              <p className="text-sm text-slate-200 leading-relaxed">{pitch.closing}</p>
            </div>
          </div>

          {/* Copy all button */}
          <button
            onClick={copyAll}
            className="w-full flex items-center justify-center gap-2 px-5 py-3
                       bg-navy-800/60 border border-navy-700/50 rounded-xl
                       text-sm font-semibold text-slate-300
                       hover:border-cyan-400/30 hover:text-cyan-300 active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Copié !</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                Copier le pitch complet
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
