// Vercel Edge Function — import unique d'une dépense historique vers le
// compteur de quota autoritaire du compte (voir api/_lib/quota.js).
//
// Le client appelle ce endpoint une seule fois par appareil avec le total
// estimé localement (ancien compteur api_costs) afin que ce montant apparaisse
// sur tous les appareils du compte. Le seeding est idempotent côté serveur et
// ne peut qu'augmenter la propre dépense du compte (pas un vecteur d'abus).
//
// La réponse expose aussi `enabled` : utile comme contrôle de santé du KV.
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken } from './_lib/auth.js'
import { quotaEnabled, seedSpend, readSpend } from './_lib/quota.js'

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405)

  const secret = getAuthSecret()
  if (!secret) return json({ error: { message: 'Authentification non configurée.' } }, 500)

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const session = await verifyToken(token, secret)
  if (!session) return json({ error: { message: 'Session expirée ou invalide.' } }, 401)

  // KV non configuré : on le signale (le client réessaiera plus tard).
  if (!quotaEnabled()) return json({ enabled: false }, 200)

  let amount = 0
  try { amount = parseFloat(JSON.parse(await req.text()).amount) || 0 } catch { /* 0 */ }

  const result = await seedSpend(session.id, amount)
  const spend  = await readSpend(session.id)
  return json({ enabled: true, ...result, spend }, 200)
}
