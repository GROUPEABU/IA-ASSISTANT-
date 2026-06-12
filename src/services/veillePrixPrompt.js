// ════════════════════════════════════════════════════════════════════════════
// PROMPT VEILLE PRIX — SOURCE DE VÉRITÉ UNIQUE (VERROUILLÉ)
// ════════════════════════════════════════════════════════════════════════════
// La méthodologie complète (garde-fous, formule d'achat, grille km, format de
// sortie) est désormais construite côté serveur dans api/chat.js par la
// fonction buildVeilleprixPrompt — elle ne transite plus dans le bundle client.
//
// Ce module envoie un sentinel JSON {"_veilleprixParams":true,...} comme
// contenu du message utilisateur. Le proxy le intercepte avant transmission
// à l'API Anthropic et le remplace par le prompt complet reconstruit.
//
// ⚠️ VERROUILLÉ : toute modification de la méthodologie, des garde-fous ou du
// format de sortie doit être faite dans api/chat.js (buildVeilleprixPrompt).
// AUCUNE modification automatique. Toute retouche requiert une demande
// explicite de l'utilisateur.
// ════════════════════════════════════════════════════════════════════════════

export function buildPrompt(filters, vehicleDesc, ctry, margin = 3000) {
  return JSON.stringify({
    _veilleprixParams: true,
    filters,
    vehicleDesc,
    ctry,
    margin: Number(margin || 3000),
  })
}
