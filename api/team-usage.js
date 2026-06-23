// Vercel Edge Function — utilisation agrégée de TOUS les comptes (réservé admin).
//
// Lit le compteur de quota autoritaire (api/_lib/quota.js, KV Redis) pour chaque
// compte du registre et renvoie la dépense du mois + du jour. Strictement réservé
// aux sessions dont le rôle est `admin` : un membre reçoit 403.
//
// Aucune donnée sensible n'est exposée (pas de hash de mot de passe, pas de jeton).
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken } from './_lib/auth.js'
import { quotaEnabled, readSpend } from './_lib/quota.js'
import { getPublicUsers } from './_lib/users.js'

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405)
  }

  const secret = getAuthSecret()
  if (!secret) return json({ error: { message: 'Authentification non configurée.' } }, 500)

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const session = await verifyToken(token, secret)
  if (!session) return json({ error: { message: 'Session expirée ou invalide.' } }, 401)

  // Réservé aux administrateurs.
  if (session.role !== 'admin') {
    return json({ error: { message: 'Accès réservé à l’administrateur.' } }, 403)
  }

  // KV non configuré : on le signale (le client affichera l'état « indisponible »).
  if (!quotaEnabled()) return json({ enabled: false, users: [] }, 200)

  const users = getPublicUsers()
  // Lecture en parallèle des compteurs de chaque compte.
  const rows = await Promise.all(
    users.map(async (u) => {
      const spend = await readSpend(u.id)
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        initials: u.initials || '',
        spend, // { month, day }
      }
    })
  )

  // Tri décroissant par dépense mensuelle (plus actifs en premier).
  rows.sort((a, b) => (b.spend.month || 0) - (a.spend.month || 0))

  return json({ enabled: true, users: rows, generatedAt: Date.now() }, 200)
}
