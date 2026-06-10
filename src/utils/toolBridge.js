/**
 * Pont inter-outils : passe un payload d'une page à une autre lors d'une
 * navigation (ex. Veille Prix → Pitch pré-rempli, Analyse de stock → Veille
 * Prix sur un véhicule). Stockage sessionStorage one-shot : lu puis effacé
 * par la page cible, expire après 60 s pour ne jamais rejouer un vieux payload.
 */
const KEY = 'abu_tool_bridge'
const TTL_MS = 60000

/** Dépose un payload pour `path` puis navigue (navigate = useNavigate()). */
export function sendToTool(navigate, path, payload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ to: path, payload, at: Date.now() }))
  } catch { /* stockage indisponible : la navigation reste utile */ }
  navigate(path)
}

/** Récupère (et consomme) le payload destiné à `path`, sinon null. */
export function takeBridgePayload(path) {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const { to, payload, at } = JSON.parse(raw)
    if (to !== path) return null
    sessionStorage.removeItem(KEY)
    if (Date.now() - (at || 0) > TTL_MS) return null
    return payload ?? null
  } catch {
    return null
  }
}
