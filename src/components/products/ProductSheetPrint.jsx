import { forwardRef } from 'react'
import { Car, Fuel, Gauge, Maximize, Package, CheckCircle2 } from 'lucide-react'
import { formatNumber } from '@/utils/formatters'
import Badge from '@/components/ui/Badge'
import { useSettings } from '@/contexts/SettingsContext'

const Spec = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-navy-700/30 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-xs font-semibold text-white">{value}</span>
  </div>
)

const Section = ({ title, children }) => (
  <div className="glass-card p-4">
    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
)

const ProductSheetPrint = forwardRef(({ product, malus, malusColor }, ref) => {
  const { t } = useSettings()
  return (
    <div ref={ref} className="space-y-4">
      {/* Identité produit */}
      <div className="glass-card overflow-hidden">
        {/* Photo véhicule */}
        {product.image ? (
          <div className="relative h-48 md:h-64 bg-navy-900/60 overflow-hidden">
            <img
              src={product.image}
              alt={product.fullName}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
            />
            <div className="hidden absolute inset-0 items-center justify-center bg-cyan-400/5">
              <Car size={48} className="text-cyan-400/40" />
            </div>
          </div>
        ) : (
          <div className="h-36 md:h-48 bg-gradient-to-br from-navy-900/80 to-cyan-400/5
                          flex items-center justify-center gap-4 border-b border-navy-700/30">
            <div className="w-20 h-20 rounded-2xl bg-cyan-400/10 border border-cyan-400/20
                            flex items-center justify-center">
              <Car size={36} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{product.brand}</p>
              <p className="text-2xl font-bold text-white">{product.model}</p>
              <p className="text-xs text-slate-500 mt-0.5">{product.year}</p>
            </div>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{product.origin}</p>
              <h2 className="text-xl font-bold text-white">{product.fullName}</h2>
              <p className="text-sm text-slate-400 mt-1">{product.tagline}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="cyan">{product.segment}</Badge>
                <Badge variant="default">{product.year}</Badge>
                {product.colors.slice(0, 2).map((c) => (
                  <span key={c} className="text-[10px] text-slate-500">· {c}</span>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">{t('product_from')}</p>
              <p className="text-xl font-bold text-white">{formatNumber(product.prix.base)} €</p>
              <p className="text-xs text-slate-500">{t('product_up_to')} {formatNumber(product.prix.haut)} €</p>
              {malus > 0 && (
                <p className={`text-xs font-semibold mt-1 ${malusColor === 'danger' ? 'text-red-400' : 'text-warn'}`}>
                  + Malus {formatNumber(malus)} €
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Specs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title={t('product_section_motor')}>
          <Spec label={t('product_spec_motorisation')} value={product.specs.motorisation} />
          <Spec label={t('product_spec_power')} value={product.specs.puissance} />
          <Spec label={t('product_spec_torque')} value={product.specs.couple} />
          <Spec label={t('product_spec_transmission')} value={product.specs.transmission} />
          <Spec label={t('product_spec_drive')} value={product.specs.traction} />
          <Spec label={t('product_spec_consumption')} value={product.specs.consommation} />
          <Spec label="CO₂ WLTP" value={`${product.specs.co2_wltp} g/km`} />
        </Section>

        <Section title={t('product_section_dims')}>
          <Spec label={t('product_spec_length')} value={`${product.specs.longueur} mm`} />
          <Spec label={t('product_spec_width')} value={`${product.specs.largeur} mm`} />
          <Spec label={t('product_spec_height')} value={`${product.specs.hauteur} mm`} />
          <Spec label={t('product_spec_wheelbase')} value={`${product.specs.empattement} mm`} />
          <Spec label={t('product_spec_trunk')} value={`${product.specs.coffre} L`} />
          <Spec label={t('product_spec_tank')} value={`${product.specs.reservoir} L`} />
          <Spec label={t('product_spec_weight')} value={`${product.specs.poids} kg`} />
        </Section>
      </div>

      {/* Équipements */}
      <Section title={t('product_section_equipment')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {product.equipements.map((eq) => (
            <div key={eq} className="flex items-start gap-2 py-1">
              <CheckCircle2 size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">{eq}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Concurrents */}
      <Section title={t('product_section_competitors')}>
        <div className="space-y-2">
          {product.concurrents.map((c) => {
            const gap = product.prix.base - c.prix
            return (
              <div key={c.nom} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-300 w-32 flex-shrink-0">{c.nom}</span>
                <div className="flex-1 h-1.5 bg-navy-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-600 rounded-full"
                    style={{ width: `${(c.prix / (product.prix.haut * 1.3)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">
                  {formatNumber(c.prix)} €
                </span>
                <span className={`text-xs font-semibold w-16 text-right flex-shrink-0
                  ${gap <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {gap > 0 ? `-${formatNumber(gap)}` : `+${formatNumber(Math.abs(gap))}`} €
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-3 mt-1 pt-2 border-t border-navy-700/30">
            <span className="text-xs font-bold text-cyan-400 w-32 flex-shrink-0">{product.fullName}</span>
            <div className="flex-1 h-1.5 bg-navy-900/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${(product.prix.base / (product.prix.haut * 1.3)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-cyan-400 w-20 text-right flex-shrink-0">
              {formatNumber(product.prix.base)} €
            </span>
            <span className="w-16" />
          </div>
        </div>
      </Section>
    </div>
  )
})

ProductSheetPrint.displayName = 'ProductSheetPrint'
export default ProductSheetPrint
