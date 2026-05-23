// Données de démonstration — remplacez par vos appels API réels

export const MONTHLY_SALES = [
  { month: 'Juin', sales: 8420 },
  { month: 'Juil', sales: 9100 },
  { month: 'Août', sales: 7850 },
  { month: 'Sep', sales: 10200 },
  { month: 'Oct', sales: 11300 },
  { month: 'Nov', sales: 9800 },
  { month: 'Déc', sales: 8600 },
  { month: 'Jan', sales: 9400 },
  { month: 'Fév', sales: 10800 },
  { month: 'Mar', sales: 12100 },
  { month: 'Avr', sales: 11500 },
  { month: 'Mai', sales: 13200 },
]

export const TOP_MODELS = [
  { name: 'Renault Clio', units: 3420, trend: 8.2 },
  { name: 'Peugeot 208', units: 3150, trend: 5.1 },
  { name: 'Volkswagen Golf', units: 2980, trend: -2.3 },
  { name: 'Dacia Sandero', units: 2740, trend: 14.7 },
  { name: 'Toyota Yaris', units: 2210, trend: 3.6 },
]

export const REGION_DATA = [
  { region: 'France', sales: 38200 },
  { region: 'Allemagne', sales: 31400 },
  { region: 'Espagne', sales: 22100 },
  { region: 'Italie', sales: 19800 },
  { region: 'Belgique', sales: 12500 },
  { region: 'Pays-Bas', sales: 9800 },
]

export const KPI_DATA = [
  { id: 'total', title: 'Ventes totales', value: '13 200', delta: 14.8, deltaLabel: 'vs mois préc.' },
  { id: 'revenue', title: 'Chiffre d\'affaires', value: '€ 312 M', delta: 11.2, deltaLabel: 'vs mois préc.' },
  { id: 'margin', title: 'Taux de marge', value: '8,4 %', delta: 0.6, deltaLabel: 'pts vs N-1' },
  { id: 'dealers', title: 'Concessions actives', value: '847', delta: 3.2, deltaLabel: 'vs an dernier' },
]

export const REPORT_LIST = [
  {
    id: 1, title: 'Rapport Mensuel Mai 2026', description: 'Synthèse complète des ventes et performances commerciales',
    date: '23 mai 2026', status: 'ready', statusLabel: 'Disponible',
  },
  {
    id: 2, title: 'Analyse Concurrentielle Q2 2026', description: 'Positionnement vs principaux concurrents européens',
    date: '20 mai 2026', status: 'ready', statusLabel: 'Disponible',
  },
  {
    id: 3, title: 'Rapport VE & Hybrides 2026', description: 'Évolution des ventes électriques et hybrides',
    date: '18 mai 2026', status: 'pending', statusLabel: 'En cours',
  },
  {
    id: 4, title: 'Benchmark Régions Europe', description: 'Comparaison performances par marché national',
    date: '15 mai 2026', status: 'ready', statusLabel: 'Disponible',
  },
]

export const TABLE_ROWS = [
  { model: 'Clio V', brand: 'Renault', units: 3420, revenue: 61560000, delta: 8.2, region: 'France' },
  { model: '208', brand: 'Peugeot', units: 3150, revenue: 69300000, delta: 5.1, region: 'France' },
  { model: 'Golf VIII', brand: 'Volkswagen', units: 2980, revenue: 89400000, delta: -2.3, region: 'Allemagne' },
  { model: 'Sandero', brand: 'Dacia', units: 2740, revenue: 38360000, delta: 14.7, region: 'Espagne' },
  { model: 'Yaris IV', brand: 'Toyota', units: 2210, revenue: 46410000, delta: 3.6, region: 'France' },
  { model: 'Corsa F', brand: 'Opel', units: 1980, revenue: 37620000, delta: -1.1, region: 'Allemagne' },
]
