/**
 * Supprime le raisonnement interne du modèle qui précède parfois ## L'essentiel.
 *
 * Quand le modèle atteint les limites de recherche web, il peut afficher ses
 * calculs intermédiaires ("Synthèse des données avant de rédiger", "Calculs
 * formule", "Vérification monotonie"…) avant la section ## L'essentiel.
 * Ce texte est du raisonnement interne qui ne doit jamais apparaître dans le
 * rapport final ni dans le PDF exporté.
 *
 * La fonction détecte la première section Markdown attendue (## L'essentiel)
 * et supprime tout ce qui la précède. Si aucune section structurée n'est
 * trouvée, le texte est retourné intact (l'appelant gère l'état incomplet).
 */

// Premier titre attendu dans le format de sortie de la Veille Prix.
// Variantes d'apostrophe : ' (ASCII 39), ' (U+2019), ` (grave accent).
const SECTION_START_RE = /^##\s+L[''`]essentiel/m

/**
 * @param {string} text — sortie brute du flux SSE
 * @returns {string} — texte nettoyé, commençant par ## L'essentiel si trouvé
 */
export function stripLeadingReasoning(text) {
  if (!text) return text
  const m = text.match(SECTION_START_RE)
  if (m && m.index > 0) return text.slice(m.index)
  return text
}

/**
 * Détermine si un rapport contient une structure de sortie complète.
 * Utilisé dans le batch pour détecter les analyses incomplètes (limite
 * de recherches atteinte avant la fin de l'analyse).
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasStructuredContent(text) {
  return SECTION_START_RE.test(text || '')
}
