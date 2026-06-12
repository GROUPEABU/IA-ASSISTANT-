// Helpers d'authentification partagés entre les fonctions Edge (api/login.js,
// api/chat.js). Le dossier `_lib` n'est PAS exposé comme route par Vercel.
//
// Jetons de session : payload JSON signé HMAC-SHA256 (Web Crypto, disponible
// dans le runtime Edge). Format : base64url(payload).base64url(signature).
// Pas de dépendance externe, pas de base de données.

const enc = new TextEncoder()
const dec = new TextDecoder()

// ── Secret de signature ───────────────────────────────────────────────────────
// Priorité : AUTH_SECRET (dédié) > APP_SECRET (legacy) > clé API Anthropic
// (toujours présente côté serveur, jamais exposée — garantit un secret signant
// même sans configuration supplémentaire).
export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.APP_SECRET ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    ''
  )
}

// ── base64url ────────────────────────────────────────────────────────────────
function bytesToB64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const strToB64url = (s) => bytesToB64url(enc.encode(s))

// ── HMAC ─────────────────────────────────────────────────────────────────────
function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, usages,
  )
}

/**
 * Signe un payload de session. `payload.exp` (epoch ms) est obligatoire.
 * @returns {Promise<string>} jeton `body.signature`
 */
export async function signToken(payload, secret) {
  const body = strToB64url(JSON.stringify(payload))
  const key  = await hmacKey(secret, ['sign'])
  const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return `${body}.${bytesToB64url(new Uint8Array(sig))}`
}

/**
 * Vérifie signature + expiration. Comparaison en temps constant via
 * crypto.subtle.verify. @returns {Promise<object|null>} payload ou null
 */
export async function verifyToken(token, secret) {
  try {
    const dot = (token || '').indexOf('.')
    if (dot < 1) return null
    const body = token.slice(0, dot)
    const sig  = token.slice(dot + 1)
    const key  = await hmacKey(secret, ['verify'])
    const ok   = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), enc.encode(body))
    if (!ok) return null
    const payload = JSON.parse(dec.decode(b64urlToBytes(body)))
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

/** SHA-256 hex d'une chaîne (même schéma que l'ancien hash client `abu_v1:`). */
export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Extrait l'IP client des en-têtes Vercel (best-effort). */
export function clientIp(req) {
  return (
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

// ── Rate limiting (fenêtre glissante, mémoire d'isolat) ──────────────────────
// Best-effort : l'état vit dans l'isolat Edge (perdu au cold start, non partagé
// entre régions). Suffisant pour stopper un script naïf ; un WAF Vercel reste
// la couche robuste si besoin.
const buckets = new Map()

/**
 * @returns {boolean} true si la requête est autorisée
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  // Purge périodique pour borner la mémoire.
  if (buckets.size > 5000) {
    for (const [k, arr] of buckets) {
      if (!arr.length || now - arr[arr.length - 1] > windowMs) buckets.delete(k)
    }
  }
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}
