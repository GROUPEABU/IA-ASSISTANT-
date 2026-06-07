import { useState } from 'react'
import { Building2, Users, Download, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { formatNumber } from '@/utils/formatters'
import { getMalus } from '@/utils/malus'
import { useSettings } from '@/contexts/SettingsContext'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import AIProgress from '@/components/ui/AIProgress'

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

      const prompt = `Tu es un expert commercial automobile chez Autobuyunion, 1er groupement européen d'achat auto.
Rédige un pitch de vente complet et percutant pour le ${product.fullName}, destiné aux équipes commerciales (briefing interne couvrant les deux canaux : partenaires revendeurs BtoB et particuliers BtoC).

⚠️ MOTORISATION & GÉNÉRATION : respecte EXACTEMENT l'énergie et la version du ${product.fullName}. Un hybride simple / micro-hybride / full hybrid n'est PAS un hybride rechargeable (plug-in / PHEV) : ne parle de recharge, de prise, de batterie plug-in ou d'autonomie 100 % électrique que si le véhicule est EXPLICITEMENT rechargeable. En cas de changement de génération récent, ne confonds pas la nouvelle génération avec l'ancienne (le badge de puissance est souvent le marqueur de génération).

Données de référence :
Prix catalogue : ${formatNumber(product.prix.base)}€ · CO₂ : ${product.specs.co2_wltp} g/km${priceAdvantageLine}${stockLine}

Inclus :

1. **Accroche d'ouverture** (2-3 phrases choc, avec l'avantage prix Autobuyunion)

2. **Arguments BtoB — PARTENAIRES REVENDEURS** (concessions / négociants qui RACHÈTENT pour REVENDRE, pas pour rouler) : raisonne MARGE et ROTATION. Prix de cession HT qui laisse de la marge tout en permettant de rester premier du net à la revente, modèle qui tourne vite (demande du marché final), régime de TVA clair (récupérable vs sur marge), volume et réassort, frais de remise en route faibles, et pour un import : COC / carte grise / délais. Traduis les caractéristiques produit en arguments de REVENTE, jamais en plaisir de conduite.

3. **Arguments BtoC — particuliers (utilisateur final)** : usage familial / quotidien, fiabilité, coût d'usage, économie réelle, confiance dans un achat via une centrale.

4. **Réponses aux 3 objections principales** :
   - notoriété : si la MARQUE est peu diffusée, rassure sur le réseau / la fiabilité / la capacité à se revendre ; si la marque est connue, porte plutôt l'objection sur le MODÈLE ou la version (récent, moins repérable en occasion) ;
   - valeur résiduelle / tenue de la cote ;
   - « pourquoi passer par Autobuyunion plutôt qu'en concession locale, aux enchères ou chez un autre grossiste » — traite frontalement la confiance, la livraison, le lieu de la garantie / SAV et, le cas échéant, le véhicule importé.

5. **Argument prix Autobuyunion** — achat en volume pro HT → prix de vente TTC positionné AU NIVEAU des premiers du net (top 20 % des annonces les moins chères, bas du cluster réaliste), jamais sur la moyenne haute. Appuie-toi sur les données injectées : en priorité le prix du STOCK INTERNE s'il est fourni, sinon l'écart vs concurrence et le prix catalogue.${product._importStats ? ` La base de prix du stock est ${product._importStats.priceBasis} : si elle est HT, ne présente jamais ce montant comme un prix de vente client — le prix annoncé au client final est TTC.` : ' Si aucune donnée de prix marché n\'est fournie, exprime le positionnement (premiers du net) SANS inventer de chiffre précis.'}

6. **Closing** — phrase de signature avec appel à l'action (réserver le ou les véhicules) et rappel de l'avantage prix.

RÈGLE AUTOBUYUNION : nos partenaires achètent en volume à prix HT et se positionnent TOUJOURS parmi les prix les plus compétitifs du marché (premiers du net), jamais sur la moyenne haute. En BtoB, cet avantage = marge sécurisée + capacité à rester premier du net à la revente ; en BtoC = l'un des prix les plus bas du marché.

GARANTIE : si tu évoques la garantie sur un véhicule d'occasion, précise qu'elle est RÉSIDUELLE (selon la date de 1re immatriculation) et complétée par la garantie commerciale ; ne promets jamais une garantie constructeur pleine sur un VO.

INTERDIT : n'écris jamais « malus », « écotaxe », « malus écologique », « malus au poids » ni aucun calcul de taxation CO₂ — sujet traité par un outil dédié. Le CO₂ et la consommation ne servent que d'arguments d'économie / sobriété, jamais fiscal.

CONCISION : chaque section va à l'essentiel (3 à 5 puces ou 3-4 phrases max). Un briefing dense et tenu, pas un texte fleuve : il doit être utilisable à l'oral.

Sois percutant, concret, sobre (aucun emoji, aucun symbole décoratif), adapté au marché français et directement utilisable par les équipes commerciales.`

      const result = await sendMessage([{ role: 'user', content: prompt }], { lang, maxTokens: 5000, expert: true, temperature: 0.7, tool: 'rapportcommercial', stream: true })
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
          <div className="py-8">
            <AIProgress active={loading} label={t('sales_pitch_loading')} estimatedMs={12000} persistKey="salesreport" />
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
