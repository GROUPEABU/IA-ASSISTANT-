import { useState, useRef } from 'react'
import { ShieldCheck, RefreshCw, RotateCcw, Download } from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import VehicleDetails, { EMPTY_DETAILS, formatVehicleDetails, vehicleNameOf } from '@/components/ui/VehicleDetails'
import { mdToHtml } from '@/utils/mdToHtml'
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

const SEGMENTS = [
  { id: 'btoc', labelKey: 'btoc', subKey: 'btoc_sub' },
  { id: 'btob', labelKey: 'btob', subKey: 'btob_sub' },
]

// Bloc statique caché côté système — instructions invariantes + format Markdown.
const STATIC_OBJECTIONS = `⚠️ MOTORISATION EXACTE : respecte STRICTEMENT la motorisation du nom du véhicule et des détails. Un « hybride » simple/micro-hybride/full hybrid n'est PAS un « hybride rechargeable » (plug-in/PHEV) : ne parle de recharge, de prise ou d'autonomie 100 % électrique que si le véhicule est EXPLICITEMENT rechargeable. Ne substitue jamais une autre variante.

⚠️ GÉNÉRATION : en cas de changement de génération récent du modèle, ne confonds pas la nouvelle génération avec l'ancienne — le badge de motorisation/puissance est souvent le marqueur de génération (ex. un 136 et un 145 peuvent désigner deux générations du même modèle).

═══ MODÈLE D'AFFAIRES (RESPECTER ABSOLUMENT — ne rien inventer autour) ═══
Autobuyunion est une CENTRALE D'ACHAT européenne : elle achète en volume et revend À SES PARTENAIRES REVENDEURS (concessions, négociants, agents). Ce sont CES PARTENAIRES qui vendent ensuite au client final (BtoB comme BtoC). Autobuyunion ne vend, ne livre et ne facture JAMAIS le client final.
- Vendeur face au particulier (BtoC) = le PARTENAIRE, jamais Autobuyunion. N'écris jamais qu'Autobuyunion vend, livre, immatricule ou suit le particulier.
- LIVRAISON : Autobuyunion gère l'approvisionnement jusqu'au PARTENAIRE (UE, transport inclus) ; la livraison au client final relève du partenaire. AUCUNE livraison à domicile par Autobuyunion.
- AUCUN essai, AUCUNE rétractation, AUCUN « satisfait ou remboursé », AUCUN retour : n'invente jamais de période d'essai (ex. « 7 jours »), de refus à la livraison ni de politique de retour.
- N'INVENTE JAMAIS un processus, service, délai, garantie maison, intermédiaire ou modalité (livraison / essai / retour / immatriculation / « concessionnaire partenaire » où récupérer le véhicule) qui ne t'est pas explicitement fourni. Si un mécanisme n'est pas connu, n'en parle pas : reste sur la valeur (prix, marge, sourcing, disponibilité, financement / portage AU PARTENAIRE).

ADAPTATION AU SEGMENT (sans tout dupliquer) : mêmes familles d'objections, mais cale le ton et les chiffres sur le type de client.
- BtoC (particulier, utilisateur final) : budget personnel, usage familial/quotidien, fiabilité, coût d'usage, valeur de revente à titre privé, confiance dans le véhicule et le revendeur (le particulier achète auprès du PARTENAIRE, jamais d'Autobuyunion).
- BtoB (PARTENAIRE REVENDEUR — concession ou négociant qui RACHÈTE pour REVENDRE, PAS pour rouler) : raisonne MARGE et ROTATION, jamais usage ou confort. Objections typiques : marge insuffisante à la revente, prix d'achat trop haut pour se positionner au-dessus du 1er du net, modèle qui risque de tourner lentement sur son parc, régime de TVA (récupérable vs TVA sur marge), volume et capacité de réassort, état réel et frais de remise en route avant mise en vente, et pour un véhicule importé : conformité (COC), carte grise/immatriculation et délais. L'argumentaire vend de la RENTABILITÉ et de la FLUIDITÉ d'approvisionnement, pas du plaisir de conduite.

DOUBLE USAGE : ces fiches servent à PRÉPARER le commercial en amont ET à être sorties FACE AU CLIENT. Donc la réponse = argumentaire chiffré prêt à étudier ; l'argument clé = la phrase massue, percutante, à dire telle quelle à l'oral.

COUVERTURE DES 10 OBJECTIONS — varie les angles, adapte selon le segment, reste réaliste et concret :
- prix → marge atteignable à la revente (BtoB) / rapport prix-prestations (BtoC)
- modèle ou marque peu connu, image → en BtoB : « est-ce que ça se revend bien, est-ce que ça tourne »
- fiabilité, qualité, état réel + frais de remise en route avant remise en vente (surtout BtoB)
- valeur de revente future / tenue de la cote
- financement → en BtoB : trésorerie, paiement, ligne de financement stock ; en BtoC : mensualité, LOA/LLD, reprise
- après-vente, garantie : QUI la porte une fois le véhicule revendu (BtoB) / pour le client final (BtoC)
- concurrence → en BtoB : autre grossiste, enchères pro, achat direct ; en BtoC : concession locale, autre mandataire, annonce particulier
- confiance : en BtoB, acheter via Autobuyunion (centrale d'achat) ; en BtoC, le client final achète auprès du partenaire revendeur (Autobuyunion reste en sourcing, jamais vendeur du particulier)
- volume / réassort : capacité à fournir plusieurs unités et à réapprovisionner (surtout BtoB)
- véhicule importé : conformité COC, carte grise, délais d'immatriculation
OBLIGATOIRE : au moins UNE objection doit porter sur « pourquoi passer par Autobuyunion plutôt qu'en direct, aux enchères ou chez un autre grossiste » (BtoB) ou « plutôt qu'en concession près de chez moi » (BtoC). Traite frontalement la confiance, la livraison, le lieu de la garantie/SAV et, le cas échéant, le véhicule importé.

INTERDIT : aucune objection ni réponse sur le malus, l'écotaxe, le malus écologique, le malus au poids ou la taxation CO₂ — ce sujet est traité par un outil dédié. N'emploie aucun de ces termes.

NUANCES (présente-les comme POSSIBILITÉS, jamais comme des acquis) :
- Financement / portage au partenaire : possible SOUS CONDITIONS (selon critères), pas systématique ni garanti — évoque-le en option.
- Garantie constructeur : évoque-la SANS durée chiffrée ; la plupart de nos véhicules en bénéficient, mais pas systématiquement — possibilité majoritaire à confirmer, jamais une promesse ferme.

FORMAT DE SORTIE (Markdown épuré, AUCUN JSON, aucune phrase d'introduction, aucun emoji) :
Commence directement par la première objection. Pour CHACUNE des 10 objections, reproduis EXACTEMENT ce bloc :

## N. "<objection telle que dite par le client>"
**Réponse :** <réponse commerciale chiffrée, 2-3 phrases max>
**Argument clé :** <la phrase massue, à dire telle quelle>

N va de 1 à 10. Rien avant le premier « ## », rien après le dernier bloc. Chaque réponse reste courte (2-3 phrases), chaque argument clé tient en une seule phrase.`

export default function Objections() {
  const { t, lang } = useSettings()
  const objRef = useRef(null)
  const [vehicleId, setVehicleId] = useState('')
  const [segment, setSegment] = useState('btoc')
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState(null)
  const [generatedFor, setGeneratedFor] = useState('')
  const { toast } = useToast()
  const { generated } = useGeneratedProducts()
  const { history, add: addHistory, clear: clearHistory } = useHistory('objections')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()
  const headingRef = useResultFocus(!!report && !loading && !streaming)

  const allProducts = [...PRODUCTS, ...generated]
  const selectedProduct = allProducts.find((p) => p.id === vehicleId)
  const vehicleName = selectedProduct?.fullName || vehicleNameOf(details)

  const generate = async () => {
    if (!vehicleName.trim()) return
    saveLastVehicle(vehicleName)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')

    try {
      const seg = SEGMENTS.find((s) => s.id === segment)
      const segLabel = seg ? `${t(seg.labelKey)} — ${t(seg.subKey)}` : segment
      const productContext = selectedProduct
        ? `Prix : ${selectedProduct.prix.base.toLocaleString('fr-FR')}€ – ${selectedProduct.prix.haut.toLocaleString('fr-FR')}€
Origine : ${selectedProduct.origin}
CO₂ : ${selectedProduct.specs.co2_wltp} g/km
Segment : ${selectedProduct.segment}`
        : ''

      const detailsLine = formatVehicleDetails(details)
      const prompt = `Génère exactement 10 objections clients fréquentes pour le ${vehicleName}, segment ${segLabel}.
${detailsLine ? `Détails véhicule : ${detailsLine}. Tiens-en compte pour des objections et réponses PRÉCISES (motorisation, âge, kilométrage, finition).` : ''}
${productContext || ''}`

      let first = true
      const text = await sendMessage([{ role: 'user', content: prompt }], {
        lang, maxTokens: 2000, expert: true, temperature: 0.55,
        tool: 'objections', stream: true, systemStatic: STATIC_OBJECTIONS,
        onChunk: (full) => {
          if (first) { first = false; setLoading(false); setStreaming(true) }
          setReport(full)
        },
      })
      const label = `${vehicleName} · ${segLabel}`
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
    exportReportPdf(report, pdfFileName(vehicleName, t('page_objections_title')), { title: t('page_objections_title'), subtitle: vehicleName })
  )

  const reset = () => { setReport(''); setVehicleId(''); setDetails(EMPTY_DETAILS); setGeneratedFor('') }

  const restore = (item) => {
    setReport(item.report || '')
    setGeneratedFor(item.generatedFor)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Config */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('page_objections_title')}</h2>
        </div>

        <VehicleDetails value={details} onChange={setDetails} />

        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            {t('segment_label')}
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-navy-900/60 rounded-xl border border-navy-700/40">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all active:scale-95 ${
                  segment === s.id
                    ? 'bg-cyan-400 text-navy-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{t(s.labelKey)}</span>
                <span className={`text-[10px] leading-tight ${segment === s.id ? 'text-navy-900/70' : 'text-slate-600'}`}>{t(s.subKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!vehicleName.trim() || loading || streaming}
          className="flex items-center justify-center gap-2 px-5 py-2.5
                     bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                     hover:bg-cyan-300 active:scale-95 transition-all
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          {(loading || streaming) ? <Spinner size="sm" /> : <ShieldCheck size={14} />}
          {(loading || streaming) ? t('generating') : t('generate_obj_btn')}
        </button>
      </div>

      {!loading && !streaming && <ErrorAlert message={error} onRetry={generate} />}

      {loading && !report && (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-slate-400">{t('generating')}</p>
        </div>
      )}

      {(report || streaming) && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-white outline-none">{generatedFor || t('page_objections_title')}</p>
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
                <button onClick={generate}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition">
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

          <div ref={objRef} className="glass-card p-6 md:p-8">
            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
            {streaming && (
              <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
            )}
          </div>
        </>
      )}

      <HistoryPanel items={history} onRestore={restore} onClear={clearHistory} primary={(item) => item.generatedFor} />
    </div>
  )
}
