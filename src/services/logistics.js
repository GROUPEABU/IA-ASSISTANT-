/**
 * Logistique — organisation de camions porte-voitures.
 *
 * Répartit un lot de véhicules (importé via fichier, colonnes libres) en
 * camions selon : capacité (7-8 selon pays/gabarit), proximité géographique
 * des parcs fournisseurs (ville/CP) et équilibrage du mixte kilométrique
 * entre camions. Le raisonnement géographique et le gabarit sont gérés par
 * le modèle ; la sortie est un JSON strict rendu par la page.
 */
import { sendMessage, extractJSON } from './claude'

const STATIC_LOGISTICS = `Tu es un expert en logistique de transport automobile européen (camions porte-voitures 7-8 places, tournées d'enlèvement multi-parcs).

MISSION : répartir une liste de véhicules en CAMIONS de chargement, en respectant strictement :

1. CAPACITÉ — nombre de places par camion fourni en paramètre. Les véhicules à gabarit LARGE (SUV, 4x4, break, monospace, utilitaire, pickup) occupent plus de place : un camion ne peut pas dépasser sa capacité et au-delà de 2 gabarits larges, retire 1 place sur ce camion. Déduis le gabarit du modèle (ex. X5, Tiguan, 3008 = SUV large ; Clio, 208, Polo = compact).

2. PROXIMITÉ GÉOGRAPHIQUE — regroupe les véhicules dont les parcs (ville / code postal fournis) sont proches, pour minimiser les détours d'une tournée d'enlèvement. Utilise ta connaissance de la géographie européenne (distances routières approximatives). Ordonne les villes de chaque camion en tournée logique.

3. MIXTE KILOMÉTRIQUE ÉQUILIBRÉ — chaque camion doit recevoir un MÉLANGE comparable de bas et hauts kilométrages : les kilométrages moyens des camions doivent être proches (écart cible < 15 % entre camions). Ne mets jamais tous les bas-km dans un camion et tous les hauts-km dans un autre, sauf si la géographie l'impose absolument (dans ce cas signale-le).

4. Si le nombre de véhicules n'est pas divisible, le dernier camion est partiel. Ne laisse un véhicule non affecté QUE s'il est géographiquement isolé au point de justifier un transport séparé — explique pourquoi.

5. CONSIGNES UTILISATEUR — si des consignes libres sont fournies, elles sont PRIORITAIRES sur les règles 1-4 : adapte le plan exactement à ce qui est demandé (ex. « divise en 3 camions », « sépare les électriques », « regroupe par marque », « le camion 1 part à Munich »…). Signale dans summary ce que les consignes ont changé par rapport aux règles standard.

RÉPONSE : UNIQUEMENT ce JSON (aucun texte autour) :
{
  "trucks": [
    {
      "id": 1,
      "vehicleIdx": [0, 3, 5],
      "pickupRoute": ["Lille (59)", "Arras (62)"],
      "kmAvg": 45200,
      "loadNote": "7/7 places — 1 SUV gabarit large",
      "routeNote": "Tournée Hauts-de-France, ~85 km entre parcs"
    }
  ],
  "unassignedIdx": [],
  "summary": "2 phrases : équilibre km entre camions, cohérence géographique, points d'attention."
}
Chaque index de véhicule apparaît EXACTEMENT une fois (dans un camion ou unassignedIdx). kmAvg = moyenne arrondie des km du camion.`

/**
 * @param {object[]} vehicles — lignes canoniques (make, model, version, year, mileageKm, fuel, location…)
 * @param {{ capacity: number, destCountry: string, notes?: string }} params
 * @param {{ lang?: string, onChunk?: (t: string) => void }} opts
 * @returns {Promise<{ trucks: object[], unassignedIdx: number[], summary: string }>}
 */
export async function planTrucks(vehicles, { capacity, destCountry, notes = '' }, { lang = 'fr', onChunk = null } = {}) {
  const compact = vehicles.map((v, idx) => ({
    idx,
    vehicule: [v.make, v.model, v.version].filter(Boolean).join(' '),
    annee: v.year ?? null,
    km: v.mileageKm ?? null,
    parc: v.location || null,
  }))

  const prompt = `Organise ces ${vehicles.length} véhicules en camions.

PARAMÈTRES :
- Capacité par camion : ${capacity} véhicules (destination ${destCountry})
- Équilibrage kilométrique : OBLIGATOIRE (km moyens proches entre camions)
${notes ? `
CONSIGNES UTILISATEUR (PRIORITAIRES sur les règles par défaut) :
${notes}` : ''}

VÉHICULES (idx, désignation, année, km, parc d'enlèvement) :
${JSON.stringify(compact)}

Réponds uniquement avec le JSON demandé.`

  const raw = await sendMessage(
    [{ role: 'user', content: prompt }],
    {
      lang, expert: true, temperature: 0, tool: 'logistique',
      maxTokens: 6000, systemStatic: STATIC_LOGISTICS,
      stream: true, onChunk,
    }
  )

  const plan = extractJSON(raw, 'object')
  if (!Array.isArray(plan?.trucks) || !plan.trucks.length) {
    throw new Error('Plan de chargement invalide — réessayez.')
  }
  return { trucks: plan.trucks, unassignedIdx: plan.unassignedIdx || [], summary: plan.summary || '' }
}

/** Capacités par défaut selon le pays de destination. */
export const DEST_COUNTRIES = [
  { code: 'DE', label: 'Allemagne', capacity: 7 },
  { code: 'FR', label: 'France', capacity: 8 },
  { code: 'BE', label: 'Belgique', capacity: 8 },
  { code: 'NL', label: 'Pays-Bas', capacity: 8 },
  { code: 'LU', label: 'Luxembourg', capacity: 8 },
  { code: 'IT', label: 'Italie', capacity: 8 },
  { code: 'ES', label: 'Espagne', capacity: 8 },
  { code: 'PT', label: 'Portugal', capacity: 8 },
  { code: 'PL', label: 'Pologne', capacity: 8 },
  { code: 'XX', label: 'Autre', capacity: 8 },
]
