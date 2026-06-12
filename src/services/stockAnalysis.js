import { sendMessage, extractJSON } from './claude'

// L'IA n'effectue JAMAIS l'arithmétique : toutes les statistiques sont
// pré-calculées en JS (src/utils/stockStats.js) et reprises telles quelles.
// Les prompts système (STATIC_STOCK, SCRAPE_SYSTEM) sont construits côté
// serveur dans api/chat.js via systemStaticKey 'stockanalysis' / 'stockscrape'.

/**
 * Récupère le stock d'un concessionnaire via web_fetch (Claude navigue les
 * pages paginées — même mécanisme que la Veille Prix).
 *
 * @param {string} url  — URL d'un stock vendeur (La Centrale Pro, LeBonCoin, AutoScout24, site du vendeur…)
 * @param {{ lang?: string, onChunk?: (text: string) => void }} opts
 * @returns {Promise<{ vehicles: object[], dealer: object }>}
 */
export async function scrapeStockWithSearch(url, { lang = 'fr', onChunk = null } = {}) {
  const prompt = `Récupère TOUS les véhicules de ce showroom automobile en appliquant la stratégie d'accès décrite dans tes instructions système :
${url}

Pour chaque véhicule extrait, utilise ce schéma JSON :
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

Navigue toutes les pages de pagination. Retourne la narration de navigation puis DEALER: <nom> et le tableau JSON complet.`

  const raw = await sendMessage(
    [{ role: 'user', content: prompt }],
    {
      lang,
      webFetch: true,
      webSearch: true,
      maxSearches: 10,
      maxTokens: 8000,
      tool: 'analysestock',
      systemStaticKey: 'stockscrape',
      temperature: 0,
      stream: true,
      onChunk,
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
    systemStaticKey: 'stockanalysis',
    stream: true,
    onChunk,
  })
}
