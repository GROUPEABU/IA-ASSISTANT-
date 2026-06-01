import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, TrendingUp, Gauge, Users } from 'lucide-react'
import { getProduct } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { getMalus, getMalusColor } from '@/utils/malus'
import { formatNumber } from '@/utils/formatters'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProductSheetPrint from '@/components/products/ProductSheetPrint'
import MarketAnalysis from '@/components/products/MarketAnalysis'
import MalusWidget from '@/components/products/MalusWidget'
import SalesReport from '@/components/products/SalesReport'
import ImportedStockPanel from '@/components/products/ImportedStockPanel'
import { normalizeProduct } from '@/utils/productShape'
import { useSettings } from '@/contexts/SettingsContext'
import { exportToPdf } from '@/utils/exportPdf'

export default function ProductDetail() {
  const { t } = useSettings()
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('sheet')
  const printRef = useRef(null)
  const { generated } = useGeneratedProducts()
  const rawProduct = getProduct(id) ?? generated.find((p) => p.id === id)
  const product = rawProduct ? normalizeProduct(rawProduct) : null

  const TABS = [
    { id: 'sheet', label: t('tab_sheet'), icon: FileText },
    { id: 'market', label: t('tab_market'), icon: TrendingUp },
    { id: 'malus', label: t('tab_malus'), icon: Gauge },
    { id: 'sales', label: t('tab_sales'), icon: Users },
  ]

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-400">{t('product_not_found')}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft size={14} /> {t('back')}
        </Button>
      </div>
    )
  }

  const malus = getMalus(product.specs.co2_wltp, product.prix.haut)
  const malusColor = getMalusColor(product.specs.co2_wltp)

  const handlePDF = async () => {
    await exportToPdf(printRef, `${product.fullName.replace(/ /g, '_')}_fiche.pdf`, {
      title: t('page_products_title'),
      subtitle: product.fullName,
    })
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/products')}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg
                     border border-navy-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{product.fullName}</h1>
            <Badge variant="cyan">{product.segment}</Badge>
            {malus > 0 && (
              <Badge variant={malusColor === 'danger' ? 'danger' : 'warning'}>
                {t('malus_badge_label')} +{formatNumber(malus)} €
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{product.origin} · {product.year}</p>
        </div>
        <Button size="sm" onClick={handlePDF} className="flex-shrink-0">
          <Download size={14} /> PDF
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800/60 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                        whitespace-nowrap transition-all flex-shrink-0
                        ${tab === tid ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Stock importé + veille prix interne */}
      {product._imported && <ImportedStockPanel product={product} />}

      {/* Tab content */}
      <div>
        {tab === 'sheet' && <ProductSheetPrint ref={printRef} product={product} malus={malus} malusColor={malusColor} />}
        {tab === 'market' && <MarketAnalysis product={product} />}
        {tab === 'malus' && <MalusWidget product={product} />}
        {tab === 'sales' && <SalesReport product={product} />}
      </div>
    </div>
  )
}
