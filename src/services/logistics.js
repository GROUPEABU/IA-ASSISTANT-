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

/**
 * @param {object[]} vehicles — lignes canoniques (make, model, version, year, mileageKm, fuel, location…)
 * @param {{ notes?: string }} params — demande libre de l'utilisateur (prioritaire)
 * @param {{ lang?: string, onChunk?: (t: string) => void }} opts
 * @returns {Promise<{ trucks: object[], unassignedIdx: number[], summary: string }>}
 */
export async function planTrucks(vehicles, { notes = '' } = {}, { lang = 'fr', onChunk = null } = {}) {
  const compact = vehicles.map((v, idx) => ({
    idx,
    vehicule: [v.make, v.model, v.version].filter(Boolean).join(' '),
    annee: v.year ?? null,
    km: v.mileageKm ?? null,
    parc: v.location || null,
  }))

  const prompt = `Organise ces ${vehicles.length} véhicules en camions.
${notes ? `
DEMANDE UTILISATEUR (PRIORITAIRE sur les règles par défaut) :
${notes}` : `
Aucune demande spécifique : applique les règles par défaut (capacité 8, équilibrage kilométrique, proximité des parcs).`}

VÉHICULES (idx, désignation, année, km, parc d'enlèvement) :
${JSON.stringify(compact)}

Réponds uniquement avec le JSON demandé.`

  const raw = await sendMessage(
    [{ role: 'user', content: prompt }],
    {
      lang, expert: true, temperature: 0, tool: 'logistique',
      maxTokens: 6000, systemStaticKey: 'logistics',
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
