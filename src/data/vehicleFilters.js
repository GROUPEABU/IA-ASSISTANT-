/**
 * Constantes de filtres véhicule PARTAGÉES — alignées sur la Veille Prix.
 * Utilisées par le composant VehicleDetails (Objections, Pitch, Fiche IA).
 * Les libellés traduits (carburant, boîte, carrosserie) sont fournis sous forme
 * de paires { code, key } ; le composant construit le <option> avec t(key).
 */

export const MAKES = [
  'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Cupra', 'Dacia',
  'DS Automobiles', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaecoo', 'Jaguar',
  'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Mazda', 'Mercedes', 'MINI',
  'Mitsubishi', 'Nissan', 'Omoda', 'Opel', 'Peugeot', 'Porsche', 'Renault',
  'SEAT', 'Skoda', 'Smart', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
]

export const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i)

export const MILEAGE_MIN_VALUES = [500, 5000, 10000, 20000, 30000, 50000]
export const MILEAGE_MAX_VALUES = [10000, 20000, 30000, 50000, 80000, 100000, 150000, 200000]

// code interne → clé i18n du libellé (mêmes codes que la Veille Prix)
export const FUEL_OPTS = [
  { code: 'ES', key: 'price_fuel_petrol' },
  { code: 'GO', key: 'price_fuel_diesel' },
  { code: 'EL', key: 'price_fuel_electric' },
  { code: 'HY', key: 'price_fuel_hybrid' },
  { code: 'GH', key: 'price_fuel_phev' },
  { code: 'GP', key: 'price_fuel_lpg' },
]

export const GEARBOX_OPTS = [
  { code: 'M', key: 'price_gearbox_manual' },
  { code: 'A', key: 'price_gearbox_auto' },
]

export const BODY_OPTS = [
  { code: 'berline', key: 'price_body_berline' },
  { code: 'break', key: 'price_body_break' },
  { code: 'suvcrossover', key: 'price_body_suv' },
  { code: 'coupe', key: 'price_body_coupe' },
  { code: 'cabriolet', key: 'price_body_cabriolet' },
  { code: 'monospace', key: 'price_body_monospace' },
  { code: 'citadine', key: 'price_body_citadine' },
  { code: 'pickup', key: 'price_body_pickup' },
]

// Libellés FR figés pour construire le descriptif texte envoyé à l'IA.
export const FUEL_FR = { ES: 'Essence', GO: 'Diesel', EL: 'Électrique', HY: 'Hybride', GH: 'Hybride rechargeable', GP: 'GPL' }
export const GEAR_FR = { M: 'Boîte manuelle', A: 'Boîte automatique' }
export const BODY_FR = {
  berline: 'Berline', break: 'Break', suvcrossover: 'SUV / Crossover', coupe: 'Coupé',
  cabriolet: 'Cabriolet', monospace: 'Monospace', citadine: 'Citadine', pickup: 'Pick-up',
}
