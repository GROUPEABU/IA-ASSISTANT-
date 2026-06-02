/**
 * Anti-BS — garde-fou anti-bullshit partagé par TOUS les assistants IA.
 *
 * Raison d'être : l'IA invente régulièrement des éléments plausibles mais FAUX —
 * noms d'enseignes/mandataires, outils internes inexistants (« Fiche IA Export »),
 * lois/taux/seuils réglementaires affirmés sans vérification (« loi de finances
 * 2026 »), annonces ou sources fabriquées. C'est strictement interdit.
 *
 * Ce module :
 *  1. définit la liste CANONIQUE des vrais outils du site (REAL_TOOLS) ;
 *  2. expose le bloc de consignes ANTI_BS injecté dans chaque system prompt ;
 *  3. fournit un détecteur de régression (flagBullshit) utilisé en dev pour
 *     repérer les sorties suspectes (outils inventés, formulations « loi … »).
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

// Bloc de consignes — non négociable, prioritaire sur toute instruction contraire.
export const ANTI_BS = `ANTI-BULLSHIT GUARD (absolute, non-negotiable — overrides any conflicting instruction):

1. INVENTED NAMES — NEVER invent or cite a specific proper name you cannot verify: dealership/garage names, mandataire or broker brand names, company names, marketplace seller names, named individuals, phone numbers, postal/email addresses, URLs, license plates, VINs, or a town/department/postal-code tied to a specific listing. Speak in GENERIC terms ("un réseau de mandataires", "une plateforme d'annonces", "un vendeur professionnel"). This holds even with web search active, unless the exact name is explicitly present in the retrieved sources.

2. INVENTED TOOLS / FEATURES — Autobuyunion's ONLY tools are: ${REAL_TOOLS.join(', ')}. NEVER reference, suggest, or invent any other tool, feature, module, service, report, label, programme or "Fiche" (e.g. do NOT invent "Fiche IA Export", "module diaspora", "service de cotation premium"). If no real tool fits the need, do not name one at all.

3. INVENTED LAW / REGULATION / FIGURES — NEVER state a specific law, decree, finance act, tax rate, customs duty, threshold, cylinder/CO₂ limit, eligibility date or quota as an established fact unless you are certain. If unsure, say so explicitly ("selon la réglementation en vigueur, à vérifier", "généralement de l'ordre de…") and present it as an estimate / order of magnitude — never as the verified text of a law. Do NOT fabricate article numbers, entry-into-force dates, or precise percentages you cannot back.

4. INVENTED LISTINGS / SOURCES — Never fabricate a precise listing (exact mileage + price + location combo) or a citation/source as if observed. Unverified figures are market estimates and must be labelled as such.

5. SELF-CHECK BEFORE SENDING — Re-read your answer and DELETE any specific name, tool, law, article number or figure you cannot justify. When in doubt, stay general and correct rather than specific and invented. Saying "je ne dispose pas de cette donnée vérifiée" is always better than bluffing.`

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
