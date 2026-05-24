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
    id: 'jaecoo-7',
    brand: 'JAECOO',
    model: 'J7',
    fullName: 'JAECOO J7',
    year: 2024,
    segment: 'SUV Grand Familial (D/E) — 7 places',
    origin: 'Chine (Chery Group)',
    status: 'soon',
    tagline: 'Grand SUV 7 places, technologique et généreux',
    image: null,
    colors: ['Blanc lunaire', 'Noir cosmos', 'Gris titanium', 'Bordeaux deep'],

    specs: {
      motorisation: '2.0T Turbo Essence',
      puissance: '261 ch (192 kW)',
      couple: '390 Nm',
      transmission: 'Automatique 8 DCT',
      traction: 'Traction avant / 4WD disponible',
      co2_wltp: 182,
      consommation: '8,2 L/100km',
      longueur: 4785,
      largeur: 1900,
      hauteur: 1745,
      empattement: 2800,
      coffre: 310,
      reservoir: 75,
      poids: 1820,
    },

    prix: {
      base: 34990,
      haut: 44990,
      devise: 'EUR',
    },

    equipements: [
      'Écran tactile 14.6" central', 'Écran conducteur 12.3"',
      'Climatisation trizone automatique', 'Caméra 360° + aide au parking',
      'Régulateur adaptatif avec stop & go', 'Toit ouvrant panoramique électrique',
      'Sièges avant ventilés & chauffants', 'Sièges 2e rang chauffants',
      'Système audio premium 12 HP', 'Chargement sans fil 50W',
      'Head-Up Display couleur', 'Phares LED matriciels adaptatifs',
      'Sellerie cuir premium', 'Hayon électrique mains libres',
      '3e rang escamotable électriquement',
    ],

    concurrents: [
      { nom: 'Peugeot 5008', prix: 42990, co2: 146 },
      { nom: 'Kia Sorento', prix: 44990, co2: 168 },
      { nom: 'Volkswagen Tiguan Allspace', prix: 45990, co2: 152 },
      { nom: 'Skoda Kodiaq', prix: 40990, co2: 158 },
    ],

    btob: {
      cibles: ['Directions & cadres dirigeants', 'VIP & représentation', 'Flottes familiales entreprise', 'Transport premium'],
      atouts: [
        '7 places : idéal pour les déplacements en équipe',
        'Finition et équipements niveau premium à prix D/E',
        'Image prestige et volume habitable supérieur',
        'Garantie étendue disponible',
      ],
      objections: [
        'Malus conséquent à anticiper dans le TCO',
        'Marque à évangéliser auprès des comités de direction',
      ],
      remise_cible: '10-15%',
    },

    btoc: {
      cibles: ['Familles nombreuses', '35-55 ans CSP+', 'Clients cherchant un 7 places premium accessible'],
      atouts: [
        '7 places spacieuses avec 3e rang adulte utilisable',
        'Équipements haut de gamme de série',
        'Prix 10-15k€ sous la concurrence européenne équivalente',
        'Moteur 2.0T puissant pour un usage familial chargé',
      ],
      objections: [
        'Malus élevé (CO₂ 182 g/km) à intégrer dans le budget',
        'Consommation plus élevée sur autoroute',
      ],
      argument_prix: '7 places, 261 ch et full équipé à partir de 34 990 € — introuvable en Europe',
    },

    marche: {
      part_marche_cible: '0,5%',
      croissance_segment: '+6,8% en 2024',
      tendance: 'Les SUV 7 places familiaux sont très demandés. La rareté de l\'offre abordable crée une opportunité directe pour le J7.',
      risques: 'Malus CO₂ élevé peut freiner les achats particuliers. Droits de douane UE sur véhicules chinois à surveiller.',
      opportunites: 'Aucun concurrent sous 40 000 € avec ce niveau d\'équipement. Le J7 occupe un segment quasi-vide.',
    },
  },
]

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id)
}
