import { sendMessage, extractJSON } from './claude'

// ════════════════════════════════════════════════════════════════════════════
// ANALYSE DE STOCK PARTENAIRE — prompt système (bloc statique, mis en cache)
// ════════════════════════════════════════════════════════════════════════════
// L'IA n'effectue JAMAIS l'arithmétique : toutes les statistiques sont
// pré-calculées en JS (src/utils/stockStats.js) et reprises telles quelles.
const STATIC_STOCK = `Tu es un analyste expert du marché automobile français (VN/VO), spécialisé dans l'optimisation de stock et le pricing pour les professionnels (concessions, mandataires, agents). Tu produis un diagnostic de stock actionnable destiné à un partenaire revendeur d'Autobuyunion.

DONNÉES FOURNIES : un stock de véhicules d'occasion sous forme de liste structurée (une entrée par véhicule : marque, modèle, finition, année, kilométrage, énergie, boîte, prix TTC, et le positionnement prix de la place de marché quand il est disponible — « Très bonne affaire » / « Bonne affaire » / « Offre équitable » / « Au dessus du marché »). Des statistiques agrégées PRÉ-CALCULÉES sont aussi fournies (répartition par marque, par énergie, par tranche de prix, par positionnement ; prix moyen ; valeur totale ; modèles sur-représentés ; véhicules au km le plus élevé).

RÈGLES :
- UTILISE les statistiques fournies pour tout chiffre. Ne recalcule pas, n'invente aucun nombre.
- Base chaque constat UNIQUEMENT sur les données fournies. N'invente jamais de cote Argus, de prix concurrent, de date de mise en stock ni de marge si l'information n'est pas dans les données.
- ROTATION : si la date d'entrée en stock est fournie (statistiques ageStats), base la rotation sur l'ancienneté RÉELLE en jours et signale nommément les véhicules > 60 j et > 90 j. Si elle est absente, dis-le explicitement et précise que la rotation est ESTIMÉE à partir du kilométrage, du millésime et du positionnement de la place de marché.
- MARGE : si le prix d'achat est fourni (statistiques marginStats), commente la marge théorique et signale les marges faibles ou négatives. Sinon, n'évoque aucune marge chiffrée.
- COTE : si une cote est fournie (coteGap), chiffre l'écart prix/cote en € et en %. Sinon, ne l'invente pas.
- Sois concis, expert et chiffré. Pas de remplissage. Chaque recommandation doit être concrète : quel véhicule ou quelle catégorie, quelle action, quel ordre de grandeur en €.
- Emploie le vocabulaire métier : VO récent, quasi-neuf / 0 km / pré-immatriculé, décote, valeur résiduelle, rotation, ancienneté, immobilisation de stock, cote, ZFE / Crit'Air, LLD / LOA, TCO, malus, WLTP.
- Reste factuel : tu fais un constat d'aide à la décision, pas une promesse de résultat. Tu n'es pas conseiller financier.

STRUCTURE DE SORTIE (respecte exactement cet ordre, en français, en Markdown, titres en ## sans emoji) :

## Lecture rapide
2 à 3 phrases sur le positionnement du stock (segment dominant, fourchette de prix, profil d'énergie, type de sourcing probable).

## Synthèse chiffrée
Répartition par marque, par énergie, par tranche de prix et par positionnement prix ; prix moyen et valeur de stock. Reprends les statistiques fournies (tableaux Markdown bienvenus).

## Axe 1 — Compétitivité prix
Quels véhicules / segments n'ont aucun avantage prix (au prix du marché ou au-dessus), lesquels sont bien placés. Signale les incohérences internes (deux finitions différentes au même prix ; finition inférieure pricée comme la supérieure).

## Axe 2 — Sur-concentration & rotation
Modèles sur-représentés (risque d'immobilisation et de cannibalisation entre annonces), grappes de véhicules quasi-identiques, et pricing plat qui ignore le kilométrage (bas-km sous-cotés, hauts-km sur-cotés en relatif).

## Axe 3 — Trous d'offre
Segments / énergies / carrosseries / tranches de prix absents au regard de la demande (ex. absence d'électrique alors que la clientèle est exposée à une ZFE ; absence d'entrée de gamme ; gros tickets isolés ; absence de break / familiale).

## Axe 4 — Décote & véhicules à repricer
Liste NOMINATIVE des véhicules prioritaires à repricer ou déstocker (modèle + finition + km + prix actuel → action et ordre de grandeur du repricing en €). Cible en priorité : positionnement « Au dessus du marché », kilométrages élevés au prix de véhicules plus frais, et bas-km sous-cotés.

## Points forts
Ce qui fonctionne et doit tourner (segments bien pricés, qualité du sourcing, arguments commerciaux sous-exploités, ex. GPL compatible Crit'Air 1).

Termine par UNE ligne sur les données : si l'ancienneté, le prix d'achat ou la cote manquent, rappelle qu'ils permettraient de chiffrer l'ancienneté réelle, la marge et l'écart à la cote ; s'ils sont déjà présents, ne les redemande pas.

Commence directement par « ## Lecture rapide », sans phrase d'introduction.`

// ════════════════════════════════════════════════════════════════════════════
// SCRAPING WEB — extraction du stock via web_search (même mécanisme que
// Veille Prix — contourne les blocages anti-bot des proxies serveur).
// ════════════════════════════════════════════════════════════════════════════
const SCRAPE_SYSTEM = `Tu es un extracteur de données automobiles. On te donne l'URL d'un showroom concessionnaire (La Centrale Pro ou similaire). Tu DOIS utiliser web_search pour visiter cette URL et retourner UNIQUEMENT les données extraites. Format de sortie STRICT : une ligne DEALER: <nom> puis un tableau JSON valide. Aucun autre texte avant ou après.`

/**
 * Récupère le stock d'un concessionnaire via web_search (Claude navigue sur
 * la page — même mécanisme que la Veille Prix, non bloqué côté serveur).
 *
 * @param {string} url  — URL La Centrale Pro ou équivalent
 * @param {{ lang?: string }} opts
 * @returns {Promise<{ vehicles: object[], dealer: object }>}
 */
export async function scrapeStockWithSearch(url, { lang = 'fr' } = {}) {
  const prompt = `Visite cette page de stock automobiles et extrais TOUS les véhicules listés :
${url}

Retourne EXACTEMENT dans cet ordre — rien d'autre :
1. Une ligne : DEALER: <nom du vendeur affiché sur la page>
2. Un tableau JSON de tous les véhicules :
[
  {
    "make": "MARQUE (majuscules)",
    "model": "modèle",
    "version": "finition/motorisation ou null",
    "year": 2022,
    "mileageKm": 45000,
    "fuel": "Essence|Diesel|Électrique|Hybride|GPL|Autre",
    "gearbox": "Manuelle|Automatique ou null",
    "priceEur": 22900,
    "marketBadge": "Très bonne affaire|Bonne affaire|Offre équitable|Au dessus du marché ou null"
  }
]

Si la page est inaccessible ou ne contient aucun véhicule, retourne :
DEALER: Inconnu
[]`

  const raw = await sendMessage(
    [{ role: 'user', content: prompt }],
    {
      lang,
      webSearch: true,
      maxSearches: 3,
      maxTokens: 4096,
      tool: 'analysestock',
      systemStatic: SCRAPE_SYSTEM,
      temperature: 0,
    }
  )

  const dealerMatch = raw.match(/DEALER:\s*(.+)/i)
  const dealerName = dealerMatch ? dealerMatch[1].trim().replace(/^inconnu$/i, '') : ''

  let vehicles = []
  try {
    vehicles = extractJSON(raw, 'array')
  } catch {
    throw new Error("Impossible d'extraire les véhicules depuis cette URL. Vérifiez le lien ou utilisez l'import CSV.")
  }

  if (!vehicles.length) {
    throw new Error("Aucun véhicule trouvé à cette URL. Vérifiez le lien ou utilisez l'import CSV.")
  }

  return {
    vehicles,
    dealer: { id: null, name: dealerName, url, vehicleCount: vehicles.length },
  }
}

/**
 * Demande à Claude un diagnostic de stock actionnable.
 *
 * @param {object} args
 * @param {object} args.dealer    — { id, name, url, vehicleCount }
 * @param {object[]} args.vehicles — véhicules au schéma canonique
 * @param {object} args.stats     — statistiques pré-calculées (stockStats.js)
 * @param {object} opts           — { lang, onChunk }
 * @returns {Promise<string>} diagnostic Markdown
 */
export async function analyzeStock({ dealer, vehicles, stats }, { lang = 'fr', onChunk = null } = {}) {
  // Liste compacte (champs non nuls) pour limiter les tokens.
  const compact = vehicles.map((v) => {
    const o = {}
    for (const k of ['make', 'model', 'version', 'year', 'mileageKm', 'fuel', 'gearbox', 'priceEur', 'marketBadge', 'dateInStock', 'purchasePrice', 'cote', 'ref']) {
      if (v[k] != null && v[k] !== '') o[k] = v[k]
    }
    return o
  })

  const prompt = `Voici le stock à analyser pour ${dealer?.name || 'ce partenaire'}${dealer?.vehicleCount ? ` (${dealer.vehicleCount} véhicules annoncés)` : ''}.

STATISTIQUES (pré-calculées, à reprendre telles quelles pour tout chiffre) :
${JSON.stringify(stats)}

LISTE DES VÉHICULES :
${JSON.stringify(compact)}`

  return sendMessage([{ role: 'user', content: prompt }], {
    lang,
    expert: true,
    temperature: 0.25,
    maxTokens: 4000,
    tool: 'analysestock',
    systemStatic: STATIC_STOCK,
    stream: true,
    onChunk,
  })
}
