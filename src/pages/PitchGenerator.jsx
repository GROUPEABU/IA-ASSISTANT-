import { useState, useRef } from 'react'
import { Mic, RefreshCw, RotateCcw, Users, Car, Wrench, Building2, Briefcase, Download } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'
import { mdToHtml } from '@/utils/mdToHtml'
import { veillePrixRefBlock } from '@/utils/veillePrix'
import { PRODUCTS } from '@/services/products'
import { useGeneratedProducts } from '@/hooks/useGeneratedProducts'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { useResultFocus } from '@/hooks/useResultFocus'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'

const STATIC_PITCH = `⚠️ MOTORISATION EXACTE : respecte STRICTEMENT la motorisation indiquée dans le nom du véhicule et les détails. Ne la remplace JAMAIS par une autre variante. En particulier, un « hybride » simple / micro-hybride / full hybrid n'est PAS un « hybride rechargeable » (plug-in / PHEV) : ne parle de recharge, de prise, de batterie plug-in ou d'autonomie 100 % électrique que si le véhicule est EXPLICITEMENT rechargeable. En cas de doute, reste sur la motorisation littéralement indiquée.

⚠️ GÉNÉRATION : en cas de changement de génération récent du modèle, ne confonds pas la nouvelle génération avec l'ancienne — le badge de motorisation/puissance est souvent le marqueur de génération (ex. un 136 et un 145 peuvent désigner deux générations du même modèle).

═══ MODÈLE D'AFFAIRES (RESPECTER ABSOLUMENT — ne rien inventer autour) ═══
Autobuyunion est une CENTRALE D'ACHAT européenne : elle achète en volume et revend À SES PARTENAIRES REVENDEURS (concessions, négociants, agents). Ce sont CES PARTENAIRES qui vendent ensuite au client final (BtoB comme BtoC). Autobuyunion ne vend, ne livre et ne facture JAMAIS le client final.
- Vendeur face au particulier (BtoC) = le PARTENAIRE, jamais Autobuyunion. N'écris jamais qu'Autobuyunion vend, livre, immatricule ou suit le particulier.
- LIVRAISON : Autobuyunion gère l'approvisionnement jusqu'au PARTENAIRE (UE, transport inclus) ; la livraison au client final relève du partenaire. AUCUNE livraison à domicile par Autobuyunion.
- AUCUN essai, AUCUNE rétractation, AUCUN « satisfait ou remboursé », AUCUN retour : n'invente jamais de période d'essai (ex. « 7 jours »), de refus à la livraison ni de politique de retour.
- N'INVENTE JAMAIS un processus, service, délai, garantie maison, intermédiaire ou modalité (livraison / essai / retour / immatriculation / « concessionnaire partenaire » où récupérer le véhicule) qui ne t'est pas explicitement fourni. Si un mécanisme n'est pas connu, n'en parle pas : reste sur la valeur (prix, marge, sourcing, disponibilité, financement / portage AU PARTENAIRE).

═══ À QUI S'ADRESSE LE PITCH (déterminant — cale TOUT le discours dessus) ═══
- BtoC (Famille, Grand rouleur) = UTILISATEUR FINAL particulier, à qui c'est le PARTENAIRE REVENDEUR qui vend (jamais Autobuyunion). Parle usage, fiabilité, coût d'usage, confort, économie réelle et confiance dans le véhicule. Le prix = l'un des plus attractifs du marché (au niveau des premiers du net, bas du cluster réaliste ; le « top 20 % les moins chers » n'illustre que ce niveau, ce n'est pas une cible distincte).
- BtoB = PARTENAIRE REVENDEUR (concession ou négociant qui RACHÈTE pour REVENDRE, PAS pour rouler). Tout le pitch raisonne MARGE et ROTATION, jamais usage ou confort personnel. Le pitch doit prouver :
  1. Le prix de cession HT laisse une MARGE REVENDEUR (votre marge à la revente — distincte de la marge Autobuyunion à l'achat) tout en lui permettant de rester parmi les premiers du net à SA revente.
  2. Le modèle TOURNE vite : forte demande sur le marché final, donc peu de risque de stock dormant. Parle de rotation rapide en termes QUALITATIFS ; n'avance JAMAIS un délai de revente chiffré (ex. « vendu en X jours »), donnée inconnue.
  3. Régime de TVA clair (récupérable vs TVA sur marge), annoncé d'avance.
  4. VOLUME et réassort disponibles (centrale multi-pays).
  5. État réel et frais de remise en route faibles avant remise en vente.
  6. Si véhicule importé : COC fourni, carte grise et délais d'immatriculation cadrés.
  Traduis TOUJOURS les caractéristiques produit en arguments de REVENTE (« se revend facilement, demande large, argument client final clé en main »), jamais en plaisir de conduite.

RÈGLE AUTOBUYUNION : nos partenaires achètent en volume à prix HT compétitif. Cet avantage prix doit apparaître dans l'accroche ou les arguments.
- En BtoB : l'avantage prix = marge sécurisée + capacité à rester premier du net à la revente.
- En BtoC : l'avantage prix = l'un des prix les plus bas du marché, économie réelle vs prix marché moyen.

INTERDIT : aucune mention du malus, de l'écotaxe, du malus écologique, du malus au poids ni de la taxation CO₂ — sujet traité par un outil dédié. La donnée CO₂ et la consommation ne servent QUE d'argument d'économie / sobriété, jamais d'argument fiscal.

NUANCES (présente-les comme POSSIBILITÉS, jamais comme des acquis) :
- Financement / portage au partenaire : possible SOUS CONDITIONS (selon critères), pas systématique ni garanti — évoque-le en option.
- Garantie constructeur : évoque-la SANS durée chiffrée ; la plupart de nos véhicules en bénéficient, mais pas systématiquement — possibilité majoritaire à confirmer, jamais une promesse ferme.

FORMAT DE SORTIE (Markdown épuré, AUCUN JSON, aucune phrase d'introduction, aucun emoji). Commence directement par « ## Accroche ». Reproduis EXACTEMENT cette structure, dans cet ordre :

## Accroche
2-3 phrases d'accroche percutantes, adaptées au profil, avec chiffres et avantage prix Autobuyunion (marge+rotation si BtoB, économie si BtoC).

## Arguments clés
- Argument 1 concret avec données chiffrées (orienté revente/marge si BtoB, usage/économie si BtoC)
- Argument 2 concret avec données chiffrées
- Argument prix Autobuyunion : positionnement parmi les plus compétitifs du marché — marge dégageable et maintien premier du net (BtoB) ou économie réelle vs prix marché moyen (BtoC)
(3 à 4 puces au total, chacune commençant par « - ».)

## Réponses aux objections
Pour CHAQUE objection probable du profil ciblé (2 minimum), une ligne avec la question puis la réponse :
**« Objection probable telle que dite par le client »**
Réponse commerciale en 2-3 phrases avec argument concret et chiffré.

## Closing
Phrase de closing engageante avec appel à l'action (réserver le ou les véhicules) et rappel de l'avantage prix.

CONTRAINTES DE FORME :
- Concis : chaque section va à l'essentiel.
- Aucun texte avant « ## Accroche », rien après le Closing. Aucun emoji.`

const PROFILES = [
  { id: 'btoc_famille', labelKey: 'profile_family', subKey: 'profile_family_sub', icon: Users,     segment: 'btoc', color: '#50E5E5' },
  { id: 'btoc_rouleur', labelKey: 'profile_driver', subKey: 'profile_family_sub', icon: Car,       segment: 'btoc', color: '#7DD3FC' },
  { id: 'btob_pme',     labelKey: 'profile_pme',    subKey: 'profile_pme_sub',    icon: Wrench,    segment: 'btob', color: '#E6B450' },
  { id: 'btob_flotte',  labelKey: 'profile_fleet',  subKey: 'profile_fleet_sub',  icon: Building2, segment: 'btob', color: '#CC8B3D' },
  { id: 'btob_cadre',   labelKey: 'profile_exec',   subKey: 'profile_exec_sub',   icon: Briefcase, segment: 'btob', color: '#a78bfa' },
]

export default function PitchGenerator() {
  const { t, lang } = useSettings()
  const pitchRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [profileId, setProfileId] = useState('btoc_famille')
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')

  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const allProducts = [...PRODUCTS, ...generated]
  const { history, add: addHistory, clear: clearHistory } = useHistory('pitch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && !loading && !streaming)

  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || vehicleNameOf(details)
  const profile = PROFILES.find((p) => p.id === profileId)

  const generate = async () => {
    if (!vehicleName.trim()) return
    saveLastVehicle(vehicleName)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')

    try {
      const productContext = selectedProduct
        ? [
            'DONNÉES PRODUIT :',
            `- Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€`,
            `- Segment : ${selectedProduct.segment}`,
            selectedProduct.specs?.motorisation && `- Motorisation : ${selectedProduct.specs.motorisation}`,
            selectedProduct.specs?.consommation && `- Consommation WLTP : ${selectedProduct.specs.consommation}`,
            `- CO₂ : ${selectedProduct.specs.co2_wltp} g/km`,
            selectedProduct.specs?.autonomie_wltp ? `- Autonomie : ${selectedProduct.specs.autonomie_wltp} km` : null,
            selectedProduct.garantie?.vehicule && `- Garantie : ${selectedProduct.garantie.vehicule}`,
            selectedProduct[profile.segment]?.atouts && `- Atouts ${profile.segment === 'btob' ? 'BtoB' : 'BtoC'} : ${selectedProduct[profile.segment].atouts.join(' | ')}`,
            `- Argument prix : ${selectedProduct[profile.segment]?.argument_prix || selectedProduct.btoc?.argument_prix || ''}`,
            selectedProduct[profile.segment]?.objections && `- Objections courantes : ${selectedProduct[profile.segment].objections.join(' | ')}`,
          ].filter(Boolean).join('\n')
        : ''

      const prompt = `Génère un pitch de vente structuré et percutant pour le ${vehicleName}, destiné à : ${t(profile.subKey)} — ${t(profile.labelKey)}.
${formatVehicleDetails(details) ? `Détails véhicule : ${formatVehicleDetails(details)}. Appuie-toi dessus pour des arguments PRÉCIS (motorisation, âge, kilométrage, finition).` : ''}
${context ? `Contexte client : ${context}` : ''}
${productContext || ''}${veillePrixRefBlock(vehicleName)}`

      let first = true
      const text = await sendMessage([{ role: 'user', content: prompt }], {
        lang, maxTokens: 1800, expert: true, temperature: 0.85,
        tool: 'pitch', stream: true, systemStatic: STATIC_PITCH,
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setReport(full)
        },
      })
      const label = `${vehicleName} · ${t(profile.subKey)} ${t(profile.labelKey)}`
      setReport(text)
      setStreaming(false)
      setGeneratedFor(label)
      addHistory({ generatedFor: label, report: text })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(vehicleName, t('page_pitch_title')), { title: t('page_pitch_title'), subtitle: vehicleName })
  )

  const reset = () => { setReport(''); setVehicleId(''); setDetails(EMPTY_DETAILS); setContext(''); setGeneratedFor('') }

  const restore = (item) => {
    setReport(item.report || '')
    setGeneratedFor(item.generatedFor)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Config ── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center">
            <Mic size={15} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">{t('page_pitch_title')}</h2>
            <p className="text-[11px] text-slate-500">{t('page_pitch_sub')}</p>
          </div>
        </div>


        <VehicleDetails value={details} onChange={setDetails} />

        {/* Profile selector */}
        <div className="mb-4">
          <label className="section-label block mb-2">{t('client_profile')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROFILES.map((p) => {
              const Icon = p.icon
              const isActive = profileId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'border-transparent'
                      : 'border-navy-600/50 hover:border-navy-600 hover:bg-navy-700/20'
                  }`}
                  style={isActive ? { background: `${p.color}12`, borderColor: `${p.color}35` } : {}}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? `${p.color}20` : 'rgba(255,255,255,0.04)' }}
                  >
                    <Icon size={14} style={{ color: isActive ? p.color : '#64748b' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isActive ? p.color : '#94a3b8' }}>{t(p.labelKey)}</p>
                    <p className="text-[10px] text-slate-600 truncate">{t(p.subKey)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Context */}
        <div className="mb-4">
          <label className="section-label block mb-1">
            {t('context_label')} <span className="text-slate-600 normal-case font-normal">{t('context_optional')}</span>
          </label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t('context_ph')}
            className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-white placeholder-slate-600 resize-none
                       focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 transition"
          />
        </div>

        <button
          onClick={generate}
          disabled={!vehicleName.trim() || loading || streaming}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5
                     bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900 text-sm font-bold rounded-xl
                     hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-400/15"
        >
          {(loading || streaming) ? <Spinner size="sm" /> : <Mic size={14} />}
          {(loading || streaming) ? t('generating') : t('generate_pitch_btn')}
        </button>
      </div>

      {loading && !report && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {!loading && !streaming && <ErrorAlert message={error} onRetry={generate} />}

      {(report || streaming) && (
        <div className="space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor || t('page_pitch_title')}</p>
              <p className="text-xs text-slate-500">{t('pitch_ready')}</p>
            </div>
            {report && !streaming && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePdf}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
                >
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={generate} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition px-2.5 py-1.5 rounded-lg hover:bg-cyan-400/5">
                  <RefreshCw size={11} /> {t('regenerate')}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
                >
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          <div ref={pitchRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {streaming && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </div>
      )}

      <HistoryPanel items={history} onRestore={restore} onClear={clearHistory} primary={(item) => item.generatedFor} />
    </div>
  )
}
