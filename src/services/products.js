export const PRODUCTS = [
  {
    id: 'jaecoo-5',
    brand: 'JAECOO',
    model: 'J5',
    fullName: 'JAECOO J5',
    year: 2024,
    segment: 'SUV Compact (B/C)',
    origin: 'Chine (Chery Group)',
    status: 'new', // new | soon | available
    tagline: 'SUV compact audacieux, technologique et accessible',
    image: null, // URL image à ajouter
    colors: ['Blanc nacré', 'Noir minuit', 'Gris anthracite', 'Bleu steel'],

    specs: {
      motorisation: '1.5T Turbo Essence',
      puissance: '147 ch (108 kW)',
      couple: '230 Nm',
      transmission: 'Automatique CVT',
      traction: 'Traction avant (FWD)',
      co2_wltp: 158,
      consommation: '6,8 L/100km',
      longueur: 4382,
      largeur: 1835,
      hauteur: 1630,
      empattement: 2650,
      coffre: 412,
      reservoir: 60,
      poids: 1420,
    },

    prix: {
      base: 24990,
      haut: 29990,
      devise: 'EUR',
    },

    equipements: [
      'Écran tactile 10.25"', 'Climatisation automatique bizone',
      'Caméra de recul 360°', 'Régulateur de vitesse adaptatif',
      'Alerte franchissement de ligne', 'Freinage automatique d\'urgence',
      'Sièges chauffants avant', 'Chargement sans fil',
      'Système audio 6 haut-parleurs', 'Toit ouvrant panoramique (finitions hautes)',
    ],

    concurrents: [
      { nom: 'Dacia Duster', prix: 22990, co2: 153 },
      { nom: 'MG ZS', prix: 25990, co2: 150 },
      { nom: 'Opel Mokka', prix: 26490, co2: 138 },
      { nom: 'Peugeot 2008', prix: 27490, co2: 127 },
    ],

    btob: {
      cibles: ['Flottes PME', 'Artisans & commerçants', 'Auto-écoles', 'Véhicules de service'],
      atouts: [
        'Rapport équipement/prix très compétitif pour les flottes',
        'Garantie 3 ans / 100 000 km constructeur',
        'Faibles coûts d\'entretien prévus',
        'Disponibilité de financement dédié flotte',
      ],
      objections: [
        'Réseau SAV encore en développement en France',
        'Valeur résiduelle à confirmer sur le marché de l\'occasion',
      ],
      remise_cible: '8-12%',
    },

    btoc: {
      cibles: ['Familles primo-accédantes', '25-45 ans urbains/périurbains', 'Clients sensibles au prix'],
      atouts: [
        'Prix d\'entrée très accessible pour le segment',
        'Équipement généreux de série',
        'Design moderne et distinctif',
        'Garantie rassurante pour un achat premium low-cost',
      ],
      objections: [
        'Marque peu connue du grand public',
        'Incertitude sur la valeur de revente',
        'Malus significatif à intégrer dans le budget',
      ],
      argument_prix: 'Meilleur rapport équipement/prix de sa catégorie',
    },

    marche: {
      part_marche_cible: '1,2%',
      croissance_segment: '+8,4% en 2024',
      tendance: 'Le segment SUV compact B/C est le plus dynamique d\'Europe. Les marques chinoises gagnent +3,1 pts de PDM en 2024.',
      risques: 'Droits de douane UE sur véhicules chinois (+27,5% depuis juil. 2024). Impact prix à surveiller.',
      opportunites: 'Forte appétence pour les SUV compacts abordables. Positionnement prix agressif vs concurrence européenne.',
    },
  },

  {
    id: 'jaecoo-6',
    brand: 'JAECOO',
    model: 'J6',
    fullName: 'JAECOO J6',
    year: 2024,
    segment: 'SUV Intermédiaire (C/D)',
    origin: 'Chine (Chery Group)',
    status: 'soon',
    tagline: 'SUV intermédiaire premium, élégant et connecté',
    image: null,
    colors: ['Blanc lunaire', 'Noir cosmos', 'Gris titanium', 'Bordeaux deep'],

    specs: {
      motorisation: '1.5T Turbo Essence / Hybride 48V',
      puissance: '156 ch (115 kW)',
      couple: '245 Nm',
      transmission: 'Automatique 7 DCT',
      traction: 'Traction avant / 4WD optionnel',
      co2_wltp: 162,
      consommation: '7,1 L/100km',
      longueur: 4520,
      largeur: 1865,
      hauteur: 1655,
      empattement: 2710,
      coffre: 468,
      reservoir: 65,
      poids: 1510,
    },

    prix: {
      base: 28990,
      haut: 35990,
      devise: 'EUR',
    },

    equipements: [
      'Écran tactile 12.3" + combiné 10.3"', 'Climatisation trizone',
      'Caméra 360° + aide au parking automatique', 'Régulateur adaptatif avec stop & go',
      'Toit ouvrant panoramique électrique', 'Sièges avant ventilés & chauffants',
      'Système audio premium 8 HP', 'Chargement sans fil 50W',
      'Head-Up Display', 'Phares LED matriciels',
      'Sellerie cuir / simili cuir', 'Hayon électrique mains libres',
    ],

    concurrents: [
      { nom: 'Peugeot 3008', prix: 34990, co2: 131 },
      { nom: 'Volkswagen Tiguan', prix: 37490, co2: 136 },
      { nom: 'Kia Sportage', prix: 32990, co2: 144 },
      { nom: 'MG HS', prix: 30990, co2: 158 },
    ],

    btob: {
      cibles: ['Cadres & dirigeants', 'Véhicules de direction', 'Flottes premium PME', 'Secteur santé / immobilier'],
      atouts: [
        'Finition et équipements niveau premium à prix C/D',
        'Image distincte et haut de gamme',
        'Hayon électrique et connectivité pour usage pro intensif',
        'Garantie étendue disponible',
      ],
      objections: [
        'Marque à évangéliser auprès des décideurs',
        'TCO à calculer (consommation, malus, assurance)',
      ],
      remise_cible: '10-14%',
    },

    btoc: {
      cibles: ['Familles avec enfants', '35-55 ans CSP+', 'Amateurs de SUV premium à budget maîtrisé'],
      atouts: [
        'Équipements haut de gamme de série (HUD, toit pano, ventilation siège)',
        'Intérieur spacieux et premium',
        'Technologie connectée avancée',
        'Prix 10-15k€ sous la concurrence européenne équivalente',
      ],
      objections: [
        'Malus élevé à anticiper dans le budget total',
        'Réseau de distribution / service après-vente à renforcer',
      ],
      argument_prix: 'L\'équipement d\'un SUV à 40 000€ pour moins de 36 000€',
    },

    marche: {
      part_marche_cible: '0,8%',
      croissance_segment: '+5,2% en 2024',
      tendance: 'Segment C/D porté par les SUV familiaux. Les clients cherchent du volume, de la technologie et un prix maîtrisé.',
      risques: 'Concurrence accrue des hybrides européens. Droits de douane UE sur véhicules chinois.',
      opportunites: 'Gap de positionnement entre les low-cost et les premium. Le J6 peut se positionner en "premium accessible".',
    },
  },
]

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id)
}
