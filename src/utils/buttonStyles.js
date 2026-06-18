/**
 * Hiérarchie d'emphase des boutons d'action (barres de rapport / d'outils).
 * Source de vérité unique, alignée sur les variantes de `Button.jsx` :
 *
 *  - SECONDARY : action de soutien la plus visible (contour cyan).
 *  - TERTIARY  : options discrètes (contour neutre, cyan au survol seulement).
 *  - QUIET     : action minimale sans contour (ex. « nouvelle analyse », reset).
 *
 * Règle : une seule action `primary` (plein cyan) par écran — gérée à part car
 * elle porte souvent un Spinner / un état de chargement. Tout le reste descend
 * d'un cran via ces classes.
 */
const BASE = 'flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition flex-shrink-0'

export const BTN_SECONDARY = `${BASE} text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10`
export const BTN_TERTIARY  = `${BASE} text-slate-400 border border-white/10 hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5`
export const BTN_QUIET     = 'flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-navy-700/30 transition flex-shrink-0'
