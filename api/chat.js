// Vercel Edge Function — proxy mince vers l'API Anthropic.
//
// Sécurité :
//   - La clé API n'est JAMAIS exposée au navigateur ni embarquée dans le bundle.
//   - Si APP_SECRET est configuré (recommandé), le proxy exige le header
//     `x-app-secret` avec la valeur correspondante — sans cela : 401.
//     Le client passe ce secret via VITE_APP_SECRET (présent dans le bundle,
//     pas dans le code source versionné, suffisant pour bloquer les scanners).
//   - Limite de corps à 200 KB pour prévenir les abus de payload.
//   - Validation que le corps est un objet JSON avec un tableau `messages`.
//
// Override optionnel : un utilisateur peut fournir sa propre clé via l'en-tête
// `x-user-api-key` (saisie dans Réglages, stockée dans son propre localStorage,
// jamais dans le bundle). Si présente, elle est préférée à la clé serveur.
export const config = { runtime: 'edge' }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION   = '2023-06-01'
const MAX_BODY_BYTES = 200 * 1024 // 200 KB

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405)
  }

  // ── Vérification du secret applicatif ─────────────────────────────────────
  const appSecret = process.env.APP_SECRET
  if (appSecret) {
    const clientSecret = req.headers.get('x-app-secret') || ''
    if (clientSecret !== appSecret) {
      return json({ error: { message: 'Unauthorized' } }, 401)
    }
  }

  // ── Limite de taille du corps ──────────────────────────────────────────────
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: { message: 'Payload trop volumineux.' } }, 413)
  }

  const body = await req.text()
  if (body.length > MAX_BODY_BYTES) {
    return json({ error: { message: 'Payload trop volumineux.' } }, 413)
  }

  // ── Validation de structure minimale ──────────────────────────────────────
  let parsed
  try {
    parsed = JSON.parse(body)
  } catch {
    return json({ error: { message: 'Corps JSON invalide.' } }, 400)
  }
  if (!parsed || !Array.isArray(parsed.messages)) {
    return json({ error: { message: 'Corps JSON invalide : messages[] requis.' } }, 400)
  }

  // ── Clé API (serveur uniquement) ────────────────────────────────────────────
  // NB : VITE_ANTHROPIC_API_KEY est conservé en fallback car c'est le nom sous
  // lequel la clé est configurée dans l'environnement Vercel. C'est SANS risque
  // ici : le code CLIENT ne référence jamais import.meta.env.VITE_ANTHROPIC_API_KEY,
  // donc Vite ne l'embarque PAS dans le bundle — seule cette fonction edge la lit
  // via process.env, côté serveur.
  const key =
    req.headers.get('x-user-api-key') ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    ''

  if (!key) {
    return json(
      { error: { message: 'Clé API non configurée côté serveur (ANTHROPIC_API_KEY).' } },
      500,
    )
  }

  // En-têtes beta requis selon le contenu du corps.
  const betas = []
  // Prompt caching : blocs system avec cache_control ephemeral.
  if (Array.isArray(parsed.system) && parsed.system.some((b) => b?.cache_control?.type === 'ephemeral')) {
    betas.push('prompt-caching-2024-07-31')
  }
  // web_fetch_20260209 est GA — aucun header beta requis.

  let upstream
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key':         key,
        'anthropic-version': API_VERSION,
        'content-type':      'application/json',
        ...(betas.length && { 'anthropic-beta': betas.join(',') }),
      },
      body,
    })
  } catch (err) {
    return json({ error: { message: `Proxy: échec de connexion à l'API (${err.message}).` } }, 502)
  }

  // Relais transparent : statut + flux du corps (supporte le streaming SSE).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
