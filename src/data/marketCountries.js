/**
 * Marchés couverts par la Veille Prix — source unique partagée entre la page
 * Veille Prix et l'analyse marché des fiches produit (MarketAnalysis).
 * `sites` alimente le prompt (sources par marché) et l'affichage UI.
 */
export const COUNTRIES = [
  { code: 'FR', label: 'France',      tva: 1.20,  transport: 450,  tld: 'fr', as24cy: 'F',   sites: 'La Centrale, LeBonCoin, AutoScout24.fr' },
  { code: 'BE', label: 'Belgique',    tva: 1.21,  transport: 450,  tld: 'be', as24cy: 'B',   sites: 'AutoScout24.be, 2dehands.be, Vroom.be' },
  { code: 'LU', label: 'Luxembourg',  tva: 1.17,  transport: 450,  tld: 'lu', as24cy: 'L',   sites: 'AutoScout24.lu, Luxauto.lu' },
  { code: 'DE', label: 'Allemagne',   tva: 1.19,  transport: 450,  tld: 'de', as24cy: 'D',   sites: 'mobile.de, AutoScout24.de' },
  { code: 'NL', label: 'Pays-Bas',    tva: 1.21,  transport: 450,  tld: 'nl', as24cy: 'NL',  sites: 'AutoScout24.nl, Marktplaats.nl' },
  { code: 'ES', label: 'Espagne',     tva: 1.21,  transport: 450,  tld: 'es', as24cy: 'E',   sites: 'AutoScout24.es, Coches.net' },
  { code: 'IT', label: 'Italie',      tva: 1.22,  transport: 450,  tld: 'it', as24cy: 'I',   sites: 'AutoScout24.it, Subito.it' },
  { code: 'PT', label: 'Portugal',    tva: 1.23,  transport: 450,  tld: 'pt', as24cy: 'P',   sites: 'AutoScout24.pt, CustoJusto.pt' },
  { code: 'CH', label: 'Suisse',      tva: 1.081, transport: 450, tld: 'ch', as24cy: 'CH',  currency: 'CHF', sites: 'AutoScout24.ch, Tutti.ch' },
  { code: 'HR', label: 'Croatie',     tva: 1.25,  transport: 450, tld: 'hr', as24cy: 'HR',  sites: 'AutoScout24.hr, Njuškalo.hr' },
  { code: 'PL', label: 'Pologne',     tva: 1.23,  transport: 450, tld: 'pl', as24cy: 'PL',  currency: 'PLN', sites: 'OtoMoto.pl, AutoScout24.pl' },
  { code: 'SE', label: 'Suède',       tva: 1.25,  transport: 450, tld: 'se', as24cy: 'S',   currency: 'SEK', sites: 'Blocket.se, AutoScout24.se' },
  { code: 'NO', label: 'Norvège',     tva: 1.25,  transport: 450, tld: 'no', as24cy: 'N',   currency: 'NOK', sites: 'Finn.no, AutoScout24.no' },
  { code: 'FI', label: 'Finlande',    tva: 1.255, transport: 450, tld: 'fi', as24cy: 'FIN', sites: 'Nettiauto.com, AutoScout24.fi' },
  { code: 'MA', label: 'Maroc',       tva: 1.20,  transport: 450, tld: 'ma', as24cy: null,  currency: 'MAD', sites: 'Avito.ma, Moteur.ma' },
  { code: 'TN', label: 'Tunisie',     tva: 1.19,  transport: 450, tld: 'tn', as24cy: null,  currency: 'TND', sites: 'Tayara.tn' },
  { code: 'DZ', label: 'Algérie',     tva: 1.19,  transport: 450, tld: 'dz', as24cy: null,  currency: 'DZD', sites: 'Ouedkniss.com' },
]
