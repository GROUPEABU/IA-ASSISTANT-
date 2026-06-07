/**
 * Pont LECTURE SEULE vers les résultats de la Veille Prix.
 *
 * La Veille Prix (PriceWatch.jsx) est verrouillée : on n'y touche pas. Mais son
 * rapport Markdown est déjà persisté dans l'historique localStorage. Ce module
 * relit cet historique, retrouve l'analyse correspondant à un véhicule et en
 * extrait le « 1er du net » pour que les outils aval (Fiche IA, Pitch,
 * Rapport commercial, Analyse marché) s'alignent sur les MÊMES montants —
 * une seule source de vérité, sans recalcul divergent.
 *
 * Confidentialité : on n'expose QUE la revente conseillée (1er du net, TTC),
 * jamais le prix d'achat pro HT (donnée interne, risque de fuite de marge).
 */
import { ukey, getSessionUserId } from '@/utils/userStorage'

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()

// Extrait une fourchette de montants (€) d'une ligne étiquetée du rapport.
// Gère les séparateurs de milliers FR (espace, espace insécable, point) et
// ignore les montants entre parenthèses (ex. « marge 3 000 € HT incluse »).
function rangeFromLabeledLine(report, labelRe) {
  const line = report.split('\n').find((l) => labelRe.test(l))
  if (!line) return null
  const seg = line.split(':').slice(1).join(':').split('(')[0] // après le 1er ':' , avant une parenthèse
  const nums = (seg.match(/\d[\d\s  .]*\d/g) || [])
    .map((x) => parseInt(x.replace(/[^\d]/g, ''), 10))
    .filter((n) => Number.isFinite(n) && n >= 1000 && n <= 500000)
  if (!nums.length) return null
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

/** Extrait les chiffres clés d'un rapport Veille Prix Markdown. */
export function parseVeillePrixReport(report = '') {
  if (typeof report !== 'string' || !report) return null
  const reventeNetTTC = rangeFromLabeledLine(report, /revente conseill/i)
  if (!reventeNetTTC) return null
  return { reventeNetTTC }
}

/**
 * Retrouve la dernière analyse Veille Prix correspondant au véhicule donné.
 * Match : tous les mots significatifs du nom (marque+modèle) présents dans le
 * libellé de recherche enregistré. L'historique est déjà trié (plus récent en
 * tête), on renvoie donc la première correspondance valide.
 */
export function findLatestVeillePrix(vehicleName) {
  const tokens = norm(vehicleName).split(' ').filter((t) => t.length >= 2)
  if (!tokens.length) return null
  let hist = []
  try {
    hist = JSON.parse(localStorage.getItem(ukey(getSessionUserId(), 'history_pricewatch')) || '[]')
  } catch { return null }
  if (!Array.isArray(hist)) return null
  for (const item of hist) {
    const label = norm(item?.searchLabel || '')
    if (tokens.every((tok) => label.includes(tok))) {
      const figures = parseVeillePrixReport(item.report || '')
      if (figures) return { ...figures, searchLabel: item.searchLabel, fetchedAt: item.fetchedAt || item.savedAt }
    }
  }
  return null
}

/**
 * Bloc de prompt à injecter dans les outils aval : aligne le 1er du net sur la
 * Veille Prix quand une analyse existe. Chaîne vide si aucune correspondance
 * (l'outil garde alors son comportement actuel).
 */
export function veillePrixRefBlock(vehicleName) {
  const v = findLatestVeillePrix(vehicleName)
  if (!v) return ''
  const fmt = (n) => n.toLocaleString('fr-FR')
  const r = v.reventeNetTTC
  const val = r.min === r.max ? `${fmt(r.min)} € TTC` : `${fmt(r.min)} – ${fmt(r.max)} € TTC`
  return `\n\nRÉFÉRENCE VEILLE PRIX (une analyse de cote détaillée existe déjà pour ce véhicule — ce niveau de prix FAIT FOI : aligne le 1er du net / premier_net dessus, n'invente pas un autre prix) :\n- 1er du net (revente conseillée) : ${val}`
}
