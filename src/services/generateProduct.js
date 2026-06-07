import { sendMessage } from './claude'

const STATIC_FICHEAI = `⚠️ MOTORISATION EXACTE : si une motorisation est indiquée dans la requête ou les précisions, traite EXACTEMENT celle-là, jamais une autre variante. Un « hybride » simple / micro-hybride / full hybrid n'est PAS un « hybride rechargeable » (plug-in / PHEV) : ne parle de recharge, de prise, de batterie plug-in ou d'autonomie 100 % électrique QUE si le véhicule est EXPLICITEMENT rechargeable. UNIQUEMENT si AUCUNE motorisation n'est précisée et que le modèle existe en plusieurs versions, prends la version essence/thermique d'entrée de gamme.

⚠️ GÉNÉRATIONS : en cas de changement de génération récent, ne confonds pas le catalogue de la nouvelle génération avec les caractéristiques/occasions de l'ancienne. Le badge de motorisation/puissance est souvent le marqueur de génération : respecte-le.

═══ RECHERCHE WEB (obligatoire pour prix et concurrents — ne JAMAIS inventer ces chiffres) ═══
Utilise la recherche web (3 à 5 requêtes), par ordre de priorité :
1. prix.base / prix.haut : prix catalogue France NEUF actuel (TTC). Si une finition est précisée, base = prix catalogue de CETTE finition et haut = même finition correctement optionnée ; si aucune finition n'est précisée, base = entrée de gamme et haut = version haute de la motorisation demandée.
2. prix.premier_net : niveau réel des « premiers du net » en VO récent (La Centrale / LeBonCoin). Même rigueur que l'analyse de cote : écarte les annonces aberrantes (quasi-neufs surcotés, mauvaise génération, erreurs de saisie, finition supérieure), ANCRE-toi sur le BAS du cluster réel, prix TTC, toujours INFÉRIEUR au catalogue base. Si un kilométrage est précisé dans les détails, cale le premier du net sur cette tranche de km. Ce premier_net est un chiffre REPÈRE (cœur de marché) : si une analyse de cote détaillée (outil Veille Prix) existe par ailleurs pour ce véhicule, c'est ELLE qui fait foi.
3. concurrents : 4 concurrents directs réels avec leurs vrais prix catalogue et CO₂ WLTP actuels (une recherche comparative suffit souvent).
Les specs techniques et la garantie peuvent venir de tes connaissances, mais VÉRIFIE par recherche pour tout modèle récent ou récemment renouvelé. Si une donnée reste introuvable, donne une estimation crédible et cohérente — ne la présente jamais comme certaine.
Ne mentionne JAMAIS tes recherches, n'inclus aucune citation, aucun lien, aucun commentaire : ta sortie est UNIQUEMENT le JSON.

Génère une fiche produit automobile COMPLÈTE et PRÉCISE. Les valeurs du schéma ci-dessous sont des exemples illustratifs : remplace-les TOUTES par les vraies données du véhicule demandé.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, en respectant exactement ce schéma :

{
  "id": "generated-<marque-modele-annee>",
  "brand": "Marque",
  "model": "Modèle",
  "fullName": "Marque Modèle",
  "year": 2025,
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
  "prix": { "base": 25000, "haut": 32000, "premier_net": 21000, "devise": "EUR" },
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
    "croissance_segment": "+5% en 2025",
    "tendance": "Description tendance marché",
    "risques": "Risques principaux",
    "opportunites": "Opportunités de marché"
  }
}

Règles importantes :
- year : millésime RÉEL du véhicule demandé, jamais une valeur par défaut.
- co2_wltp : valeur WLTP officielle en g/km (entier). Donnée technique ; elle n'autorise aucun discours fiscal (voir interdit).
- prix.base / prix.haut : euros TTC catalogue France NEUF actuel (recherche web), selon la règle finition ci-dessus.
- prix.premier_net : premiers du net VO récents (recherche web), bas de cluster réel, en € TTC, toujours INFÉRIEUR au catalogue base.
- concurrents : EXACTEMENT 4 concurrents directs réels avec vrais prix catalogue et CO₂ (recherche web).
- equipements : 8 à 12 équipements de série principaux.
- btob.cibles : TYPES DE REVENDEURS / canaux de revente (concessions multimarques, négociants, agents, exportateurs) — JAMAIS des flottes ou entreprises utilisateurs finaux.
- btob.remise_cible : remise (en %) que le partenaire revendeur peut consentir SOUS le prix marché moyen tout en restant margé, grâce à son prix d'achat bas — pas une remise utilisateur final.
- marche : part_marche_cible, croissance_segment et tendances doivent s'appuyer sur des éléments réels ou rester qualitatifs ; n'invente pas de statistique précise donnée comme certaine.
- garantie : durées constructeur officielles RÉELLES du NEUF de la marque. Sur un VO, la couverture résiduelle dépend de la date de 1re immatriculation (à ne pas présenter comme une garantie pleine).
- id : format "generated-<marque>-<modele>-<annee>" en minuscules sans espaces.
- Toutes les valeurs numériques sont des nombres (pas de chaînes).
- autonomie_wltp : autonomie ÉLECTRIQUE WLTP réelle UNIQUEMENT pour un véhicule rechargeable (plug-in) ou 100 % électrique. Pour tout véhicule NON rechargeable (thermique, micro-hybride, full hybrid non rechargeable) = 0.

INTERDIT (champs texte générés : tagline, atouts, objections, argument_prix, tendance, risques, opportunites) : aucune mention de malus, écotaxe, malus écologique, malus au poids ni taxation CO₂ (sujet traité par un outil dédié). Consommation et CO₂ ne servent que d'argument d'économie / sobriété, jamais fiscal. Les atouts/objections BtoB raisonnent MARGE et REVENTE (partenaires revendeurs) ; les BtoC raisonnent usage et économie (utilisateur final).

CONTRAINTES DE FORME : JSON complet et valide — tous les champs remplis, exactement 4 concurrents, guillemets fermés, aucune virgule finale, aucun texte / commentaire / citation / balise markdown avant ou après.`

export async function generateProductFromWeb(query, details = '') {
  const prompt = `L'utilisateur demande une fiche produit pour : "${query}"
${details ? `Précisions à RESPECTER STRICTEMENT (motorisation, finition, carrosserie, millésime, kilométrage) : ${details}.` : ''}`

  const raw = await sendMessage([{ role: 'user', content: prompt }], {
    maxTokens: 6000, expert: true, temperature: 0.25,
    tool: 'ficheIA', stream: true,
    systemStatic: STATIC_FICHEAI,
    webSearch: true, maxSearches: 3,
  })

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
