/**
 * Normalise une fiche produit pour garantir un schéma complet et sûr.
 *
 * Les fiches générées par IA ou importées peuvent manquer de champs
 * (colors, concurrents, marche…). Les composants d'affichage accèdent à
 * ces champs directement (ex: `product.colors.slice`, `product.concurrents.map`,
 * `product.marche.croissance_segment.split`). Cette fonction comble tous les
 * trous avec des valeurs sûres pour éviter tout crash, sans écraser les
 * données réelles existantes.
 */
export function normalizeProduct(p) {
  if (!p) return p
  const s = p.specs || {}
  const prix = p.prix || {}
  const btob = p.btob || {}
  const btoc = p.btoc || {}
  const marche = p.marche || {}

  return {
    ...p,
    brand: p.brand ?? '',
    model: p.model ?? '',
    fullName: p.fullName ?? p.model ?? '—',
    year: p.year ?? new Date().getFullYear(),
    segment: p.segment ?? '—',
    origin: p.origin ?? '—',
    status: p.status ?? 'available',
    tagline: p.tagline ?? '',
    image: p.image ?? null,
    colors: Array.isArray(p.colors) ? p.colors : [],
    finitions: Array.isArray(p.finitions) ? p.finitions : [],
    equipements: Array.isArray(p.equipements) ? p.equipements : [],
    concurrents: Array.isArray(p.concurrents) ? p.concurrents : [],
    specs: {
      ...s,
      motorisation: s.motorisation ?? 'N/C',
      puissance: s.puissance ?? 'N/C',
      couple: s.couple ?? 'N/C',
      transmission: s.transmission ?? 'N/C',
      traction: s.traction ?? 'N/C',
      co2_wltp: Number(s.co2_wltp) || 0,
      consommation: s.consommation ?? 'N/C',
      autonomie_wltp: s.autonomie_wltp ?? 0,
      coffre: s.coffre ?? null,
    },
    prix: {
      base: Number(prix.base) || 0,
      haut: Number(prix.haut) || Number(prix.base) || 0,
      devise: prix.devise ?? 'EUR',
    },
    btob: {
      cibles: Array.isArray(btob.cibles) ? btob.cibles : [],
      atouts: Array.isArray(btob.atouts) ? btob.atouts : [],
      objections: Array.isArray(btob.objections) ? btob.objections : [],
      remise_cible: btob.remise_cible ?? 'N/C',
    },
    btoc: {
      cibles: Array.isArray(btoc.cibles) ? btoc.cibles : [],
      atouts: Array.isArray(btoc.atouts) ? btoc.atouts : [],
      objections: Array.isArray(btoc.objections) ? btoc.objections : [],
      argument_prix: btoc.argument_prix ?? '',
    },
    marche: {
      part_marche_cible: marche.part_marche_cible ?? 'N/C',
      croissance_segment: marche.croissance_segment ?? 'N/C',
      tendance: marche.tendance ?? '',
      risques: marche.risques ?? '',
      opportunites: marche.opportunites ?? '',
    },
  }
}
