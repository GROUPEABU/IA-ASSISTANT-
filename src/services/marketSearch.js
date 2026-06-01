export async function fetchMarketData(vehicle) {
  const res = await fetch(`/api/market-data?vehicle=${encodeURIComponent(vehicle)}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export function buildMarketPrompt(vehicle, snippets, product, lang = 'fr') {
  const LANG_NAMES = { fr: 'French', en: 'English', de: 'German', it: 'Italian', es: 'Spanish' }
  const langName = LANG_NAMES[lang] || 'French'
  const langInstruction = lang !== 'fr' ? `\n\nIMPORTANT: Write your entire response in ${langName}.` : ''
  const webContext = snippets.length > 0
    ? `\n\nDONNÉES COLLECTÉES EN TEMPS RÉEL (${snippets.map(s => s.source).join(', ')}) :\n\n` +
      snippets.map((s) => `=== ${s.source} ===\n${s.content}`).join('\n\n')
    : `\n\nRECHERCHE WEB : utilise ton outil de recherche web pour trouver les données marché actuelles (immatriculations, cotes L'Argus/La Centrale, prix VO, actualité du modèle) AVANT de rédiger. Ne mentionne jamais d'« erreur » ni de « données indisponibles » : décris ce que tu as trouvé et complète par ta connaissance experte du marché français.`

  return `Tu es expert marché automobile pour Autobuyunion, 1er groupement européen d'achat auto.

Analyse le marché du ${vehicle} en France en 2024/2025.${webContext}

Données produit de référence :
- Segment : ${product.segment}
- CO₂ WLTP : ${product.specs.co2_wltp} g/km
- Prix neuf : ${product.prix.base.toLocaleString('fr-FR')}€ – ${product.prix.haut.toLocaleString('fr-FR')}€
- Concurrents : ${product.concurrents.map(c => `${c.nom} (${c.prix.toLocaleString('fr-FR')}€)`).join(', ')}

Rédige une analyse COMPLÈTE et CHIFFRÉE en 5 parties basée sur les vraies données ci-dessus :

**1. MARCHÉ VN — Véhicules Neufs**
Volumes, tendances immatriculations, part de marché, promotions concessionnaires, délais de livraison.

**2. MARCHÉ VO — Véhicules d'Occasion**
Cotes actuelles L'Argus / La Centrale, prix moyens par année/km, décote à 1/2/3 ans, tension offre/demande.

**3. POSITIONNEMENT PRIX**
Prix neuf vs concurrence directe, remises pratiquées sur le marché, budget total acheteur malus inclus.

**4. TENDANCES & SIGNAUX MARCHÉ**
Actualité du modèle, évolutions gamme, impact ZFE, électrification du segment.

**5. RECOMMANDATIONS AUTOBUYUNION**
Actions concrètes : timing optimal d'achat, leviers de négociation, cibles BtoB/BtoC prioritaires, argument prix.

Sois précis, chiffré, et directement utilisable par nos équipes commerciales.${langInstruction}`
}
