import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Car, Sparkles, Trash2, Clock } from 'lucide-react'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { getMalus, getMalusColor } from '@/utils/malus'
import Badge from '@/components/ui/Badge'
import { formatNumber } from '@/utils/formatters'
import VehicleSearchModal from '@/components/products/VehicleSearchModal'
import { useSettings } from '@/contexts/SettingsContext'

const statusVariant = { new: 'cyan', soon: 'warning', available: 'success' }

function ProductCard({ product, onDelete, navigate, t, formatCurrency }) {
  const malus = getMalus(product.specs.co2_wltp, product.prix.haut)
  const mc = getMalusColor(product.specs.co2_wltp)

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="glass-card p-4 md:p-5 cursor-pointer hover:border-cyan-400/30
                 active:scale-[0.99] transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {product._generated
              ? <Badge variant="cyan">{t('product_generated')}</Badge>
              : <Badge variant={statusVariant[product.status]}>{t(`product_${product.status}`)}</Badge>}
            <span className="text-xs text-slate-500">{product.year}</span>
          </div>
          <h2 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors leading-tight">
            {product.fullName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{product.segment}</p>
        </div>
        <div className="flex items-start gap-1 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <Car size={20} className="text-cyan-400" />
          </div>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(product.id) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600
                         hover:text-red-400 hover:bg-red-400/10 transition"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tagline */}
      <p className="text-xs text-slate-400 italic mb-3 line-clamp-2">"{product.tagline}"</p>

      {/* Key specs — 3 colonnes égales */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-navy-900/40 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white leading-none">{product.specs.co2_wltp}</p>
          <p className="text-[10px] text-slate-500 mt-1">g/km CO₂</p>
        </div>
        <div className="bg-navy-900/40 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white leading-none">{product.specs.puissance.split(' ')[0]}</p>
          <p className="text-[10px] text-slate-500 mt-1">ch</p>
        </div>
        <div className="bg-navy-900/40 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white leading-none">{product.specs.coffre}</p>
          <p className="text-[10px] text-slate-500 mt-1">L coffre</p>
        </div>
      </div>

      {/* Price & Malus */}
      <div className="flex items-center justify-between pt-3 border-t border-navy-700/50 mb-2">
        <div>
          <span className="text-[11px] text-slate-500">{t('from_price')} </span>
          <span className="text-base font-bold text-white">{formatCurrency(product.prix.base)}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500">Malus FR </span>
          <span className={`text-sm font-bold ${mc === 'danger' ? 'text-red-400' : mc === 'orange' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {malus > 0 ? `+${formatCurrency(malus)}` : t('exempt')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
        {t('view_sheet')} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  )
}

export default function Products() {
  const navigate = useNavigate()
  const { t, formatCurrency } = useSettings()
  const [showSearch, setShowSearch] = useState(false)
  const { generated, add, remove } = useGeneratedProducts()

  const allProducts = [...PRODUCTS, ...generated]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{allProducts.length} véhicule(s) référencé(s)</p>
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 text-xs font-bold text-navy-900 bg-cyan-400
                     px-3 py-2 rounded-lg hover:bg-cyan-300 active:scale-95 transition-all"
        >
          <Sparkles size={13} />
          {t('generate_sheet')}
        </button>
      </div>

      {/* IA info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
        <Sparkles size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">Nouveau :</span> Générez une fiche produit pour n'importe quel véhicule.
          L'IA récupère les vraies specs, prix catalogue, CO₂ WLTP, concurrents et analyse marché automatiquement.
        </p>
      </div>

      {/* Fiches statiques */}
      {PRODUCTS.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Fiches intégrées</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} navigate={navigate} t={t} formatCurrency={formatCurrency} />
            ))}
          </div>
        </div>
      )}

      {/* Fiches générées */}
      {generated.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fiches générées par IA</p>
            <Clock size={10} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">Sauvegardées localement</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generated.map((product) => (
              <ProductCard key={product.id} product={product} navigate={navigate} onDelete={remove} t={t} formatCurrency={formatCurrency} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Car size={40} className="text-slate-700" />
          <p className="text-sm text-slate-500">{t('no_products')}</p>
          <button onClick={() => setShowSearch(true)} className="btn-primary text-sm flex items-center gap-2">
            <Sparkles size={14} /> {t('generate_sheet')}
          </button>
        </div>
      )}

      {/* Modal */}
      {showSearch && (
        <VehicleSearchModal
          onGenerated={add}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
