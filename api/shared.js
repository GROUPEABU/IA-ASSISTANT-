// Vercel Edge Function — flux partagé « Veilles de l'équipe ».
//
// Toutes les veilles prix terminées sont empilées dans une liste KV commune,
// lisible par tous les membres authentifiés. Lecture seule côté membres : pas
// de suppression manuelle, auto-purge à 45 jours (50 dernières conservées).
//
//   POST { op:'list' }          → { enabled, items }
//   POST { op:'push', item }    → { enabled, ok }
//
// L'auteur est dérivé de l'identité VÉRIFIÉE du jeton (anti-usurpation), jamais
// d'une valeur fournie par le client.
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken } from './_lib/auth.js'
import { quotaEnabled, sharedPush, sharedList, sharedDelete, sharedRenew } from './_lib/quota.js'

const MAX_ITEM_BYTES = 200 * 1024

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

  if (!quotaEnabled()) return json({ enabled: false, items: [] }, 200)

  let body
  try { body = JSON.parse(await req.text()) } catch { return json({ error: { message: 'JSON invalide.' } }, 400) }
  const { op } = body || {}

  if (op === 'list') {
    const items = await sharedList()
    return json({ enabled: true, items }, 200)
  }

  if (op === 'push') {
    const v = body.item
    if (!v || typeof v !== 'object') return json({ error: { message: 'Donnée invalide.' } }, 400)
    const item = {
      id:          String(v.id || `${session.id}-${Date.now()}`),
      searchLabel: String(v.searchLabel || '').slice(0, 200),
      country:     String(v.country || '').slice(0, 4),
      type:        String(v.type || '').slice(0, 4),
      report:      String(v.report || '').slice(0, 60000),
      figures:     v.figures && typeof v.figures === 'object' ? v.figures : null,
      margin:      Number(v.margin) || null,
      hasLiveData: !!v.hasLiveData,
      authorId:    session.id,
      authorName:  String(session.name || '').slice(0, 80),
      sharedAt:    Date.now(),
    }
    if (JSON.stringify(item).length > MAX_ITEM_BYTES) {
      return json({ error: { message: 'Donnée trop volumineuse.' } }, 413)
    }
    const ok = await sharedPush(item)
    return json({ enabled: true, ok }, 200)
  }

  if (op === 'delete') {
    const id = String(body.id || '')
    if (!id) return json({ error: { message: 'Identifiant requis.' } }, 400)
    const res = await sharedDelete(id, session.id)
    if (!res.ok && res.reason === 'forbidden') return json({ error: { message: 'Seul l’auteur peut supprimer cette veille.' } }, 403)
    return json({ enabled: true, ok: res.ok }, 200)
  }

  if (op === 'renew') {
    const id = String(body.id || '')
    if (!id) return json({ error: { message: 'Identifiant requis.' } }, 400)
    const res = await sharedRenew(id, session.id)
    if (!res.ok && res.reason === 'forbidden') return json({ error: { message: 'Seul l’auteur peut renouveler cette veille.' } }, 403)
    return json({ enabled: true, ok: res.ok, expiresAt: res.expiresAt }, 200)
  }

  return json({ error: { message: 'Opération inconnue.' } }, 400)
}
