// Vercel Edge Function — contrôle de santé public (aucun secret exposé).
// Sert à confirmer que le quota serveur (KV/Upstash) est correctement câblé.
//   { "kv": { "ok": true,  "reason": "connected" } }        → KV opérationnel
//   { "kv": { "ok": false, "reason": "not_configured" } }   → variables absentes
//   { "kv": { "ok": false, "reason": "unreachable_or_bad_token" } } → mauvais token / réseau
export const config = { runtime: 'edge' }

import { pingKV } from './_lib/quota.js'

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  const kv = await pingKV()
  return new Response(JSON.stringify({ status: 'ok', kv }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
