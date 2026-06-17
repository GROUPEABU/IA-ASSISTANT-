// Vercel Edge Function — authentification serveur.
//
// Remplace la validation côté client : les hashs de mots de passe ne sont
// PLUS dans le bundle JavaScript. Le navigateur envoie identifiant + mot de
// passe ; en cas de succès, il reçoit un jeton de session signé HMAC-SHA256
// (7 jours) que api/chat.js exige ensuite sur chaque appel IA.
//
// Registre utilisateurs : constante ci-dessous, surchargée par la variable
// d'environnement AUTH_USERS (JSON, même schéma) pour ajouter/modifier des
// comptes sans redéployer le code. Hash = SHA-256("abu_v1:" + motDePasse)
// (schéma inchangé : les mots de passe existants restent valables).
export const config = { runtime: 'edge' }

import { getAuthSecret, signToken, sha256Hex, clientIp, rateLimit } from './_lib/auth.js'
import { quotaEnabled, storeGet } from './_lib/quota.js'

const PW_SALT      = 'abu_v1'
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours
const MAX_BODY     = 4 * 1024

// 10 tentatives / 15 min / IP — large pour un usage légitime, bloque le brute-force.
const LOGIN_LIMIT     = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

const DEFAULT_USERS = [
  { id: 1, username: 'hubert.saget@aafgroup.eu', passwordHash: 'ed74e595563f0f76da37eebc8eeb20afb8fac7ee82d8e550104392fe975d4dcb', name: 'HUBERT SAGET', role: 'admin',  initials: 'HS' },
  { id: 3, username: 'demo@autobuyunion.eu',     passwordHash: '092c365fd32a2be2ef2631fafc3a8df0e75aaafbc1b87f69480abc170f8816e8', name: 'Compte Démo',  role: 'membre', initials: 'DM' },
  { id: 4, username: 'pascal.lopez@aafgroup.eu',     passwordHash: 'df36b23ebcf05dbadaf0e53e951d33c09facecb6caf8ed6d5e3d25b9664dd64f', name: 'PASCAL LOPEZ',     role: 'membre', initials: 'PL' },
  { id: 5, username: 'olivier.amengual@aafgroup.eu', passwordHash: 'bb96d19f4b23599db74c46ab9dd6183e5a0a40b1a8d39f7fcef872bf99577cf7', name: 'OLIVIER AMENGUAL', role: 'membre', initials: 'OA' },
]

function getUsers() {
  try {
    const raw = process.env.AUTH_USERS
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* JSON invalide → registre par défaut */ }
  return DEFAULT_USERS
}

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405)

  const secret = getAuthSecret()
  if (!secret) {
    return json({ error: { message: 'Authentification non configurée côté serveur.' } }, 500)
  }

  if (!rateLimit(`login:${clientIp(req)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return json({ error: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' } }, 429)
  }

  const body = await req.text()
  if (!body || body.length > MAX_BODY) return json({ error: { message: 'Requête invalide.' } }, 400)

  let username = '', password = ''
  try {
    const parsed = JSON.parse(body)
    username = String(parsed.username || '').trim().toLowerCase()
    password = String(parsed.password || '')
  } catch {
    return json({ error: { message: 'Requête invalide.' } }, 400)
  }
  if (!username || !password) return json({ error: { message: 'Identifiants requis.' } }, 400)

  const user = getUsers().find((u) => u.username.toLowerCase() === username) || null
  const inputHash = await sha256Hex(`${PW_SALT}:${password}`)

  // Réponse identique que le compte existe ou non (pas d'énumération).
  const expired = user?.expiresAt ? Date.now() > new Date(user.expiresAt).getTime() : false
  if (!user || expired) return json({ error: { message: 'Identifiants incorrects.' } }, 401)

  // Vérifie d'abord si le compte a un hash personnalisé (changement de mot de passe).
  let expectedHash = user.passwordHash
  if (quotaEnabled()) {
    try {
      const override = await storeGet(user.id, 'pwdhash')
      if (override && typeof override === 'string') expectedHash = override
    } catch {}
  }
  if (inputHash !== expectedHash) {
    return json({ error: { message: 'Identifiants incorrects.' } }, 401)
  }

  const { passwordHash: _ph, expiresAt: _exp, ...safe } = user
  const now = Date.now()
  const token = await signToken({ ...safe, iat: now, exp: now + TOKEN_TTL_MS }, secret)

  return json({ user: safe, token, expiresAt: now + TOKEN_TTL_MS }, 200)
}
