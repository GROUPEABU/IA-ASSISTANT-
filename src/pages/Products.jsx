import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Car, Sparkles, Trash2, Clock, FileSpreadsheet, RotateCcw } from 'lucide-react'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useHiddenProducts } from '@/hooks/useHiddenProducts'
import { getMalus, getMalusColor } from '@/utils/malus'
import Badge from '@/components/ui/Badge'
import { formatNumber } from '@/utils/formatters'
import { interpolate } from '@/utils/interpolate'
import VehicleSearchModal from '@/components/products/VehicleSearchModal'
import ImportModal from '@/components/products/ImportModal'
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
            {product._imported
              ? <Badge variant="success">{t('product_imported')}</Badge>
              : product._generated
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
          <p className="text-sm font-bold text-white leading-none">{(product.specs.puissance || '—').split(' ')[0]}</p>
          <p className="text-[10px] text-slate-500 mt-1">ch</p>
        </div>
        <div className="bg-navy-900/40 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white leading-none">{product.specs.coffre ?? '—'}</p>
          <p className="text-[10px] text-slate-500 mt-1">{t('products_trunk_unit')}</p>
        </div>
      </div>

      {/* Price & Malus — flex-wrap : sur écran étroit le malus passe dessous au lieu de déborder */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3 border-t border-navy-700/50 mb-2">
        <div className="min-w-0">
          <span className="text-[11px] text-slate-500">{t('from_price')} </span>
          <span className="text-base font-bold text-white">{formatCurrency(product.prix.premier_net ?? product.prix.base)}</span>
        </div>
        <div className="text-right min-w-0">
          <span className="text-[11px] text-slate-500">{t('products_fr_duty')} </span>
          <span className={`text-sm font-bold ${mc === 'danger' ? 'text-red-400' : mc === 'orange' ? 'text-warn' : 'text-emerald-400'}`}>
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
  const [showImport, setShowImport] = useState(false)
  const { generated, add, remove } = useGeneratedProducts()
  const { hidden, hide, restore } = useHiddenProducts()

  const visibleStatic = PRODUCTS.filter((p) => !hidden.includes(p.id))
  const importedProds = generated.filter((p) => p._imported)
  const aiProds = generated.filter((p) => !p._imported)
  const allProducts = [...visibleStatic, ...generated]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">{interpolate(t('products_count'), { n: allProducts.length })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 text-xs font-bold text-cyan-400 border border-cyan-400/30
                       px-3 py-2 rounded-lg hover:bg-cyan-400/10 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={13} />
            {t('import_btn')}
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 text-xs font-bold text-navy-900 bg-cyan-400
                       px-3 py-2 rounded-lg hover:bg-cyan-300 active:scale-95 transition-all"
          >
            <Sparkles size={13} />
            {t('generate_sheet')}
          </button>
        </div>
      </div>

      {/* IA info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
        <Sparkles size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">{t('products_banner_new')} </span>
          {t('products_banner_text')}
        </p>
      </div>

      {/* Fiches statiques (catalogue) — suppression persistante */}
      {visibleStatic.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t('products_builtin_sheets')}</p>
            {hidden.length > 0 && (
              <button
                onClick={() => restore()}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition"
              >
                <RotateCcw size={10} /> {interpolate(t('products_restore_hidden'), { n: hidden.length })}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleStatic.map((product) => (
              <ProductCard key={product.id} product={product} navigate={navigate} onDelete={hide} t={t} formatCurrency={formatCurrency} />
            ))}
          </div>
        </div>
      )}

      {/* Restauration quand tout le catalogue est masqué */}
      {visibleStatic.length === 0 && hidden.length > 0 && (
        <button
          onClick={() => restore()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition"
        >
          <RotateCcw size={12} /> {interpolate(t('products_restore_hidden'), { n: hidden.length })}
        </button>
      )}

      {/* Fiches importées (fichier de stock) */}
      {importedProds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet size={11} className="text-emerald-400" />
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t('products_imported')}</p>
            <span className="text-[10px] text-slate-600">{t('products_saved_locally')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {importedProds.map((product) => (
              <ProductCard key={product.id} product={product} navigate={navigate} onDelete={remove} t={t} formatCurrency={formatCurrency} />
            ))}
          </div>
        </div>
      )}

      {/* Fiches générées par IA */}
      {aiProds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t('products_ai_generated')}</p>
            <Clock size={10} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">{t('products_saved_locally')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiProds.map((product) => (
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

      {/* Modals */}
      {showSearch && (
        <VehicleSearchModal
          onGenerated={add}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showImport && (
        <ImportModal
          onImported={add}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
