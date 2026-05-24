export async function fetchMarketData(vehicle) {
  const res = await fetch(`/api/market-data?vehicle=${encodeURIComponent(vehicle)}`)
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
  return res.json()
}

export function buildMarketPrompt(vehicle, snippets, product) {
  const webContext = snippets.length > 0
    ? `\n\nDONNÉES WEB RÉCENTES COLLECTÉES :\n${snippets.map((s, i) =>
        `[${i + 1}] ${s.source}\nTitre: ${s.title}\nExtrait: ${s.description}\nURL: ${s.url}`
      ).join('\n\n')}`
    : ''

  return `Tu es expert marché automobile pour Autobuyunion, 1er groupement européen d'achat auto.

Analyse le marché du ${vehicle} en France en 2024/2025 à partir des données web ci-dessous ET de tes connaissances.${webContext}

Données produit :
- Segment : ${product.segment}
- CO₂ WLTP : ${product.specs.co2_wltp} g/km
- Prix neuf : ${product.prix.base.toLocaleString('fr-FR')}€ - ${product.prix.haut.toLocaleString('fr-FR')}€
- Concurrents : ${product.concurrents.map(c => `${c.nom} (${c.prix.toLocaleString('fr-FR')}€)`).join(', ')}

Génère une analyse COMPLÈTE en 5 parties :

**1. MARCHÉ VN (Véhicules Neufs)**
Volumes de ventes, tendances immatriculations, parts de marché segment, promotions concessionnaires actuelles.

**2. MARCHÉ VO (Véhicules d'Occasion)**
Cotes argus actuelles, délais de rotation, prix moyens VO, décote à 1/2/3 ans, tension offre/demande.

**3. POSITIONNEMENT PRIX**
Analyse du prix neuf vs concurrence, remises pratiquées sur le marché, budget total acheteur (malus inclus).

**4. TENDANCES & SIGNAUX**
Actualité du modèle, évolutions gamme prévues, impact électrification, réglementation ZFE.

**5. RECOMMANDATIONS AUTOBUYUNION**
Actions concrètes pour nos membres : timing d'achat optimal, levier de négociation, cibles prioritaires BtoB/BtoC.

${snippets.length > 0 ? 'Base-toi en priorité sur les données web collectées, complète avec tes connaissances.' : 'Utilise tes connaissances les plus récentes disponibles, mentionne la date de tes données.'}
Sois précis, chiffré et directement actionnable.`
}
