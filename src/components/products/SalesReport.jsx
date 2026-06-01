import { useState } from 'react'
import { Building2, Users, Download, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { formatNumber } from '@/utils/formatters'
import { getMalus } from '@/utils/malus'
import { useSettings } from '@/contexts/SettingsContext'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

function SegmentBlock({ icon: Icon, color, title, targets, strengths, objections, extra }) {
  const { t } = useSettings()
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('sales_targets')}</p>
        <div className="flex flex-wrap gap-1.5">
          {targets.map((c) => (
            <span key={c} className="text-xs bg-navy-700/60 border border-navy-600/50 text-slate-300 px-2 py-0.5 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">{t('sales_strengths')}</p>
        <div className="space-y-1.5">
          {strengths.map((a) => (
            <div key={a} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">{a}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">{t('sales_objections')}</p>
        <div className="space-y-1.5">
          {objections.map((o) => (
            <div key={o} className="flex items-start gap-2">
              <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">{o}</span>
            </div>
          ))}
        </div>
      </div>

      {extra && (
        <div className="pt-3 border-t border-navy-700/50">
          {extra}
        </div>
      )}
    </div>
  )
}

export default function SalesReport({ product }) {
  const { t, lang } = useSettings()
  const [pitch, setPitch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const malus = getMalus(product.specs.co2_wltp, product.prix.haut)

  const generatePitch = async () => {
    setLoading(true)
    setError(null)
    try {
      const concurrents = product.concurrents || []
      const avgConc = concurrents.length
        ? Math.round(concurrents.reduce((a, c) => a + (c.prix || 0), 0) / concurrents.length)
        : null
      const priceAdvantageLine = avgConc != null
        ? `\nAvantage prix vs concurrence : -${formatNumber(Math.max(0, avgConc - product.prix.base))}€ en moyenne`
        : ''
      const stockLine = product._importStats
        ? `\nStock interne : ${product._importStats.count} véhicule(s) · prix ${product._importStats.priceBasis} ${formatNumber(product._importStats.prixMin)}–${formatNumber(product._importStats.prixMax)}€`
        : ''

      const prompt = `Tu es un expert commercial automobile chez Autobuyunion.
Rédige un pitch de vente complet et percutant pour le ${product.fullName} destiné aux équipes commerciales.

Inclus :
1. **Accroche d'ouverture** (2-3 phrases choc)
2. **Arguments BtoB** (flottes, entreprises)
3. **Arguments BtoC** (particuliers)
4. **Réponses aux 3 objections principales** (marque inconnue, malus, valeur résiduelle)
5. **Closing** — phrase de signature

Prix : ${formatNumber(product.prix.base)}€ · Malus : ${malus > 0 ? `+${formatNumber(malus)}€` : 'Exonéré'} · CO₂ : ${product.specs.co2_wltp}g/km${priceAdvantageLine}${stockLine}

Sois percutant, concret et adapté au marché français.`

      const result = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 2500, expert: true, temperature: 0.7, tool: 'rapportcommercial' })
      setPitch(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Key figures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('sales_price_base'), value: `${formatNumber(product.prix.base)} €` },
          { label: t('sales_price_max'),  value: `${formatNumber(product.prix.haut)} €` },
          { label: t('sales_malus_fr'),   value: malus > 0 ? `+${formatNumber(malus)} €` : t('sales_exempt') },
          { label: t('sales_btob_discount'), value: product.btob.remise_cible },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card px-4 py-3 text-center">
            <p className="text-sm font-bold text-cyan-400">{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* BtoB / BtoC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SegmentBlock
          icon={Building2}
          color="bg-cyan-400/10 text-cyan-400"
          title={t('sales_btob_title')}
          targets={product.btob.cibles}
          strengths={product.btob.atouts}
          objections={product.btob.objections}
          extra={
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-cyan-400">{t('sales_target_discount')} :</span> {product.btob.remise_cible} {t('sales_on_volume')}
            </p>
          }
        />
        <SegmentBlock
          icon={Users}
          color="bg-violet-400/10 text-violet-400"
          title={t('sales_btoc_title')}
          targets={product.btoc.cibles}
          strengths={product.btoc.atouts}
          objections={product.btoc.objections}
          extra={
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-violet-400">{t('sales_price_arg')} :</span> {product.btoc.argument_prix}
            </p>
          }
        />
      </div>

      {/* AI Pitch */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('sales_pitch_title')}</h3>
            <p className="text-xs text-slate-500">{t('sales_pitch_subtitle')}</p>
          </div>
          <Button size="sm" variant={pitch ? 'ghost' : 'primary'} onClick={generatePitch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
            {pitch ? t('sales_pitch_refresh') : t('sales_pitch_generate')}
          </Button>
        </div>

        {!pitch && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">{t('sales_pitch_cta')}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size="md" />
            <p className="text-xs text-slate-500">{t('sales_pitch_loading')}</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {pitch && (
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{pitch}</div>
          </div>
        )}
      </div>
    </div>
  )
}
