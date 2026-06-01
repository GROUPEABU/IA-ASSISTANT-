// Vercel Edge Function — proxy mince vers l'API Anthropic.
//
// But sécurité : la clé API n'est JAMAIS exposée au navigateur ni embarquée
// dans le bundle client. Elle est lue côté serveur depuis les variables
// d'environnement du projet. Le client envoie le corps de requête déjà
// construit (system, messages, model, tools, stream…) ; cette fonction y
// ajoute la clé + la version et relaie la réponse telle quelle — y compris
// le flux SSE en streaming.
//
// Override optionnel : un utilisateur peut fournir sa propre clé via l'en-tête
// `x-user-api-key` (saisie dans Réglages, stockée dans son propre localStorage,
// jamais dans le bundle). Si présente, elle est préférée à la clé serveur.
export const config = { runtime: 'edge' }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION   = '2023-06-01'

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

  const body = await req.text()

  let upstream
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key':         key,
        'anthropic-version': API_VERSION,
        'content-type':      'application/json',
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
