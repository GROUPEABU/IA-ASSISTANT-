/**
 * Import adaptatif CSV / Excel — commun à tous les outils (Veille Prix lot,
 * Analyse de stock, fiches produit).
 *
 * Stratégie en deux temps, comme Claude chat avec un fichier joint :
 * 1. Lecture déterministe (gratuite, instantanée) : détection d'en-têtes et
 *    mapping flou des colonnes via parseStockFile.
 * 2. Si le fichier ne suit aucun schéma reconnu (mise en page libre, colonnes
 *    exotiques, tout dans une seule colonne…), repli sur une extraction IA :
 *    la grille brute est envoyée au modèle qui renvoie les véhicules en JSON,
 *    quel que soit le style du fichier.
 */

import { parseStockFile, fileToGrid } from '@/utils/stockCsv'
import { sendMessage, extractJSON } from './claude'

// Bornes de sérialisation : assez pour ~100 véhicules, sans exploser les tokens.
const MAX_ROWS = 120
const MAX_COLS = 24
const MAX_CELL = 80

/** Grille → texte tabulaire compact (lignes numérotées, colonnes séparées par |). */
export function gridToText(grid) {
  return grid
    .slice(0, MAX_ROWS)
    .map((row, i) => {
      const cells = (row || []).slice(0, MAX_COLS)
        .map((c) => String(c ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CELL))
      // Ignore les lignes entièrement vides pour économiser les tokens.
      return cells.some(Boolean) ? `${i + 1}| ${cells.join(' | ')}` : null
    })
    .filter(Boolean)
    .join('\n')
}

const EXTRACT_PROMPT = `Voici le contenu brut d'un fichier (CSV ou Excel) contenant des véhicules. Le format est LIBRE : en-têtes quelconques ou absents, préambule, tout-dans-une-colonne, langues mélangées… Adapte-toi au fichier tel qu'il est.

Extrais CHAQUE véhicule en un objet JSON avec ces champs (null si absent — n'invente JAMAIS une donnée) :
- make : marque (déduis-la de la désignation si nécessaire, ex. "BMW X5 30d" → "BMW")
- model : modèle SANS la marque (ex. "X5")
- version : finition / motorisation (ex. "xDrive30d M Sport")
- year : année (number) — depuis une date de 1ère immatriculation si présente
- mileageKm : kilométrage (number, en km)
- fuel : carburant, normalisé parmi : Essence | Diesel | Électrique | Hybride | Hybride rechargeable | GPL
- gearbox : Manuelle | Automatique
- priceEur : prix de vente TTC (number, en euros)
- prixHt : prix HT si distinct (number)
- purchasePrice : prix d'achat si présent (number)
- margin : marge cible en € HT si une colonne marge est présente (number)
- co2 : émissions CO₂ g/km (number)
- couleur : couleur
- vin : VIN / châssis
- location : ville et/ou code postal du parc / dépôt / fournisseur où se trouve le véhicule (ex. "Lille (59)")

Règles :
- Une ligne de données = un véhicule. Ignore en-têtes, totaux, signatures, lignes vides.
- Nombres : convertis "12 500 €", "12.500,00" → 12500. km : "45 000 km" → 45000.
- Réponds UNIQUEMENT avec le tableau JSON, sans aucun texte autour.

Fichier :
`

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeAiRow(r) {
  if (!r || typeof r !== 'object') return null
  const make = String(r.make || '').trim().toUpperCase()
  const model = String(r.model || '').trim()
  if (!make && !model) return null
  return {
    make,
    model,
    version: String(r.version || '').trim() || null,
    year: num(r.year),
    mileageKm: num(r.mileageKm),
    fuel: String(r.fuel || '').trim() || null,
    gearbox: String(r.gearbox || '').trim() || null,
    priceEur: num(r.priceEur),
    prixHt: num(r.prixHt),
    purchasePrice: num(r.purchasePrice),
    margin: num(r.margin),
    cote: null,
    co2: num(r.co2),
    couleur: String(r.couleur || '').trim() || null,
    vin: String(r.vin || '').trim() || null,
    location: String(r.location || '').trim() || null,
    dateInStock: null,
    ref: null,
    url: null,
    marketBadge: null,
  }
}

/** Filtre « stock » : mêmes champs obligatoires que parseStockFile. */
export function toStockVehicles(vehicles) {
  const REQUIRED = ['make', 'model', 'year', 'mileageKm', 'priceEur']
  const ok = []
  let ignored = 0
  for (const v of vehicles) {
    if (REQUIRED.every((f) => v[f] != null && v[f] !== '')) ok.push(v)
    else ignored += 1
  }
  return { vehicles: ok, ignored }
}

/**
 * Extraction de véhicules tolérante à TOUT style de fichier.
 * Déterministe d'abord ; repli IA si le format n'est pas reconnu.
 *
 * @param {File} file
 * @param {{ lang?: string }} opts
 * @returns {Promise<{ vehicles: object[], ignored: number, dealer: object, source: 'columns'|'ai' }>}
 */
export async function extractVehiclesSmart(file, { lang = 'fr' } = {}) {
  // L'outil s'adapte au fichier : aucune colonne imposée. Si même la lecture
  // adaptative ne trouve rien, le message ne doit PAS parler d'en-têtes requis.
  const failMsg = 'Aucun véhicule exploitable trouvé dans ce fichier, même en lecture adaptative. Vérifiez qu\'il contient bien des véhicules (modèle, et idéalement prix, km ou année).'
  try {
    const { vehicles, ignored, dealer } = await parseStockFile(file)
    return { vehicles, ignored, dealer, source: 'columns' }
  } catch {
    // Format non reconnu → repli adaptatif ci-dessous.
  }

  // Repli adaptatif : le modèle lit la grille brute, quel que soit son style.
  const grid = await fileToGrid(file)
  const text = gridToText(grid)
  if (!text.trim()) throw new Error(failMsg)

  const raw = await sendMessage(
    [{ role: 'user', content: EXTRACT_PROMPT + text }],
    { lang, tool: 'importsmart', temperature: 0, maxTokens: 4000 }
  )
  const arr = extractJSON(raw, 'array')
  const vehicles = (Array.isArray(arr) ? arr : []).map(normalizeAiRow).filter(Boolean)
  if (!vehicles.length) throw new Error(failMsg)

  return {
    vehicles,
    ignored: 0,
    dealer: { id: null, name: '', url: '', vehicleCount: vehicles.length },
    source: 'ai',
  }
}
