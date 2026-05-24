import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Car, Fuel, Wind } from 'lucide-react'
import { PRODUCTS } from '@/services/products'
import { getMalus, getMalusColor } from '@/utils/malus'
import Badge from '@/components/ui/Badge'
import { formatNumber } from '@/utils/formatters'

const statusLabel = { new: 'Nouveau', soon: 'Bientôt', available: 'Disponible' }
const statusVariant = { new: 'cyan', soon: 'warning', available: 'success' }

export default function Products() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{PRODUCTS.length} véhicule(s) référencé(s)</p>
        <button className="flex items-center gap-2 text-xs font-semibold text-cyan-400 border border-cyan-400/30
                           px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition">
          <Plus size={14} />
          Ajouter un produit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRODUCTS.map((product) => {
          const malus = getMalus(product.specs.co2_wltp, product.prix.haut)
          const mc = getMalusColor(product.specs.co2_wltp)

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/products/${product.id}`)}
              className="glass-card p-5 cursor-pointer hover:border-cyan-400/30 hover:shadow-cyan
                         active:scale-[0.99] transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[product.status]}>{statusLabel[product.status]}</Badge>
                    <span className="text-xs text-slate-500">{product.year}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {product.fullName}
                  </h2>
                  <p className="text-xs text-slate-500">{product.segment}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20
                                flex items-center justify-center">
                  <Car size={22} className="text-cyan-400" />
                </div>
              </div>

              {/* Tagline */}
              <p className="text-sm text-slate-400 mb-4 italic">"{product.tagline}"</p>

              {/* Key specs */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-navy-900/40 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-white">{product.specs.co2_wltp}</p>
                  <p className="text-[10px] text-slate-500">g/km CO₂</p>
                </div>
                <div className="bg-navy-900/40 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-white">{product.specs.puissance.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-500">Chevaux</p>
                </div>
                <div className="bg-navy-900/40 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-white">{product.specs.coffre}</p>
                  <p className="text-[10px] text-slate-500">L coffre</p>
                </div>
              </div>

              {/* Price & Malus */}
              <div className="flex items-center justify-between pt-3 border-t border-navy-700/50">
                <div>
                  <span className="text-xs text-slate-500">À partir de </span>
                  <span className="text-base font-bold text-white">
                    {formatNumber(product.prix.base)} €
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Malus FR </span>
                  <span className={`text-sm font-bold ${mc === 'danger' ? 'text-red-400' : mc === 'orange' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {malus > 0 ? `+${formatNumber(malus)} €` : 'Exonéré'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium mt-3">
                Voir la fiche complète <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
