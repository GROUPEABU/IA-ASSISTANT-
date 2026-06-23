// Vercel Edge Function — utilisation agrégée de TOUS les comptes (réservé admin).
//
// Lit le compteur de quota autoritaire (api/_lib/quota.js, KV Redis) pour chaque
// compte du registre et renvoie la dépense du mois + du jour. Strictement réservé
// aux sessions dont le rôle est `admin` : un membre reçoit 403.
//
// Opérations disponibles via POST body.op :
//   (aucun / "list")  → renvoie la liste complète avec dépenses + plafonds
//   "reset"           → réinitialise la dépense d'un compte (targetId)
//   "set-cap"         → modifie les plafonds d'un compte (targetId + caps {month,day})
//
// Aucune donnée sensible n'est exposée (pas de hash de mot de passe, pas de jeton).
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken } from './_lib/auth.js'
import { quotaEnabled, readSpend, getUserCap, setUserCap, resetSpend } from './_lib/quota.js'
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

  // Parse le corps si présent.
  let body = null
  try { body = req.method === 'POST' ? await req.json() : null } catch { /* no body */ }
  const op = body?.op

  // ── Réinitialiser la dépense d'un compte ──────────────────────────────────
  if (op === 'reset') {
    const targetId = body?.targetId
    if (targetId == null) return json({ error: { message: 'targetId manquant' } }, 400)
    await resetSpend(targetId)
    return json({ ok: true }, 200)
  }

  // ── Modifier les plafonds d'un compte ─────────────────────────────────────
  if (op === 'set-cap') {
    const targetId = body?.targetId
    const caps = body?.caps
    if (targetId == null || !caps) return json({ error: { message: 'targetId ou caps manquants' } }, 400)
    const month = caps.month != null ? Number(caps.month) : undefined
    const day   = caps.day   != null ? Number(caps.day)   : undefined
    if ((month != null && (isNaN(month) || month <= 0)) || (day != null && (isNaN(day) || day <= 0))) {
      return json({ error: { message: 'Valeurs de plafond invalides' } }, 400)
    }
    await setUserCap(targetId, { month, day })
    return json({ ok: true }, 200)
  }

  // ── Lister tous les comptes avec dépenses + plafonds ─────────────────────
  const users = getPublicUsers()
  const rows = await Promise.all(
    users.map(async (u) => {
      const [spend, cap] = await Promise.all([readSpend(u.id), getUserCap(u.id)])
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        initials: u.initials || '',
        spend, // { month, day }
        cap,   // { month: number|null, day: number|null } — null = plafond global
      }
    })
  )

  // Tri décroissant par dépense mensuelle (plus actifs en premier).
  rows.sort((a, b) => (b.spend.month || 0) - (a.spend.month || 0))

  return json({ enabled: true, users: rows, generatedAt: Date.now() }, 200)
}
