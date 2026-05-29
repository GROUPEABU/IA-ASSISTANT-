import { sendMessage } from './claude'

const SCHEMA = `{
  "id": "generated-<marque-modele-annee>",
  "brand": "Marque",
  "model": "Modèle",
  "fullName": "Marque Modèle",
  "year": 2024,
  "segment": "Catégorie (ex: SUV Compact B/C)",
  "origin": "Pays (Groupe)",
  "status": "available",
  "tagline": "Phrase accrocheuse courte",
  "specs": {
    "motorisation": "ex: 1.5T Turbo Essence",
    "puissance": "ex: 130 ch (96 kW)",
    "couple": "ex: 240 Nm",
    "transmission": "ex: Manuelle 6 rapports",
    "traction": "ex: Traction avant",
    "co2_wltp": 125,
    "consommation": "5.5 L/100km",
    "autonomie_wltp": 0,
    "longueur": 4200,
    "largeur": 1780,
    "hauteur": 1520,
    "empattement": 2580,
    "coffre": 380,
    "reservoir": 55,
    "poids": 1250
  },
  "prix": { "base": 25000, "haut": 32000, "devise": "EUR" },
  "garantie": {
    "vehicule": "ex: 5 ans ou 100 000 km",
    "peinture": "ex: 3 ans",
    "anticorrosion": "ex: 12 ans",
    "assistance": "ex: 3 ans Europe"
  },
  "equipements": ["équipement 1", "équipement 2", "équipement 3"],
  "concurrents": [
    { "nom": "Concurrent 1", "prix": 26000, "co2": 120 },
    { "nom": "Concurrent 2", "prix": 28000, "co2": 135 },
    { "nom": "Concurrent 3", "prix": 30000, "co2": 140 },
    { "nom": "Concurrent 4", "prix": 24000, "co2": 110 }
  ],
  "btob": {
    "cibles": ["cible 1", "cible 2"],
    "atouts": ["atout 1", "atout 2", "atout 3"],
    "objections": ["objection 1", "objection 2"],
    "remise_cible": "5-8%"
  },
  "btoc": {
    "cibles": ["cible 1", "cible 2"],
    "atouts": ["atout 1", "atout 2", "atout 3"],
    "objections": ["objection 1", "objection 2"],
    "argument_prix": "Argument principal"
  },
  "marche": {
    "part_marche_cible": "2%",
    "croissance_segment": "+5% en 2024",
    "tendance": "Description tendance marché",
    "risques": "Risques principaux",
    "opportunites": "Opportunités de marché"
  }
}`

export async function generateProductFromWeb(query) {
  const prompt = `Tu es expert automobile et analyste marché pour Autobuyunion, 1er groupement européen d'achat auto.

L'utilisateur demande une fiche produit pour : "${query}"

Génère une fiche produit automobile COMPLÈTE et PRÉCISE basée sur tes connaissances réelles de ce véhicule.
Utilise les vraies caractéristiques techniques officielles (homologation WLTP, prix catalogue France 2024/2025, équipements de série, concurrents directs).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, en respectant exactement ce schéma :

${SCHEMA}

Règles importantes :
- co2_wltp : valeur WLTP officielle en g/km (entier)
- prix en euros TTC catalogue France
- liste 4 concurrents directs réels avec leurs vrais prix et CO2
- équipements : liste des 8-12 équipements de série principaux
- id : format "generated-<marque>-<modele>-<annee>" en minuscules sans espaces
- Toutes les valeurs numériques sont des nombres (pas de chaînes)
- autonomie_wltp : autonomie totale WLTP en km (électrique/hybride = autonomie réelle ; thermique = 0)
- garantie : durées constructeur officielles réelles de la marque
- Pour les versions multiples (ex: essence + hybride), prendre la version essence de base`

  const raw = await sendMessage([{ role: 'user', content: prompt }], { maxTokens: 2500, expert: true })

  // Extraire le JSON de la réponse
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Impossible de parser la réponse IA. Réessayez.')

  const product = JSON.parse(match[0])

  // Validation basique
  if (!product.brand || !product.specs?.co2_wltp || !product.prix?.base) {
    throw new Error('Données incomplètes générées. Réessayez avec un nom de véhicule plus précis.')
  }

  // S'assurer que les types sont corrects
  product.specs.co2_wltp = Number(product.specs.co2_wltp)
  product.prix.base = Number(product.prix.base)
  product.prix.haut = Number(product.prix.haut)
  product._generated = true
  product._generatedAt = new Date().toISOString()

  return product
}
