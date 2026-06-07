import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Search, RotateCcw, ExternalLink, Clock, Download, FileText,
  Wifi, WifiOff, Calculator, Sparkles, ShieldCheck,
} from 'lucide-react'
import { sendMessage } from '@/services/claude'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import { mdToHtml } from '@/utils/mdToHtml'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'

const PW_SESSION = 'abu_pw_filters'
function readPwSession(field, def) {
  try { return JSON.parse(sessionStorage.getItem(PW_SESSION))?.[field] ?? def } catch { return def }
}

// ── Données filtres ────────────────────────────────────────────────────────────
const MAKES = [
  { label: 'Abarth', code: 'ABARTH' }, { label: 'Alfa Romeo', code: 'ALFA ROMEO' },
  { label: 'Audi', code: 'AUDI' }, { label: 'BMW', code: 'BMW' },
  { label: 'Citroën', code: 'CITROEN' }, { label: 'Cupra', code: 'CUPRA' },
  { label: 'Dacia', code: 'DACIA' }, { label: 'DS Automobiles', code: 'DS' },
  { label: 'Fiat', code: 'FIAT' }, { label: 'Ford', code: 'FORD' },
  { label: 'Honda', code: 'HONDA' }, { label: 'Hyundai', code: 'HYUNDAI' },
  { label: 'Jaecoo', code: 'JAECOO' }, { label: 'Jaguar', code: 'JAGUAR' },
  { label: 'Jeep', code: 'JEEP' }, { label: 'Kia', code: 'KIA' },
  { label: 'Land Rover', code: 'LAND ROVER' }, { label: 'Lexus', code: 'LEXUS' },
  { label: 'Mazda', code: 'MAZDA' }, { label: 'Mercedes', code: 'MERCEDES' },
  { label: 'MINI', code: 'MINI' }, { label: 'Mitsubishi', code: 'MITSUBISHI' },
  { label: 'Nissan', code: 'NISSAN' }, { label: 'Omoda', code: 'OMODA' },
  { label: 'Opel', code: 'OPEL' }, { label: 'Peugeot', code: 'PEUGEOT' },
  { label: 'Porsche', code: 'PORSCHE' }, { label: 'Renault', code: 'RENAULT' },
  { label: 'SEAT', code: 'SEAT' }, { label: 'Skoda', code: 'SKODA' },
  { label: 'Smart', code: 'SMART' }, { label: 'Suzuki', code: 'SUZUKI' },
  { label: 'Tesla', code: 'TESLA' }, { label: 'Toyota', code: 'TOYOTA' },
  { label: 'Volkswagen', code: 'VOLKSWAGEN' }, { label: 'Volvo', code: 'VOLVO' },
]

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i)

const COUNTRIES = [
  { code: 'FR', label: 'France',     tva: 1.20, transport: 450, tld: 'fr', as24cy: 'F',  sites: 'La Centrale, LeBonCoin, AutoScout24.fr' },
  { code: 'BE', label: 'Belgique',   tva: 1.21, transport: 450, tld: 'be', as24cy: 'B',  sites: 'AutoScout24.be, 2dehands.be, Vroom.be' },
  { code: 'LU', label: 'Luxembourg', tva: 1.17, transport: 450, tld: 'lu', as24cy: 'L',  sites: 'AutoScout24.lu, Luxauto.lu' },
  { code: 'DE', label: 'Allemagne',  tva: 1.19, transport: 450, tld: 'de', as24cy: 'D',  sites: 'mobile.de, AutoScout24.de' },
  { code: 'NL', label: 'Pays-Bas',   tva: 1.21, transport: 450, tld: 'nl', as24cy: 'NL', sites: 'AutoScout24.nl, Marktplaats.nl' },
  { code: 'ES', label: 'Espagne',    tva: 1.21, transport: 450, tld: 'es', as24cy: 'E',  sites: 'AutoScout24.es, Coches.net' },
  { code: 'IT', label: 'Italie',     tva: 1.22, transport: 450, tld: 'it', as24cy: 'I',  sites: 'AutoScout24.it, Subito.it' },
  { code: 'PT', label: 'Portugal',   tva: 1.23, transport: 450, tld: 'pt', as24cy: 'P',  sites: 'AutoScout24.pt, CustoJusto.pt' },
]

const AS24_FUEL = { ES: '1', GO: '2', GP: '3', EL: '6', HY: '8', GH: '10' }
function buildAs24Url(ctry, filters) {
  const makeSlug = (filters.make || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const modelSlug = (filters.model || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const p = ['atype=C', `cy=${ctry.as24cy}`, 'damaged_listing=exclude', 'sort=standard', 'ustate=N%2CU']
  if (filters.yearMin)    p.push(`fregfrom=${filters.yearMin}`)
  if (filters.yearMax)    p.push(`fregto=${filters.yearMax}`)
  if (filters.mileageMin) p.push(`kmfrom=${filters.mileageMin}`)
  if (filters.mileageMax) p.push(`kmto=${filters.mileageMax}`)
  if (filters.fuel && AS24_FUEL[filters.fuel]) p.push(`fuel=${AS24_FUEL[filters.fuel]}`)
  const base = makeSlug ? `https://www.autoscout24.${ctry.tld}/lst/${makeSlug}${modelSlug ? '/' + modelSlug : ''}` : `https://www.autoscout24.${ctry.tld}/`
  return `${base}?${p.join('&')}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchSources(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

// Construit le prompt de l'analyse streamée (rapport Markdown, pas de JSON).
// UNE SEULE passe : relevé d'annonces → grille de prix par kilométrage → prix
// d'achat → auto-vérification finale intégrée (plus de 2e passe garde-fou).
function buildPrompt(filters, vehicleDesc, ctry) {
  const { code: countryCode, label: countryLabel, tva, transport, sites } = ctry
  const isFrance = countryCode === 'FR'
  const tvaFmt = tva.toFixed(2).replace('.', ',')
  const tvaRate = Math.round((tva - 1) * 100)

  const kmMin = filters.mileageMin ? Number(filters.mileageMin) : null
  const kmMax = filters.mileageMax ? Number(filters.mileageMax) : null
  const kmMinTxt = kmMin ? `${kmMin.toLocaleString('fr-FR')} km` : null
  const kmMaxTxt = kmMax ? `${kmMax.toLocaleString('fr-FR')} km` : null
  const finitionFilter = filters.finition
    ? `\n⚠️ FINITION STRICTE : analyse UNIQUEMENT la version "${filters.finition}".` : ''
  const carrosserieFilter = filters.carrosserieLabel
    ? `\n⚠️ CARROSSERIE STRICTE : uniquement le type "${filters.carrosserieLabel}".` : ''
  const fuelFilter = filters.fuelLabel
    ? `\n⚠️ CARBURANT STRICT : uniquement la motorisation "${filters.fuelLabel}". N'inclus AUCUNE autre énergie (ne mélange pas essence, diesel, hybride simple/micro-hybride, hybride rechargeable ou électrique). Un hybride non rechargeable n'est PAS un PHEV : aucune mention de prise, recharge, batterie plug-in ou autonomie 100 % électrique.` : ''
  const gearboxFilter = filters.gearboxLabel
    ? `\n⚠️ BOÎTE STRICTE : uniquement la boîte "${filters.gearboxLabel}".` : ''
  const kmFilter = (kmMin || kmMax)
    ? `\n⚠️ KILOMÉTRAGE STRICT : raisonne UNIQUEMENT sur des compteurs réels ${
        kmMin && kmMax ? `entre ${kmMinTxt} et ${kmMaxTxt}`
        : kmMin ? `≥ ${kmMinTxt}` : `≤ ${kmMaxTxt}`
      }. Écarte toute annonce hors plage (notamment les quasi-neufs sous le plancher km, qui ne sont PAS le « 1er du net »).` : ''
  const anneeTxt = filters.yearMin && filters.yearMax
    ? (filters.yearMin === filters.yearMax ? `millésime ${filters.yearMin}` : `millésimes ${filters.yearMin} à ${filters.yearMax}`)
    : filters.yearMin ? `millésime ${filters.yearMin} ou plus récent`
    : filters.yearMax ? `millésime ${filters.yearMax} ou plus ancien` : null
  const anneeFilter = anneeTxt
    ? `\n⚠️ ANNÉE STRICTE : ${anneeTxt} uniquement. N'écris JAMAIS une autre année.` : ''
  const countryCtx = isFrance ? '' : `\nMARCHÉ : ${countryLabel} — relève les annonces sur ${sites}, prix en euros TTC (TVA locale ${tvaRate} %). Précise que les prix relevés sont ceux du marché ${countryLabel}.`

  return `Tu es l'analyste cote & marché automobile ${filters.type === 'vn' ? 'VN (neuf)' : 'VO (occasion)'} d'Autobuyunion, centrale d'achat européenne. En UNE SEULE passe : tu relèves les annonces réelles, tu construis une grille de prix par kilométrage, tu calcules les prix d'achat, PUIS tu te relis selon une check-list stricte avant de répondre. Rendu final en Markdown épuré, prêt à afficher.

═══ VÉHICULE CIBLE ═══
"${vehicleDesc}"${finitionFilter}${carrosserieFilter}${fuelFilter}${gearboxFilter}${kmFilter}${anneeFilter}${countryCtx}

═══ RECHERCHE WEB (obligatoire) ═══
Utilise la recherche web (2 à 3 requêtes) pour relever les annonces réelles correspondant EXACTEMENT aux filtres (kilométrage inclus) sur ${sites}, et repérer le niveau des « premiers du net » (annonces les moins chères réellement disponibles) PAR niveau de kilométrage. Si une vérification ultérieure révèle un prix incohérent, relance une requête ciblée pour réancrer — ne corrige jamais un prix au doigt mouillé. Si les annonces restent trop rares ou incohérentes, appuie-toi sur la décote experte (PVC neuf − décote réaliste) et signale l'incertitude.

═══ PHILOSOPHIE ═══
L'objectif est de GÉNÉRER DE LA MARGE, jamais de brader. On se positionne PARMI LES PREMIERS DU NET (offre attractive qui vend bien) et, ponctuellement seulement, légèrement en dessous pour accélérer — sans casser les prix.

═══ GARDE-FOUS RÉALISME & COHÉRENCE (à vérifier AVANT de fixer le moindre prix) ═══
- DÉCOTE OBLIGATOIRE : une occasion ne vaut JAMAIS le prix du neuf. Décote d'au moins 10–15 % dès la sortie de concession, 15–35 % la 1re année sur un modèle de grande diffusion. Tout prix d'occasion ≥ 90 % du PVC catalogue neuf est ABERRANT (quasi-neuf surcoté, erreur de finition/génération ou mauvaise saisie) : écarte-le, ne l'utilise JAMAIS comme 1er du net.
- DÉCOTE vs NEUF RÉELLEMENT REMISÉ (impératif) : ne compare pas qu'au catalogue. Le vrai plafond de ta revente, c'est le prix du NEUF réellement pratiqué (remises mandataires), souvent très inférieur au catalogue. Si des véhicules NEUFS (0–10 km) de même finition se vendent à un niveau proche de ta revente VO, ta revente est TROP HAUTE : un VO récent doit rester nettement sous le neuf remisé. Réancre.
- ANCRAGE SUR LE CLUSTER, PAS UNE ANNONCE ISOLÉE : le cluster = la zone de prix où se regroupe le gros des annonces comparables. Écarte comme OUTLIERS toute annonce nettement isolée SOUS le peloton (≈ > 15 % sous le cluster : erreur, accidenté, version inférieure) ET nettement AU-DESSUS (quasi-neuf surcoté, finition supérieure). Le 1er du net retenu = la moins chère DU CLUSTER à un niveau de km donné.
- NE PAS RÉTROGRADER UNE ANNONCE BASSE CONFORME (impératif — c'est l'erreur la plus coûteuse) : une annonce CONFORME aux filtres, plausible et seulement un peu moins chère que le peloton N'EST PAS un outlier — c'est PRÉCISÉMENT le 1er du net : RETIENS-la comme ancrage. N'invente JAMAIS une « erreur de saisie », une « finition inférieure » ou un « à vérifier » pour l'écarter ou la repousser dans une autre tranche SANS preuve explicite (accident, autre génération/version avérée). Ce réflexe gonfle artificiellement l'ancrage, le cœur de marché et toute la cotation : il est INTERDIT. En cas de doute sur une annonce basse mais crédible, on la CONSERVE comme 1er du net.
- PVC CATALOGUE RÉALISTE : ancre le prix catalogue neuf sur la source officielle la PLUS BASSE crédible (configurateur constructeur, finition exacte), jamais sur une estimation haute. Un PVC surévalué fausse toute la décote. En cas d'incertitude, retiens la fourchette basse et signale-la comme estimation.
- GÉNÉRATIONS : en cas de changement de génération récent, ne confonds pas le catalogue neuf de la NOUVELLE génération avec les OCCASIONS de la précédente réellement présentes. Reste sur la génération effectivement disponible en occasion aux filtres demandés (le badge de motorisation/puissance est souvent le marqueur de génération : respecte-le).
- BRUIT DE PRIX : sur un modèle récent, le prix dépend autant du type de vendeur et des options que du kilométrage. Ancre-toi sur le BAS du cluster de chaque tranche, ne surinterprète pas une annonce surcotée.

═══ MÉTHODE DE COTATION — GRILLE PAR KILOMÉTRAGE ═══
Tu produis une GRILLE À 3 TRANCHES DE KILOMÉTRAGE, construite sur la distribution RÉELLE des annonces (pas des paliers arbitraires) :
- Tranche FORT km : haut de la plage réellement disponible → revente la PLUS BASSE.
- Tranche CŒUR DE MARCHÉ : la tranche la PLUS REPRÉSENTÉE (le plus grand nombre d'annonces) → c'est l'ANCRAGE de la cotation.
- Tranche FAIBLE km : bas de la plage → revente la PLUS HAUTE.
Pour chaque tranche, indique : le nombre d'annonces comparables, le km moyen représentatif, le 1er du net TTC, le prix d'achat pro HT.

Pour CHAQUE tranche :
1. 1ER DU NET = annonce la moins chère DU CLUSTER à ce niveau de km (cf. garde-fous).
2. REVENTE CONSEILLÉE TTC = au niveau du 1er du net (option ponctuelle : légèrement en dessous pour vendre vite) — jamais brader. C'est cette valeur qui alimente la formule.
3. PRIX D'ACHAT PRO HT — déduit directement du 1er du net, marge plancher 3 000 € HT incluse.
   FORMULE (applique-la telle quelle) :
     achat pro HT = (revente 1er du net TTC ÷ ${tvaFmt}) − ${transport} − 3 000.
   N'invente JAMAIS un prix d'achat plus bas pour gonfler la marge : le prix conseillé sécurise pile 3 000 € de marge tout en restant parmi les premiers du net. Ne déduis JAMAIS de marge groupe de cette cascade.

ÉCART ENTRE TRANCHES — PILOTÉ PAR LE KILOMÉTRAGE (PAS de constante) :
- L'écart de prix entre deux tranches doit être COHÉRENT avec l'écart de km : compte ~100 à 150 € HT par tranche de 1 000 km d'écart.
- L'écart total n'est PAS plafonné : sur une plage large (ex. 0–50 000 km) il atteint normalement plusieurs milliers d'euros HT ; sur une plage étroite (véhicule récent) il est faible — c'est normal.
- MONOTONIE OBLIGATOIRE : plus de km = revente plus basse = achat plus bas. Toute tranche qui rompt la monotonie (moins chère à km plus faible, ou écart aberrant entre deux tranches proches) est une ERREUR : corrige.
- N'IMPOSE JAMAIS un écart fixe de 1 000 € HT.

EXEMPLE DE STRUCTURE (méthode et mise en forme à reproduire — les valeurs ci-dessous sont des PLACEHOLDERS génériques, ne les recopie JAMAIS) :
- N1 annonces · tranche FORT km · revente la PLUS BASSE · achat le PLUS BAS
- N2 annonces · tranche CŒUR DE MARCHÉ · revente intermédiaire · achat intermédiaire  ← ancrage
- N3 annonces · tranche FAIBLE km · revente la PLUS HAUTE · achat le PLUS HAUT
(N1/N2/N3, les kilométrages, les reventes et les achats sont FICTIFS : remplace-les TOUS par les comptes, kilométrages et prix RÉELS issus de ta recherche. Respecte la monotonie et l'écart ~100–150 € HT / 1 000 km.)

POUR AUGMENTER LA MARGE (conseil, jamais en bradant) : négocier l'achat un peu plus bas, ou positionner la revente un peu plus haut (toujours parmi les premiers du net). Chaque euro gagné s'ajoute aux 3 000 €. Mais le prix d'achat AFFICHÉ reste celui de la formule, ancré sur le 1er du net réel.
Ne déconseille jamais le fort km : il fait simplement baisser le prix d'achat cible tout en préservant la marge et en offrant un TTC plus compétitif au client final.

═══ AUTO-VÉRIFICATION FINALE (relis-toi AVANT de répondre) ═══
1. Formule : recalcule chaque tranche, (revente ÷ ${tvaFmt}) − ${transport} − 3 000 ; si un achat affiché ne correspond pas, corrige.
2. Marge : 3 000 € HT sécurisés à chaque tranche, jamais en dessous.
3. Monotonie : km ↗ ⇒ prix ↘ sur les 3 tranches ; écart cohérent (~100–150 € HT / 1 000 km) ; aucun écart fixe imposé.
4. Décote : aucune revente ≥ 90 % du catalogue ; revente nettement sous le neuf remisé. Sinon, RELANCE une recherche et réancre.
5. Plafond achat : ≤ ~75 % du PVC catalogue neuf.
6. Filtres stricts : millésime, kilométrage, finition, motorisation exacte, carrosserie, boîte — aucune donnée hors filtre.
7. Mots interdits : aucun « malus », « émissions CO2 », « écotaxe », « malus écologique », « malus au poids ».
8. Rotation : aucun délai de rotation (donnée inconnue).
9. Anonymat : aucun nom de réseau, mandataire, enseigne, concession, label, ni ville précise.
10. Forme : aucun emoji ni symbole décoratif ; sections en « ## » dans l'ordre exact ; commence directement par « ## L'essentiel ».
11. Comptes d'annonces : la colonne « Annonces » provient UNIQUEMENT de ta recherche réelle, JAMAIS de l'exemple du prompt. Si tu ne peux pas établir un comptage fiable sur une tranche, inscris « échantillon limité » au lieu d'un nombre. N'affiche jamais des comptes recopiés depuis ce prompt (ils sont fictifs).
Si un contrôle de PRIX échoue, ne devine pas : relance une requête ciblée puis recalcule. Les contrôles de forme/filtre, corrige-les directement.

═══ RÈGLES DE RÉDACTION ═══
- Vouvoiement, ton mesuré et professionnel, pas d'avis tranché.
- Ne cite JAMAIS de nom de réseau/mandataire/enseigne/concession/label ni de ville précise (tu les inventerais).
- Chiffres réalistes en €, fourchettes si incertain ; jamais de chiffre inventé donné comme certain.
- Style sobre et haut de gamme, phrases claires et aérées. AUCUN emoji, aucune icône, aucun symbole décoratif.

═══ FORMAT DE SORTIE (Markdown, ordre EXACT, titres en ## sans emoji) ═══

## L'essentiel
- **Prix d'achat pro conseillé** : … – … € HT (selon le kilométrage, marge 3 000 € HT incluse)
- **Revente conseillée (1er du net)** : … – … € TTC
- **Tranche de référence** : la plus représentée — … annonces à ~… km
- **Marge sécurisée** : 3 000 € HT par véhicule (davantage en négociant l'achat plus bas ou la revente plus haut)

## Grille de prix par kilométrage
Tableau Markdown, une ligne par tranche, de fort km à faible km :
| Kilométrage (moyen) | Annonces | 1er du net TTC | Prix d'achat pro HT |
Sous le tableau, précise que le transport (${transport} € HT) et la marge plancher (3 000 € HT) sont déjà intégrés dans le prix d'achat. Les comptes de la colonne « Annonces » doivent refléter ta recherche réelle ; à défaut, indique « échantillon limité ».

## Repères marché
Tableau Markdown : Prix moyen | Prix médian | Fourchette courante | Nb annonces estimé (tous en TTC).

## Cotation & décote
PVC neuf catalogue, prix neuf réellement remisé (mandataires), décote vs catalogue ET vs neuf remisé, valeur résiduelle indicative. Si le modèle est trop récent pour une cote fiable, dis-le. N'inclus AUCUNE ligne sur les émissions CO2, l'écotaxe, le malus écologique ou le malus au poids.

## Stratégie de vente "1er du net"
Prix exact conseillé TTC (par tranche si pertinent), écart vs moyenne marché, argument face aux concurrents en ligne. NE DONNE PAS de délai de rotation.

## Arguments commerciaux
3 puces fortes avec chiffres.

## Points de vigilance
3 puces. Aucune mention de malus, émissions CO2, écotaxe ni malus au poids.

INTERDICTION ABSOLUE : n'écris JAMAIS « malus », « émissions CO2 », « écotaxe », « malus écologique » ni « malus au poids » nulle part — aucun chiffre, aucune ligne, aucune sous-section. Un bouton dédié renvoie déjà vers le calculateur de malus. Commence directement par « ## L'essentiel », sans aucune phrase d'introduction.`
}

// ── Composants UI ─────────────────────────────────────────────────────────────
const selectClass = `w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
  text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition`

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PriceWatch() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const resultRef = useRef(null)

  const FUELS = [
    { label: t('price_fuel_all'), code: '' },
    { label: t('price_fuel_petrol'), code: 'ES' },
    { label: t('price_fuel_diesel'), code: 'GO' },
    { label: t('price_fuel_electric'), code: 'EL' },
    { label: t('price_fuel_hybrid'), code: 'HY' },
    { label: t('price_fuel_phev'), code: 'GH' },
    { label: t('price_fuel_lpg'), code: 'GP' },
  ]

  const GEARBOXES = [
    { label: t('price_gearbox_all'), code: '' },
    { label: t('price_gearbox_manual'), code: 'M' },
    { label: t('price_gearbox_auto'), code: 'A' },
  ]

  const BODIES = [
    { label: t('price_body_all'), code: '' },
    { label: t('price_body_berline'), code: 'berline' },
    { label: t('price_body_break'), code: 'break' },
    { label: t('price_body_suv'), code: 'suvcrossover' },
    { label: t('price_body_coupe'), code: 'coupe' },
    { label: t('price_body_cabriolet'), code: 'cabriolet' },
    { label: t('price_body_monospace'), code: 'monospace' },
    { label: t('price_body_citadine'), code: 'citadine' },
    { label: t('price_body_pickup'), code: 'pickup' },
  ]

  const MILEAGE_MIN_OPTS = [
    { label: t('km_min'), value: '' },
    { label: '≥ 500 km', value: '500' },
    { label: '≥ 5 000 km', value: '5000' },
    { label: '≥ 10 000 km', value: '10000' },
    { label: '≥ 20 000 km', value: '20000' },
    { label: '≥ 30 000 km', value: '30000' },
    { label: '≥ 50 000 km', value: '50000' },
  ]
  const MILEAGE_MAX_OPTS = [
    { label: t('km_max'), value: '' },
    { label: '< 10 000 km', value: '10000' },
    { label: '< 20 000 km', value: '20000' },
    { label: '< 30 000 km', value: '30000' },
    { label: '< 50 000 km', value: '50000' },
    { label: '< 80 000 km', value: '80000' },
    { label: '< 100 000 km', value: '100000' },
    { label: '< 150 000 km', value: '150000' },
    { label: '< 200 000 km', value: '200000' },
  ]

  const [type, setType]           = useState(() => readPwSession('type', 'vo'))
  const [make, setMake]           = useState(() => readPwSession('make', ''))
  const [model, setModel]         = useState(() => readPwSession('model', ''))
  const [finition, setFinition]   = useState(() => readPwSession('finition', ''))
  const [carrosserie, setCarrosserie] = useState(() => readPwSession('carrosserie', ''))
  const [yearMin, setYearMin]     = useState(() => readPwSession('yearMin', ''))
  const [yearMax, setYearMax]     = useState(() => readPwSession('yearMax', ''))
  const [mileageMin, setMileageMin] = useState(() => readPwSession('mileageMin', ''))
  const [mileageMax, setMileageMax] = useState(() => readPwSession('mileageMax', ''))
  const [fuel, setFuel]           = useState(() => readPwSession('fuel', ''))
  const [gearbox, setGearbox]     = useState(() => readPwSession('gearbox', ''))
  const [country, setCountry]     = useState(() => readPwSession('country', 'FR'))

  const [loading, setLoading]     = useState(false)   // avant le 1er token
  const [streaming, setStreaming] = useState(false)   // tokens en cours d'arrivée
  const [report, setReport]       = useState('')      // texte Markdown streamé
  const [hasLiveData, setHasLiveData] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [sources, setSources]     = useState([])
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const { history, add: addHistory, clear: clearHistory } = useHistory('pricewatch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()

  // Persist filter state across page navigations (session-scoped)
  useEffect(() => {
    try {
      sessionStorage.setItem(PW_SESSION, JSON.stringify(
        { type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, country }
      ))
    } catch {}
  }, [type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, country])

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    const rawMake = overrides.make ?? make
    const matchedMake = MAKES.find(m => m.label.toLowerCase() === rawMake.toLowerCase())
    const resolvedMake = matchedMake ? matchedMake.code : rawMake
    const filters = { make: resolvedMake, model, finition, carrosserie, type, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, ...overrides }
    // Libellés lisibles des filtres énumérés, pour que l'analyse les applique en STRICT.
    filters.fuelLabel        = filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label || '' : ''
    filters.gearboxLabel     = filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label || '' : ''
    filters.carrosserieLabel = filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label || '' : ''
    const ctry = COUNTRIES.find(c => c.code === (overrides.country ?? country)) ?? COUNTRIES[0]

    const vehicleDesc = [
      rawMake, filters.model, filters.finition,
      filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
        : filters.yearMin ? `depuis ${filters.yearMin}` : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
      (filters.mileageMin || filters.mileageMax)
        ? filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
        : '',
      filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label : '',
      filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label : '',
      filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label : '',
    ].filter(Boolean).join(' · ')

    const label = [
      filters.make, filters.model, filters.finition,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      (filters.mileageMin || filters.mileageMax) && (
        filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
      ),
      ctry.label,
    ].filter(Boolean).join(' · ')

    saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
    setSearchLabel(label)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')
    setHasLiveData(false)

    try {
      // Liens de référence — for non-France markets, use AutoScout24 country URL.
      if (ctry.code === 'FR') {
        const meta = await fetchSources(filters)
        setFetchedAt(meta.fetchedAt)
        setCentraleUrl(meta.centraleUrl || '')
        setSources(meta.sources || [])
      } else {
        const as24Url = buildAs24Url(ctry, filters)
        const q = encodeURIComponent([filters.make, filters.model].filter(Boolean).join(' '))
        const SECONDARY = {
          DE: { name: 'mobile.de', url: `https://suchen.mobile.de/auto/search.html?makeModelVariant1.makeName=${encodeURIComponent(filters.make || '')}&makeModelVariant1.searchText=${encodeURIComponent(filters.model || '')}` },
          BE: { name: '2dehands.be', url: `https://www.2dehands.be/q/${q}/` },
          NL: { name: 'Marktplaats.nl', url: `https://www.marktplaats.nl/q/${q}/` },
          IT: { name: 'Subito.it', url: `https://www.subito.it/annunci-italia/vendita/usato/auto/?q=${q}` },
          ES: { name: 'Coches.net', url: `https://www.coches.net/segunda-mano/?q=${q}` },
          PT: { name: 'CustoJusto.pt', url: `https://www.custojusto.pt/portugal/carros-e-motos/carros/?q=${q}` },
          LU: { name: 'Luxauto.lu', url: 'https://www.luxauto.lu/' },
        }
        setFetchedAt(new Date().toISOString())
        setCentraleUrl(as24Url)
        setSources([
          { name: `AutoScout24 ${ctry.label}`, url: as24Url },
          ...(SECONDARY[ctry.code] ? [SECONDARY[ctry.code]] : []),
        ])
      }

      // Analyse streamée en direct (comme le chat) — le texte s'affiche au fil
      // de l'eau dès le 1er token reçu. Passe UNIQUE : la grille de prix et
      // l'auto-vérification sont intégrées au prompt (plus de 2e passe).
      let first = true
      const { text, usedWebSearch } = await sendMessage(
        [{ role: 'user', content: buildPrompt(filters, vehicleDesc, ctry) }],
        {
          lang, expert: true, temperature: 0, tool: 'veilleprix',
          webSearch: true, maxSearches: 3, maxTokens: 4500,
          returnMeta: true, stream: true,
          onChunk: (full) => {
            if (first) { first = false; setLoading(false); setStreaming(true) }
            setReport(full)
          },
        }
      )
      setReport(text)
      setHasLiveData(!!usedWebSearch)
      setStreaming(false)

      saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
      addHistory({ searchLabel: label, country: ctry.code, type: filters.type, report: text, hasLiveData: !!usedWebSearch, fetchedAt: new Date().toISOString(), sources: [], centraleUrl: '' })
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const handlePdf = () => withExporting(() =>
    exportReportPdf(report, pdfFileName(searchLabel, t('tool_price_title')), { title: t('tool_price_title'), subtitle: searchLabel })
  )

  const reset = () => {
    setReport(''); setMake(''); setModel(''); setFinition(''); setCarrosserie('')
    setYearMin(''); setYearMax(''); setMileageMin(''); setMileageMax(''); setFuel(''); setGearbox('')
    setCountry('FR')
    setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null); setSources([]); setHasLiveData(false)
  }

  const restore = (item) => {
    setReport(item.report || '')
    setSearchLabel(item.searchLabel)
    setType(item.type)
    setCountry(item.country || 'FR')
    setHasLiveData(!!item.hasLiveData)
    setFetchedAt(item.fetchedAt || null)
    setSources(item.sources || [])
    setCentraleUrl(item.centraleUrl || '')
  }

  const showResult = (loading || streaming || report) && !error

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('tool_price_title')}</h2>
        </div>

        {/* VO / VN toggle */}
        <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit mb-4 border border-navy-700/40">
          {[{ id: 'vo', label: t('used_vehicle') }, { id: 'vn', label: t('new_vehicle') }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setType(tab.id); if (tab.id === 'vn') setMileageMax('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                type === tab.id ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ligne 1 : Marque + Modèle + Année min + Année max */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('make_label')}</label>
            <input
              type="text" value={make} onChange={e => setMake(e.target.value)}
              list="makes-list" placeholder={t('make_ph')} aria-label={t('make_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
            <datalist id="makes-list">
              {MAKES.map(m => <option key={m.code} value={m.label} />)}
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('model_label')}</label>
            <input
              type="text" value={model} onChange={e => setModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_model_ph')} aria-label={t('model_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>

          <FilterSelect label={t('year_min')} value={yearMin} onChange={setYearMin}>
            <option value="">{t('year_min')}</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>

          <FilterSelect label={t('year_max')} value={yearMax} onChange={setYearMax}>
            <option value="">{t('year_max')}</option>
            {YEARS.filter(y => !yearMin || y >= Number(yearMin)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>
        </div>

        {/* Ligne 1b : Finition + Carrosserie + Marché */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('price_finition_label')}</label>
            <input
              type="text" value={finition} onChange={e => setFinition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_finition_ph')} aria-label={t('price_finition_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>
          <FilterSelect label={t('price_body_label')} value={carrosserie} onChange={setCarrosserie}>
            {BODIES.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('price_country_label')} value={country} onChange={setCountry}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </FilterSelect>
        </div>

        {/* Ligne 2 : Km min + Km max (VO only) + Carburant + Boîte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {type === 'vo' && (
            <FilterSelect label={t('km_min')} value={mileageMin} onChange={setMileageMin}>
              {MILEAGE_MIN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          {type === 'vo' && (
            <FilterSelect label={t('km_max')} value={mileageMax} onChange={setMileageMax}>
              {MILEAGE_MAX_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          <FilterSelect label={t('fuel_label')} value={fuel} onChange={setFuel}>
            {FUELS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('gearbox_label')} value={gearbox} onChange={setGearbox}>
            {GEARBOXES.map(g => <option key={g.code} value={g.code}>{g.label}</option>)}
          </FilterSelect>
        </div>

        {/* Bouton */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => search()} disabled={!canSearch || loading || streaming}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {(loading || streaming) ? <Spinner size="sm" /> : <Search size={14} />}
            {(loading || streaming) ? t('analyzing') : t('analyze_btn')}
          </button>

          {centraleUrl && !loading && !streaming && (
            <a href={centraleUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                         px-3 py-2.5 rounded-xl hover:text-cyan-400 hover:border-cyan-400/30 transition">
              <ExternalLink size={12} />
              {country === 'FR' ? t('price_see_listing') : `AutoScout24 ${COUNTRIES.find(c => c.code === country)?.label}`}
            </a>
          )}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && <ErrorAlert message={error} onRetry={() => search()} />}

      {/* ── Résultat streamé ─────────────────────────────────────────────────── */}
      {showResult && (
        <>
          {/* Header + actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{searchLabel || t('tool_price_title')}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
                }`}>{type === 'vo' ? t('used_vehicle') : t('new_vehicle')}</span>

                {streaming ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 animate-pulse">
                    <Sparkles size={9} /> {t('price_live_refreshing')}
                  </span>
                ) : report ? (
                  <>
                    {hasLiveData ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                        <Wifi size={9} /> {t('price_live_badge')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                        <WifiOff size={9} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      <ShieldCheck size={9} /> {t('price_guardrail_done')}
                    </span>
                  </>
                ) : null}

                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {report && !streaming && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
                <button onClick={handlePdf} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={() => search()}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                             px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition flex-shrink-0">
                  <Search size={12} /> {t('analyze_btn')}
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30 flex-shrink-0">
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          {/* Loading avant 1er token */}
          {loading && !report && (
            <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
              <Spinner />
              <p className="text-sm text-slate-400">{t('price_step_calculating')}</p>
              <p className="text-xs text-slate-600">{t('price_step_collecting')}</p>
            </div>
          )}

          {/* Rapport Markdown streamé */}
          {report && (
            <div ref={resultRef} className="space-y-3">
              <div className="glass-card p-6 md:p-8">
                <div className="report-md text-slate-200"
                     dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
                {streaming && (
                  <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
                )}
              </div>

              {/* Malus — lien centré vers le calculateur */}
              {!streaming && (
                <div className="glass-card p-4 flex justify-center">
                  <Link to="/co2-malus"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warn/10 border border-warn/30
                               text-sm font-bold text-warn hover:bg-warn/20 active:scale-95 transition-all">
                    <Calculator size={15} /> {t('price_malus_calc_link')}
                  </Link>
                </div>
              )}

              {/* Sources */}
              {!streaming && (sources.length > 0 || centraleUrl) && (
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">{t('sources_consulted')}</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map(s => (
                      <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 bg-navy-700/40 border border-navy-600/30
                                   px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                        {s.name} <ExternalLink size={10} />
                      </a>
                    ))}
                    {!hasLiveData && (
                      <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-400/5 border border-violet-400/20 px-2.5 py-1 rounded-lg">
                        <WifiOff size={10} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!showResult && !error && (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('select_brand_model')}</p>
          <p className="text-xs text-slate-600">{t('refine_filters')}</p>
        </div>
      )}

      <HistoryPanel
        items={history}
        onRestore={restore}
        onClear={clearHistory}
        primary={(item) => item.searchLabel}
        badge={(item) => (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
            item.type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
          }`}>{item.type?.toUpperCase()}</span>
        )}
      />
    </div>
  )
}
