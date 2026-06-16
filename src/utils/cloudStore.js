/**
 * Synchronisation des données de compte (historiques, fiches générées) via
 * /api/data — partagées entre tous les appareils d'un même compte.
 *
 * - cloudGet(key)  : lit la valeur du compte. Renvoie `undefined` si la synchro
 *   est indisponible (hors-ligne, non connecté, KV inactif) → le hook garde son
 *   stockage local. Renvoie `null` si la synchro est active mais sans valeur.
 * - cloudPut(key, value) : écrit (débounce 400 ms/clé). No-op si synchro inactive.
 */
const ENDPOINT = '/api/data'
const timers = new Map()
let syncEnabled = null // null = inconnu, true/false = connu après le 1er get

function sessionToken() {
  try { return JSON.parse(localStorage.getItem('abu_session') || 'null')?.token || null }
  catch { return null }
}

export async function cloudGet(key) {
  const token = sessionToken()
  if (!token) return undefined
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ op: 'get', key }),
    })
    if (!res.ok) return undefined
    const data = await res.json().catch(() => null)
    syncEnabled = data?.enabled === true
    if (!syncEnabled) return undefined
    return data.value ?? null
  } catch { return undefined }
}

export function cloudPut(key, value) {
  if (syncEnabled === false) return // on sait que le KV est inactif
  const token = sessionToken()
  if (!token) return
  clearTimeout(timers.get(key))
  timers.set(key, setTimeout(async () => {
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'put', key, value: JSON.stringify(value) }),
      })
    } catch { /* no-op : le stockage local reste la source locale */ }
  }, 400))
}
