// Vercel Edge Function — stockage des données par compte (historiques des
// outils, fiches générées) sur le KV, partagé entre tous les appareils du même
// compte. Scopé par session.id ; le client ne peut écrire que ses propres clés.
//
//   POST { op:'get', key }          → { enabled, value }
//   POST { op:'put', key, value }   → { enabled, ok }   (value = JSON string)
//
// DÉGRADATION GRACIEUSE : si le KV n'est pas configuré, renvoie { enabled:false }
// et le client retombe sur le stockage local par appareil.
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken } from './_lib/auth.js'
import { quotaEnabled, storeGet, storePut } from './_lib/quota.js'

// Seules ces clés sont synchronisables (anti-écriture arbitraire dans le KV).
const KEY_RE = /^(history_[a-z0-9_-]{1,40}|generated_products|avatar)$/
const MAX_VALUE_BYTES = 800 * 1024 // marge sous la limite de requête Upstash REST

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

  if (!quotaEnabled()) return json({ enabled: false }, 200)

  let body
  try { body = JSON.parse(await req.text()) } catch { return json({ error: { message: 'JSON invalide.' } }, 400) }
  const { op, key } = body || {}
  if (!KEY_RE.test(key || '')) return json({ error: { message: 'Clé non autorisée.' } }, 400)

  if (op === 'get') {
    const value = await storeGet(session.id, key)
    return json({ enabled: true, value }, 200)
  }
  if (op === 'put') {
    const value = typeof body.value === 'string' ? body.value : ''
    if (value.length > MAX_VALUE_BYTES) return json({ error: { message: 'Donnée trop volumineuse.' } }, 413)
    const ok = await storePut(session.id, key, value)
    return json({ enabled: true, ok }, 200)
  }
  return json({ error: { message: 'Opération inconnue.' } }, 400)
}
