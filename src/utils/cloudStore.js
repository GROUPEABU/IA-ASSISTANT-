/**
 * Synchronisation des données de compte (historiques, fiches générées) via
 * /api/data — partagées entre tous les appareils d'un même compte.
 *
 * - cloudGet(key)  : lit la valeur du compte. Renvoie `undefined` si la synchro
 *   est indisponible (hors-ligne, non connecté, KV inactif) → le hook garde son
 *   stockage local. Renvoie `null` si la synchro est active mais sans valeur.
 * - cloudPut(key, value) : écrit (débounce 400 ms/clé). No-op si synchro inactive.
 * - bulkSeedToCloud(uid) : pousse une seule fois toutes les données locales vers le
 *   compte (utile au premier lancement avec synchro active). Flag localStorage.
 */
const ENDPOINT = '/api/data'
const timers = new Map()
let syncEnabled = null // null = inconnu, true/false = connu après le 1er get

// Toutes les clés de données synchronisables (cloud key = localStorage suffix)
const SYNC_KEYS = [
  'history_pricewatch',
  'history_pitch',
  'history_objections',
  'history_comparateur',
  'history_analysestock',
  'history_chat',
  'generated_products',
]

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

/**
 * Pousse une seule fois toutes les données locales vers le compte serveur.
 * Flag `abu_u{uid}_cloud_bulk_seeded_v1` évite tout rejeu.
 * N'écrase pas : fusionne local + serveur (union par id).
 */
export async function bulkSeedToCloud(uid) {
  if (uid == null) return
  const flagKey = `abu_u${uid}_cloud_bulk_seeded_v1`
  if (localStorage.getItem(flagKey)) return

  const token = sessionToken()
  if (!token) return

  // Vérifie que la synchro est disponible (1 seul appel)
  const probe = await cloudGet(SYNC_KEYS[0])
  if (probe === undefined) return // KV inactif ou hors-ligne

  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(`abu_u${uid}_${key}`)
    if (!raw) continue
    let local
    try { local = JSON.parse(raw) } catch { continue }
    if (!Array.isArray(local) || local.length === 0) continue

    // Récupère la version serveur et fusionne (local en priorité, union par id)
    let remote = []
    try {
      const r = await cloudGet(key)
      if (Array.isArray(r)) remote = r
    } catch {}
    const seen = new Set()
    const merged = []
    for (const item of [...local, ...remote]) {
      if (!item || item.id == null || seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }

    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'put', key, value: JSON.stringify(merged) }),
      })
    } catch {}
  }

  localStorage.setItem(flagKey, '1')
}
