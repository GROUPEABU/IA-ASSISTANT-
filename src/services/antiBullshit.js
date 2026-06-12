/**
 * Anti-BS — détecteur de régression côté client (dev uniquement).
 *
 * Raison d'être : l'IA invente régulièrement des éléments plausibles mais FAUX —
 * noms d'enseignes/mandataires, outils internes inexistants (« Fiche IA Export »),
 * lois/taux/seuils réglementaires affirmés sans vérification (« loi de finances
 * 2026 »), annonces ou sources fabriquées. C'est strictement interdit.
 *
 * Le bloc de consignes ANTI_BS injecté dans chaque system prompt vit désormais
 * côté serveur (api/chat.js) — jamais dans le bundle. Ce module ne garde que :
 *  1. la liste CANONIQUE des vrais outils du site (REAL_TOOLS) ;
 *  2. le détecteur de régression (flagBullshit) utilisé en dev pour repérer
 *     les sorties suspectes (outils inventés, formulations « loi … »).
 */

// Seuls outils/fonctionnalités RÉELS d'Autobuyunion (tels qu'affichés dans l'UI).
// Toute mention d'un autre « outil » par l'IA est une invention à bannir.
export const REAL_TOOLS = [
  'Veille Prix',
  'Comparateur',
  'CO₂ & Malus',
  'Calculateur TCO',
  'Générateur de pitch',
  'Réponses aux objections',
  'Fiches & Rapports',
  'Assistant IA',
]

// ── Détecteur de régression (dev) ───────────────────────────────────────────
// Heuristiques légères : ne bloque jamais l'affichage, sert à repérer en console
// les sorties qui sentent le bullshit afin de durcir les prompts si besoin.

// Mention d'une « Fiche … » ou d'un « outil/module/service … » qui n'est pas réel.
const FAKE_TOOL_RE = /\b(?:Fiche|outil|module|service|programme|rapport)\s+(?:IA\s+)?[A-ZÀ-Ÿ][\wÀ-ÿ-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ-]+)?/g
// Affirmation réglementaire datée (loi/décret/arrêté + année) — souvent inventée.
const FAKE_LAW_RE = /\b(?:loi de finances|décret|arrêté|article)\s+(?:n[°o]\s*)?[\wÀ-ÿ.\s-]{0,20}\b20\d{2}\b/gi

/**
 * Repère les formulations potentiellement inventées dans une réponse IA.
 * @param {string} text
 * @returns {string[]} liste de motifs suspects (vide si rien)
 */
export function flagBullshit(text) {
  if (!text || typeof text !== 'string') return []
  const flags = []

  const tools = text.match(FAKE_TOOL_RE) || []
  for (const m of tools) {
    const cleaned = m.trim()
    // Ignore si la mention correspond exactement à un vrai outil.
    const isReal = REAL_TOOLS.some((t) => cleaned.includes(t) || t.includes(cleaned))
    if (!isReal) flags.push(`outil/feature potentiellement inventé : « ${cleaned} »`)
  }

  const laws = text.match(FAKE_LAW_RE) || []
  for (const m of laws) flags.push(`référence réglementaire à vérifier : « ${m.trim()} »`)

  return [...new Set(flags)]
}

/**
 * En développement, journalise les drapeaux anti-BS sans rien bloquer.
 * @param {string} text  — réponse IA finale
 * @param {string} [where] — contexte (page/outil) pour la trace
 */
export function auditResponse(text, where = 'IA') {
  try {
    if (!import.meta?.env?.DEV) return
    const flags = flagBullshit(text)
    if (flags.length) {
      console.warn(`[Anti-BS · ${where}] ${flags.length} alerte(s) :\n- ${flags.join('\n- ')}`)
    }
  } catch { /* no-op */ }
}
