// Vercel Edge Function — collecte minimale des erreurs client.
//
// Les erreurs remontées par le navigateur (ErrorBoundary, window.onerror,
// promesses rejetées) sont tracées via console.error : elles apparaissent dans
// les logs Vercel du projet (Functions → Logs), sans base de données ni
// service tiers. Charge utile bornée et champs tronqués pour éviter tout abus.
export const config = { runtime: 'edge' }

const MAX_BODY_BYTES = 8 * 1024 // 8 KB

const cut = (v, n) => String(v ?? '').slice(0, n)

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return new Response(null, { status: 405 })

  const body = await req.text()
  if (!body || body.length > MAX_BODY_BYTES) return new Response(null, { status: 204 })

  try {
    const e = JSON.parse(body)
    // eslint-disable-next-line no-console
    console.error('[client-error]', JSON.stringify({
      message: cut(e.message, 500),
      where:   cut(e.where, 120),
      url:     cut(e.url, 200),
      ua:      cut(e.ua, 200),
      at:      cut(e.at, 40),
      stack:   cut(e.stack, 1500),
    }))
  } catch { /* corps illisible : on ignore silencieusement */ }

  return new Response(null, { status: 204 })
}
