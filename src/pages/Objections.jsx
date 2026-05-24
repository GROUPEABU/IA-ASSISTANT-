import { useState } from 'react'
import { ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Download, AlertCircle } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'

const SEGMENTS = [
  { id: 'btoc', label: 'BtoC — Particuliers' },
  { id: 'btob', label: 'BtoB — Entreprises & Flottes' },
  { id: 'both', label: 'Les deux' },
]

const CATEGORY_COLORS = {
  prix: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  marque: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  qualité: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  financement: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'après-vente': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  revente: 'bg-red-400/10 text-red-400 border-red-400/20',
  malus: 'bg-red-400/10 text-red-400 border-red-400/20',
  concurrence: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
}

function ObjectionCard({ item, index, isOpen, onToggle }) {
  const catColor = CATEGORY_COLORS[item.categorie?.toLowerCase()] || CATEGORY_COLORS.concurrence

  return (
    <div className={`glass-card overflow-hidden transition-all duration-200 ${isOpen ? 'border-cyan-400/30' : ''}`}>
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start gap-3">
        <span className="text-xs font-bold text-slate-600 w-5 flex-shrink-0 mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-200 leading-snug">"{item.objection}"</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.categorie && (
                <span className={`hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
                  {item.categorie}
                </span>
              )}
              {isOpen
                ? <ChevronUp size={15} className="text-cyan-400" />
                : <ChevronDown size={15} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pl-8 animate-fade-in">
          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Réponse recommandée</p>
            <p className="text-sm text-slate-300 leading-relaxed">{item.reponse}</p>
          </div>
          {item.argument_cle && (
            <div className="mt-2 flex items-start gap-2">
              <ShieldCheck size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-cyan-300 italic">{item.argument_cle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Objections() {
  const [vehicleId, setVehicleId] = useState('')
  const [customVehicle, setCustomVehicle] = useState('')
  const [segment, setSegment] = useState('both')
  const [loading, setLoading] = useState(false)
  const [objections, setObjections] = useState([])
  const [openIndex, setOpenIndex] = useState(0)
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')
  const { generated } = useGeneratedProducts()

  const allProducts = [...PRODUCTS, ...generated]
  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || customVehicle

  const generate = async () => {
    if (!vehicleName.trim()) return
    setLoading(true)
    setError(null)
    setObjections([])

    try {
      const segLabel = SEGMENTS.find((s) => s.id === segment)?.label
      const productContext = selectedProduct
        ? `Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€
Origine : ${selectedProduct.origin}
CO₂ : ${selectedProduct.specs.co2_wltp} g/km
Segment : ${selectedProduct.segment}`
        : ''

      const prompt = `Tu es expert commercial automobile pour Autobuyunion.

Génère exactement 10 objections clients fréquentes pour le ${vehicleName}, segment ${segLabel}.
${productContext}

Réponds UNIQUEMENT en JSON valide :
[
  {
    "objection": "Texte de l'objection telle que la dit le client",
    "categorie": "prix|marque|qualité|financement|après-vente|revente|malus|concurrence",
    "reponse": "Réponse commerciale percutante, concrète, avec chiffres si possible (3-5 phrases)",
    "argument_cle": "L'argument massue en une phrase"
  }
]

Les objections doivent être réalistes, variées, couvrir : prix, marque inconnue, fiabilité, valeur de revente, malus, financement, SAV, concurrence.`

      const raw = await sendMessage([{ role: 'user', content: prompt }])
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Parsing erreur — réessayez')
      const data = JSON.parse(match[0])
      setObjections(data)
      setGeneratedFor(`${vehicleName} · ${segLabel}`)
      setOpenIndex(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Config */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Réponses aux objections</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Produit catalogue */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Véhicule catalogue
            </label>
            <select
              value={vehicleId}
              onChange={(e) => { setVehicleId(e.target.value); setCustomVehicle('') }}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="">-- Sélectionner --</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>

          {/* Ou saisie libre */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Ou autre véhicule
            </label>
            <input
              type="text"
              value={customVehicle}
              onChange={(e) => { setCustomVehicle(e.target.value); setVehicleId('') }}
              placeholder="Ex: BMW X1 2024"
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>

          {/* Segment */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Segment cible
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={!vehicleName.trim() || loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5
                       bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Spinner size="sm" /> : <ShieldCheck size={14} />}
            {loading ? 'Génération…' : 'Générer les 10 objections'}
          </button>
          {objections.length > 0 && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-cyan-400
                         border border-cyan-400/30 rounded-xl hover:bg-cyan-400/10 transition">
              <Download size={14} /> Imprimer
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 flex gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">Génération des objections et réponses…</p>
        </div>
      )}

      {/* Results */}
      {objections.length > 0 && !loading && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{generatedFor}</p>
              <p className="text-xs text-slate-500">{objections.length} objections · Cliquez pour révéler la réponse</p>
            </div>
            <button onClick={generate}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition">
              <RefreshCw size={11} /> Régénérer
            </button>
          </div>

          <div className="space-y-2">
            {objections.map((item, i) => (
              <ObjectionCard
                key={i}
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
