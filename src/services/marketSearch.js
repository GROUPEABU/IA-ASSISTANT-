export const STATIC_MARKET = `⚠️ MOTORISATION & GÉNÉRATION : respecte EXACTEMENT l'énergie et la version du véhicule analysé. Un hybride simple / micro-hybride / full hybrid n'est PAS un hybride rechargeable (plug-in / PHEV) : ne parle de recharge, de prise ou d'autonomie 100 % électrique que si le véhicule est EXPLICITEMENT rechargeable. En cas de changement de génération récent, ne confonds pas la nouvelle génération avec l'ancienne (le badge de puissance est souvent le marqueur de génération). L'énergie conditionne toute l'analyse (décote, demande, accès ZFE) : ne te trompe pas de motorisation.

RÈGLE DE SYNTHÈSE (toujours, quelle que soit la source) : reformule TOUJOURS avec tes propres mots. Ne recopie jamais verbatim un article, une annonce ou un tableau de cote propriétaire (Argus, La Centrale) : extrais et synthétise les chiffres clés. Ta sortie est une analyse rédigée, pas un copier-coller.

Rédige une analyse COMPLÈTE et CHIFFRÉE en 5 parties, basée sur les vraies données :

**1. MARCHÉ VN — Véhicules Neufs**
Volumes, tendance des immatriculations, part de marché, promotions concessionnaires, délais de livraison.

**2. MARCHÉ VO — Véhicules d'Occasion**
Cotes actuelles synthétisées (Argus / La Centrale), prix moyens par année / km, décote à 1 / 2 / 3 ans, tension offre-demande. Pour les premiers du net, ancre-toi sur le bas du cluster réel et écarte les annonces aberrantes (quasi-neufs surcotés, mauvaise génération, erreurs de saisie).

**3. POSITIONNEMENT PRIX**
Prix neuf vs concurrence directe, remises réellement pratiquées sur le marché, budget total acheteur (prix d'acquisition et coût d'usage). N'inclus AUCUN calcul ni mention de malus / écotaxe / taxation CO₂ : ce sujet est traité par un outil dédié.

**4. TENDANCES & SIGNAUX MARCHÉ**
Actualité du modèle, évolutions de gamme, électrification du segment, et impact des ZFE comme facteur de DEMANDE (éligibilité Crit'Air, soutien à la valeur résiduelle des énergies favorisées) — jamais comme pénalité ou coût pour l'acheteur.

**5. RECOMMANDATIONS AUTOBUYUNION**
Actions concrètes : timing optimal d'achat, leviers de négociation, et priorités côté partenaires REVENDEURS (quels modèles / marchés de revente font tourner le stock, marge dégageable) comme côté BtoC (utilisateur final).
LEVIER SOURCING MULTI-MARCHÉS : signale les écarts de prix entre la France et les marchés de sourcing (Allemagne via AutoScout24 / mobile.de, etc.). Un prix d'achat plus bas hors-France, transport inclus, est un levier de marge clé pour les partenaires — quantifie l'écart quand c'est possible.
POSITIONNEMENT PRIX OBLIGATOIRE : identifie les prix les plus compétitifs du marché (premiers du net, top 20 % des annonces les moins chères, hors aberrations). Recommande un prix de vente TTC positionné AU NIVEAU des premiers du net (au plus bas du cluster réaliste), pour placer les partenaires parmi les offres les plus attractives visibles sur La Centrale / LeBonCoin / AutoScout24 — JAMAIS sur la moyenne haute du marché. Les partenaires achètent en volume à prix HT et doivent transmettre cet avantage en prix TTC compétitif.

Sois précis, chiffré, sobre (aucun emoji, aucun symbole décoratif) et directement utilisable par nos équipes commerciales.

INTERDIT : n'écris jamais « malus », « écotaxe », « malus écologique », « malus au poids » ni aucun calcul de taxation CO₂ — sujet traité par un outil dédié. Le CO₂ et la consommation ne servent que d'arguments d'économie / sobriété, jamais d'argument fiscal.`

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
      snippets.map((s) => `=== ${s.source} ===\n${s.content}`).join('\n\n') +
      `\n\n→ Base ton analyse sur ces données réelles ; ne les contredis pas par des suppositions.`
    : `\n\nRECHERCHE WEB : utilise ton outil de recherche web pour trouver les données marché actuelles (immatriculations, cotes L'Argus / La Centrale, prix VO, actualité du modèle) AVANT de rédiger. N'affiche jamais de message d'« erreur » ni de « données indisponibles ». Si une donnée précise reste introuvable, donne un ordre de grandeur clairement présenté comme une estimation et complète par ta connaissance experte du marché français — n'invente JAMAIS une statistique précise donnée comme certaine.`

  return `Analyse le marché du ${vehicle} en France, sur la conjoncture actuelle et le millésime réel du véhicule.${webContext}

Données produit de référence :
- Segment : ${product.segment}
- CO₂ WLTP : ${product.specs.co2_wltp} g/km
- Prix neuf : ${product.prix.base.toLocaleString('fr-FR')}€ – ${product.prix.haut.toLocaleString('fr-FR')}€
- Concurrents : ${product.concurrents.map(c => `${c.nom} (${c.prix.toLocaleString('fr-FR')}€)`).join(', ')}${langInstruction}`
}
