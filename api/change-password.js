// Vercel Edge Function — changement de mot de passe.
// Exige un token de session valide + le mot de passe actuel.
// Stocke le nouveau hash dans le KV (abudata:{uid}:pwdhash) — prioritaire sur
// le hash statique de login.js lors des connexions suivantes.
export const config = { runtime: 'edge' }

import { getAuthSecret, verifyToken, sha256Hex } from './_lib/auth.js'
import { quotaEnabled, storeGet, storePut } from './_lib/quota.js'

const PW_SALT  = 'abu_v1'
const MIN_LEN  = 8
const MAX_BODY = 4 * 1024

const DEFAULT_USERS = [
  { id: 1, username: 'hubert.saget@aafgroup.eu', passwordHash: 'ed74e595563f0f76da37eebc8eeb20afb8fac7ee82d8e550104392fe975d4dcb' },
  { id: 3, username: 'demo@autobuyunion.eu',     passwordHash: '092c365fd32a2be2ef2631fafc3a8df0e75aaafbc1b87f69480abc170f8816e8' },
]

function getStaticHash(uid) {
  try {
    const raw = process.env.AUTH_USERS
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const u = parsed.find((x) => x.id === uid)
        if (u?.passwordHash) return u.passwordHash
      }
    }
  } catch {}
  return DEFAULT_USERS.find((u) => u.id === uid)?.passwordHash || null
}

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const secret = getAuthSecret()
  if (!secret) return json({ error: 'Non configuré.' }, 500)

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const session = await verifyToken(token, secret)
  if (!session) return json({ error: 'Session expirée ou invalide.' }, 401)

  if (!quotaEnabled()) return json({ error: 'Stockage non configuré.' }, 503)

  const body = await req.text()
  if (!body || body.length > MAX_BODY) return json({ error: 'Requête invalide.' }, 400)

  let currentPassword, newPassword
  try {
    const parsed = JSON.parse(body)
    currentPassword = String(parsed.currentPassword || '')
    newPassword     = String(parsed.newPassword || '')
  } catch { return json({ error: 'JSON invalide.' }, 400) }

  if (!currentPassword || !newPassword) return json({ error: 'Champs requis.' }, 400)
  if (newPassword.length < MIN_LEN)
    return json({ error: `Le mot de passe doit contenir au moins ${MIN_LEN} caractères.` }, 422)

  // Vérifie le mot de passe actuel (KV en priorité, sinon statique)
  const currentHash  = await sha256Hex(`${PW_SALT}:${currentPassword}`)
  let expectedHash = getStaticHash(session.id)
  try {
    const override = await storeGet(session.id, 'pwdhash')
    if (override && typeof override === 'string') expectedHash = override
  } catch {}

  if (!expectedHash || currentHash !== expectedHash)
    return json({ error: 'Mot de passe actuel incorrect.' }, 401)

  const newHash = await sha256Hex(`${PW_SALT}:${newPassword}`)
  const ok = await storePut(session.id, 'pwdhash', JSON.stringify(newHash))
  if (!ok) return json({ error: 'Erreur de stockage. Réessayez.' }, 500)

  return json({ ok: true }, 200)
}
