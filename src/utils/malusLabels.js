// Per-country i18n labels for CO₂ Malus result panels.
// Usage: localizeResult(result, lang) merges the correct language strings
//        into a result object returned by buildCountryData().
//        Falls back to English when DE/IT/ES entry is missing.

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES' }

export function getCountryName(code, lang) {
  try {
    const dn = new Intl.DisplayNames([LOCALE_MAP[lang] || 'en-GB'], { type: 'region' })
    const name = dn.of(code)
    return name || null
  } catch {
    return null
  }
}

// ─── Bracket label translation map ───────────────────────────────────────────
const BRACKET_LABEL_MAP = {
  'CO₂ exempté':                  { en: 'CO₂ Exempt',              de: 'CO₂ Befreit',               it: 'CO₂ Esente',                es: 'CO₂ Exento' },
  'CO₂ basse':                    { en: 'CO₂ Low',                 de: 'CO₂ Niedrig',               it: 'CO₂ Basso',                 es: 'CO₂ Bajo' },
  'CO₂ intermédiaire':            { en: 'CO₂ Intermediate',        de: 'CO₂ Mittel',                it: 'CO₂ Intermedio',            es: 'CO₂ Intermedio' },
  'CO₂ haute':                    { en: 'CO₂ High',                de: 'CO₂ Hoch',                  it: 'CO₂ Alto',                  es: 'CO₂ Alto' },
  'CO₂ maximale':                 { en: 'CO₂ Maximum',             de: 'CO₂ Maximum',               it: 'CO₂ Massimo',               es: 'CO₂ Máximo' },
  'Tranche unique':               { en: 'Single Band',             de: 'Einheitsband',              it: 'Fascia Unica',              es: 'Tramo Único' },
  'Tranche 1':                    { en: 'Band 1',                  de: 'Band 1',                    it: 'Fascia 1',                  es: 'Tramo 1' },
  'Tranche 2':                    { en: 'Band 2',                  de: 'Band 2',                    it: 'Fascia 2',                  es: 'Tramo 2' },
  'Tranche 3':                    { en: 'Band 3',                  de: 'Band 3',                    it: 'Fascia 3',                  es: 'Tramo 3' },
  'Tranche 4':                    { en: 'Band 4',                  de: 'Band 4',                    it: 'Fascia 4',                  es: 'Tramo 4' },
  'EV exempté':                   { en: 'EV Exempt',               de: 'EV Befreit',                it: 'EV Esente',                 es: 'EV Exento' },
  'EV (plus exempt depuis 2025)': { en: 'EV (no longer exempt since 2025)', de: 'EV (seit 2025 nicht mehr befreit)', it: 'EV (non più esente dal 2025)', es: 'EV (ya no exento desde 2025)' },
  'EV / très faible':             { en: 'EV / Very Low',           de: 'EV / Sehr Niedrig',         it: 'EV / Molto Basso',          es: 'EV / Muy Bajo' },
  'Exempté':                      { en: 'Exempt',                  de: 'Befreit',                   it: 'Esente',                    es: 'Exento' },
  'Basse':                        { en: 'Low',                     de: 'Niedrig',                   it: 'Bassa',                     es: 'Baja' },
  'Haute':                        { en: 'High',                    de: 'Hoch',                      it: 'Alta',                      es: 'Alta' },
  'Max':                          { en: 'Max',                     de: 'Max',                       it: 'Max',                       es: 'Máx' },
  'Modérée':                      { en: 'Moderate',                de: 'Moderat',                   it: 'Moderata',                  es: 'Moderada' },
  'Modéré':                       { en: 'Moderate',                de: 'Moderat',                   it: 'Moderato',                  es: 'Moderado' },
  'Élevé':                        { en: 'High',                    de: 'Hoch',                      it: 'Elevato',                   es: 'Elevado' },
  'Taxe immat.':                  { en: 'Reg. Tax',                de: 'Zulassungssteuer',          it: 'Tassa Immat.',              es: 'Tasa Matr.' },
  'Taxe annuelle':                { en: 'Annual Tax',              de: 'Jahressteuer',              it: 'Tassa Annuale',             es: 'Impuesto Anual' },
  'EV':                           { en: 'EV',                      de: 'EV',                        it: 'EV',                        es: 'EV' },
  'A–F':                          { en: 'A–F',                     de: 'A–F',                       it: 'A–F',                       es: 'A–F' },
  'G–I':                          { en: 'G–I',                     de: 'G–I',                       it: 'G–I',                       es: 'G–I' },
  'J max':                        { en: 'J max',                   de: 'J max',                     it: 'J max',                     es: 'J máx' },
  'Aucune taxe':                  { en: 'No tax',                  de: 'Keine Steuer',              it: 'Nessuna tassa',             es: 'Sin impuesto' },
}

function translateBracketLabel(label, lang) {
  if (!label || lang === 'fr') return label
  return BRACKET_LABEL_MAP[label]?.[lang] || BRACKET_LABEL_MAP[label]?.en || label
}

const SUFFIX_MAP = {
  en: { barème: 'Schedule', 'immat. en':   'reg. in', 'immat. depuis': 'reg. from', 'immat.': 'reg.' },
  de: { barème: 'Tabelle',  'immat. en':   'Zul. in', 'immat. depuis': 'Zul. ab',   'immat.': 'Zul.' },
  it: { barème: 'Tabella',  'immat. en':   'immat. nel', 'immat. depuis': 'immat. dal', 'immat.': 'immat.' },
  es: { barème: 'Tabla',    'immat. en':   'matr. en', 'immat. depuis': 'matr. desde', 'immat.': 'matr.' },
}

function translateTaxNameSuffix(suffix, lang) {
  if (!suffix || lang === 'fr') return suffix
  const m = SUFFIX_MAP[lang] || SUFFIX_MAP.en
  return suffix
    .replace(/Barème/gi, m.barème)
    .replace(/immat\. en\b/g, m['immat. en'])
    .replace(/immat\. depuis\b/g, m['immat. depuis'])
    .replace(/immat\./g, m['immat.'])
}

// ─── Translations ──────────────────────────────────────────────────────────────
// For EU countries with fully calculated strings (FR, DE, GB, ES…), only the
// static / predictable fields are overridden. Dynamic computed strings remain
// in French as they are mixed with legal references and numbers.
// For non-EU "informational" countries all fields are fully translated.

const COUNTRY_LABELS = {

  // ── France ────────────────────────────────────────────────────────────────
  FR: {
    en: {
      tax_name_prefix: 'CO₂ + Weight Malus (TMOM)',
      system_description: 'Dual registration malus: CO₂ + Weight (TMOM). Rate depends on first registration date (ref. art. L421-58 to L421-81-1 CIBS). Cumulative cap applies.',
      exemptions_2026_27: [
        'Hydrogen',
        'Disability card (CMI)',
        'Families ≥3 children: −20 g/child (art. L421-70 CIBS)',
        'EV: CO₂ exempt, weight malus applies (400 kg / 600 kg from 01/07/2026)',
      ],
      exemptions_before_2026: [
        '100% electric (CO₂ + weight)',
        'Hydrogen',
        'Disability card (CMI)',
        'Families ≥3 children: −20 g/child (art. L421-70 CIBS)',
      ],
    },
    de: {
      tax_name_prefix: 'CO₂ + Gewichtsabgabe (TMOM)',
      system_description: 'Doppelter Zulassungsmalus: CO₂ + Gewicht (TMOM). Tarif abhängig vom Erstzulassungsdatum (Ref. Art. L421-58 bis L421-81-1 CIBS). Kumulativer Höchstbetrag gilt.',
      exemptions_2026_27: [
        'Wasserstoff',
        'Behindertenausweis (CMI)',
        'Familien ≥3 Kinder: −20 g/Kind (art. L421-70 CIBS)',
        'EV: CO₂ befreit, Gewichtsabgabe gilt (400 kg / 600 kg ab 01/07/2026)',
      ],
      exemptions_before_2026: [
        '100% elektrisch (CO₂ + Gewicht)',
        'Wasserstoff',
        'Behindertenausweis (CMI)',
        'Familien ≥3 Kinder: −20 g/Kind (art. L421-70 CIBS)',
      ],
    },
    it: {
      tax_name_prefix: 'Malus CO₂ + Peso (TMOM)',
      system_description: 'Doppio malus all\'immatricolazione: CO₂ + Peso (TMOM). Aliquota in base alla data di prima immatricolazione (rif. artt. L421-58–L421-81-1 CIBS). Si applica un massimale cumulativo.',
      exemptions_2026_27: [
        'Idrogeno',
        'Carta d\'invalidità (CMI)',
        'Famiglie ≥3 figli: −20 g/figlio (art. L421-70 CIBS)',
        'EV: CO₂ esente, malus peso si applica (400 kg / 600 kg dal 01/07/2026)',
      ],
      exemptions_before_2026: [
        '100% elettrico (CO₂ + peso)',
        'Idrogeno',
        'Carta d\'invalidità (CMI)',
        'Famiglie ≥3 figli: −20 g/figlio (art. L421-70 CIBS)',
      ],
    },
    es: {
      tax_name_prefix: 'Malus CO₂ + Peso (TMOM)',
      system_description: 'Doble malus de matriculación: CO₂ + Peso (TMOM). Tarifa según fecha de primera matriculación (ref. arts. L421-58 a L421-81-1 CIBS). Se aplica un tope acumulativo.',
      exemptions_2026_27: [
        'Hidrógeno',
        'Tarjeta de discapacidad (CMI)',
        'Familias ≥3 hijos: −20 g/hijo (art. L421-70 CIBS)',
        'EV: CO₂ exento, malus de peso aplica (400 kg / 600 kg desde 01/07/2026)',
      ],
      exemptions_before_2026: [
        '100% eléctrico (CO₂ + peso)',
        'Hidrógeno',
        'Tarjeta de discapacidad (CMI)',
        'Familias ≥3 hijos: −20 g/hijo (art. L421-70 CIBS)',
      ],
    },
  },

  // ── United Kingdom ────────────────────────────────────────────────────────
  GB: {
    en: {
      tax_name_prefix: 'VED First-Year Rate',
      exemptions: ['Historic vehicles (+40 years)', 'Reduced mobility'],
    },
    de: {
      tax_name_prefix: 'VED Erstzulassungsrate',
      exemptions: ['Historische Fahrzeuge (+40 Jahre)', 'Eingeschränkte Mobilität'],
    },
    it: {
      tax_name_prefix: 'VED Tariffa Primo Anno',
      exemptions: ['Veicoli storici (+40 anni)', 'Mobilità ridotta'],
    },
    es: {
      tax_name_prefix: 'VED Tasa Primer Año',
      exemptions: ['Vehículos históricos (+40 años)', 'Movilidad reducida'],
    },
  },

  // ── Germany ───────────────────────────────────────────────────────────────
  DE: {
    en: {
      tax_name: 'Kfz-Steuer (ANNUAL tax)',
      exemptions: ['100% electric: exempt until 2035 (Bundestag 04/12/2025)', 'Classic cars H-plates (€191.73/year)'],
    },
    de: {
      tax_name: 'Kfz-Steuer (JÄHRLICHE Steuer)',
      exemptions: ['100% Elektro: befreit bis 2035 (Bundestag 04/12/2025)', 'Oldtimer H-Kennzeichen (191,73 €/Jahr)'],
    },
    it: {
      tax_name: 'Kfz-Steuer (tassa ANNUALE)',
      exemptions: ['100% elettrico: esente fino al 2035 (Bundestag 04/12/2025)', 'Auto d\'epoca targa H (191,73 €/anno)'],
    },
    es: {
      tax_name: 'Kfz-Steuer (impuesto ANUAL)',
      exemptions: ['100% eléctrico: exento hasta 2035 (Bundestag 04/12/2025)', 'Clásicos matrícula H (191,73 €/año)'],
    },
  },

  // ── Spain ─────────────────────────────────────────────────────────────────
  ES: {
    en: {
      exemptions: ['100% electric', 'PHEV (usually)', 'Large family (−50%)', 'Ceuta/Melilla (exempt)'],
    },
    de: {
      exemptions: ['100% elektrisch', 'PHEV (meist)', 'Kinderreiche Familien (−50%)', 'Ceuta/Melilla (befreit)'],
    },
    it: {
      exemptions: ['100% elettrico', 'PHEV (di solito)', 'Famiglie numerose (−50%)', 'Ceuta/Melilla (esente)'],
    },
    es: {
      exemptions: ['100% eléctrico', 'PHEV (generalmente)', 'Familia numerosa (−50%)', 'Ceuta/Melilla (exento)'],
    },
  },

  // ── Netherlands ───────────────────────────────────────────────────────────
  NL: {
    en: {
      exemptions: ['100% electric', 'Hydrogen', 'Disability-adapted'],
    },
    de: {
      exemptions: ['100% elektrisch', 'Wasserstoff', 'Behindertengerecht'],
    },
    it: {
      exemptions: ['100% elettrico', 'Idrogeno', 'Adattato per disabilità'],
    },
    es: {
      exemptions: ['100% eléctrico', 'Hidrógeno', 'Adaptado para discapacidad'],
    },
  },

  // ── Italy ─────────────────────────────────────────────────────────────────
  IT: {
    en: {
      tax_name: 'IPT + Bollo (NO CO₂ malus)',
      system_description: 'Italy has NO CO₂ malus at registration. Only IPT (fixed provincial tax) and annual bollo based on kW.',
      exemptions: ['100% electric (IPT usually free)', 'Bollo: 5 years free for EV'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Legal ref: No CO₂ malus since the ecotassa was abolished (L. 145/2018) on 31/12/2021. IPT governed by DPR 641/1972. Regional bollo. Superbollo: +€20/kW above 185 kW. Ecobonus up to €11,000 for EV.',
    },
    de: {
      tax_name: 'IPT + Bollo (KEIN CO₂-Malus)',
      system_description: 'Italien hat KEINEN CO₂-Malus bei der Zulassung. Nur IPT (feste Provinzsteuer) und jährliches Bollo nach kW.',
      exemptions: ['100% elektrisch (IPT meist kostenlos)', 'Bollo: 5 Jahre gratis für EV'],
      specific_penalty: 'Kein CO₂-Malus',
      notes: 'Kein CO₂-Malus seit Abschaffung der Ecotassa (L. 145/2018) am 31/12/2021.',
    },
    it: {
      tax_name: 'IPT + Bollo (NESSUN malus CO₂)',
      system_description: 'L\'Italia NON ha malus CO₂ all\'immatricolazione. Solo IPT (tassa provinciale fissa) e bollo annuale basato sui kW.',
      exemptions: ['100% elettrico (IPT spesso gratuita)', 'Bollo: 5 anni gratuiti per EV'],
      specific_penalty: 'Nessun malus CO₂',
      notes: 'Rif. legale: Nessun malus CO₂ dall\'abrogazione dell\'ecotassa (L. 145/2018) il 31/12/2021.',
    },
    es: {
      tax_name: 'IPT + Bollo (SIN malus CO₂)',
      system_description: 'Italia NO tiene malus CO₂ en la matriculación. Solo IPT (tasa provincial fija) y bollo anual basado en kW.',
      exemptions: ['100% eléctrico (IPT generalmente gratis)', 'Bollo: 5 años gratis para EV'],
      specific_penalty: 'Sin malus CO₂',
      notes: 'Sin malus CO₂ desde la derogación de la ecotassa (L. 145/2018) el 31/12/2021.',
    },
  },

  // ── Portugal ──────────────────────────────────────────────────────────────
  PT: {
    en: {
      exemptions: ['100% electric (isento)', 'Eligible PHEV: −75% ISV', 'Large family: −50%'],
    },
    de: {
      exemptions: ['100% elektrisch (isento)', 'Förderfähige PHEV: −75% ISV', 'Kinderreiche Familien: −50%'],
    },
    it: {
      exemptions: ['100% elettrico (isento)', 'PHEV ammissibili: −75% ISV', 'Famiglia numerosa: −50%'],
    },
    es: {
      exemptions: ['100% eléctrico (isento)', 'PHEV elegibles: −75% ISV', 'Familia numerosa: −50%'],
    },
  },

  // ── Norway ────────────────────────────────────────────────────────────────
  NO: {
    en: {
      exemptions: ['EV: CO₂ exempt only (weight applies since 2023)', 'Hydrogen'],
    },
    de: {
      exemptions: ['EV: nur CO₂ befreit (Gewicht gilt seit 2023)', 'Wasserstoff'],
    },
    it: {
      exemptions: ['EV: solo CO₂ esente (peso valido dal 2023)', 'Idrogeno'],
    },
    es: {
      exemptions: ['EV: solo CO₂ exento (peso aplica desde 2023)', 'Hidrógeno'],
    },
  },

  // ── Austria ───────────────────────────────────────────────────────────────
  AT: {
    en: {
      exemptions: ['100% electric', 'Large family (−20%)'],
    },
    de: {
      exemptions: ['100% elektrisch', 'Kinderreiche Familien (−20%)'],
    },
    it: {
      exemptions: ['100% elettrico', 'Famiglia numerosa (−20%)'],
    },
    es: {
      exemptions: ['100% eléctrico', 'Familia numerosa (−20%)'],
    },
  },

  // ── Belgium ───────────────────────────────────────────────────────────────
  BE: {
    en: {
      exemptions: ['EV (Brussels/Wallonia): exempt', 'EV (Flanders): exempt ONLY if reg. before 01/01/2026 (Programmadecreet BO 2026)', 'Large family Wallonia: −€250'],
    },
    de: {
      exemptions: ['EV (Brüssel/Wallonien): befreit', 'EV (Flandern): befreit NUR bei Zul. vor 01/01/2026', 'Kinderreiche Familien Wallonien: −250 €'],
    },
    it: {
      exemptions: ['EV (Bruxelles/Vallonia): esente', 'EV (Fiandre): esente SOLO se immat. prima del 01/01/2026', 'Famiglia numerosa Vallonia: −250 €'],
    },
    es: {
      exemptions: ['EV (Bruselas/Valonia): exento', 'EV (Flandes): exento SOLO si matr. antes del 01/01/2026', 'Familia numerosa Valonia: −250 €'],
    },
  },

  // ── Finland ───────────────────────────────────────────────────────────────
  FI: {
    en: {
      exemptions: ['100% electric (0%)', 'Disability-adapted vehicles'],
    },
    de: {
      exemptions: ['100% elektrisch (0%)', 'Behindertengerechte Fahrzeuge'],
    },
    it: {
      exemptions: ['100% elettrico (0%)', 'Veicoli adattati per disabilità'],
    },
    es: {
      exemptions: ['100% eléctrico (0%)', 'Vehículos adaptados para discapacidad'],
    },
  },

  // ── Denmark ───────────────────────────────────────────────────────────────
  DK: {
    en: {
      exemptions: ['EV (progressive reduction until 2030)', 'Disability vehicles'],
    },
    de: {
      exemptions: ['EV (schrittweise Reduzierung bis 2030)', 'Behindertenfahrzeuge'],
    },
    it: {
      exemptions: ['EV (riduzione progressiva fino al 2030)', 'Veicoli per disabili'],
    },
    es: {
      exemptions: ['EV (reducción progresiva hasta 2030)', 'Vehículos para discapacitados'],
    },
  },

  // ── Sweden ────────────────────────────────────────────────────────────────
  SE: {
    en: {
      exemptions: ['EV/Hydrogen: flat rate 360 SEK/year'],
    },
    de: {
      exemptions: ['EV/Wasserstoff: Pauschale 360 SEK/Jahr'],
    },
    it: {
      exemptions: ['EV/Idrogeno: tariffa fissa 360 SEK/anno'],
    },
    es: {
      exemptions: ['EV/Hidrógeno: tarifa fija 360 SEK/año'],
    },
  },

  // ── Switzerland ───────────────────────────────────────────────────────────
  CH: {
    en: {
      tax_name: 'Variable by canton (26)',
      system_description: '3-tier system: (1) Federal CO₂ penalty at import if >93.6 g/km WLTP (CHF 95–152/g excess). (2) Automobilsteuer 4% price + 8.1% VAT. (3) Annual cantonal tax (weight/kW/CO₂ varies across 26 cantons).',
      exemptions: ['EV: discount or exemption depending on canton (Geneva, Vaud, Zurich generous)'],
      specific_penalty: 'Variable by canton',
      notes: 'Revised CO₂ Act (1 Jan 2025) – target 93.6 g/km WLTP. Small importers pay before registration. Cars >12 months abroad exempt from CO₂ penalty. Annual cantonal road tax varies.',
    },
    de: {
      tax_name: 'Kantonsabhängig (26 Kantone)',
      system_description: '3-Ebenen-System: (1) Bundesstrafabgabe bei Import >93,6 g/km WLTP. (2) Automobilsteuer 4% + MwSt 8,1%. (3) Jährliche Kantonssteuer (variiert).',
      exemptions: ['EV: Rabatt oder Befreiung je nach Kanton (Genf, Waadt, Zürich großzügig)'],
      specific_penalty: 'Kantonsabhängig',
      notes: 'Revidiertes CO₂-Gesetz (1. Jan. 2025) – Ziel 93,6 g/km WLTP.',
    },
    it: {
      tax_name: 'Variabile per cantone (26)',
      system_description: 'Sistema a 3 livelli: (1) Sanzione CO₂ federale all\'importazione se >93,6 g/km WLTP. (2) Automobilsteuer 4% + IVA 8,1%. (3) Tassa cantonale annuale variabile.',
      exemptions: ['EV: sconto o esenzione secondo il cantone (Ginevra, Vaud, Zurigo generosi)'],
      specific_penalty: 'Variabile per cantone',
    },
    es: {
      tax_name: 'Variable por cantón (26)',
      system_description: 'Sistema de 3 niveles: (1) Penalización CO₂ federal en importación si >93,6 g/km WLTP. (2) Automobilsteuer 4% + IVA 8,1%. (3) Impuesto cantonal anual variable.',
      exemptions: ['EV: descuento o exención según cantón (Ginebra, Vaud, Zurich generosos)'],
      specific_penalty: 'Variable por cantón',
    },
  },

  // ── Poland ────────────────────────────────────────────────────────────────
  PL: {
    en: {
      tax_name: 'Akcyza (% of displacement, not CO₂)',
      system_description: 'No direct CO₂ tax. Akcyza (excise) based on engine displacement: 3.1% if <2L, 18.6% if ≥2L.',
      exemptions: ['EV: Akcyza exempt', 'Eligible PHEV (displacement ≤2L and range ≥40 km)'],
      specific_penalty: 'No direct CO₂ malus',
      notes: 'CO₂-based taxation reform discussed since 2021 but not adopted.',
    },
    de: {
      tax_name: 'Akcyza (% des Hubraums, nicht CO₂)',
      system_description: 'Keine direkte CO₂-Steuer. Akcyza basiert auf Hubraum: 3,1% bei <2L, 18,6% bei ≥2L.',
      exemptions: ['EV: Akcyza befreit', 'Förderfähige PHEV (Hubraum ≤2L und Reichweite ≥40 km)'],
      specific_penalty: 'Kein direkter CO₂-Malus',
    },
    it: {
      tax_name: 'Akcyza (% della cilindrata, non CO₂)',
      system_description: 'Nessuna tassa CO₂ diretta. Akcyza basata sulla cilindrata: 3,1% se <2L, 18,6% se ≥2L.',
      exemptions: ['EV: Akcyza esente', 'PHEV ammissibili (cilindrata ≤2L e autonomia ≥40 km)'],
      specific_penalty: 'Nessun malus CO₂ diretto',
    },
    es: {
      tax_name: 'Akcyza (% de cilindrada, no CO₂)',
      system_description: 'Sin impuesto CO₂ directo. Akcyza basada en cilindrada: 3,1% si <2L, 18,6% si ≥2L.',
      exemptions: ['EV: Akcyza exento', 'PHEV elegibles (cilindrada ≤2L y autonomía ≥40 km)'],
      specific_penalty: 'Sin malus CO₂ directo',
    },
  },

  // ── South Africa ──────────────────────────────────────────────────────────
  ZA: {
    en: {
      system_description: 'CO₂ purchase tax: R132/g above 95 g/km (passenger vehicles). Doubled to R176 for double cab.',
      exemptions: ['EV: CO₂ exempt (but 25% import duty)'],
      notes: 'Conversion ZAR→EUR @0.049. One of the rare CO₂ taxes in Africa.',
    },
    de: {
      system_description: 'CO₂-Kaufsteuer: R132/g über 95 g/km (PKW). Verdoppelt auf R176 für Double-Cab.',
      exemptions: ['EV: CO₂ befreit (aber 25% Einfuhrzoll)'],
    },
    it: {
      system_description: 'Tassa CO₂ all\'acquisto: R132/g oltre 95 g/km (veicoli passeggeri). Raddoppiata a R176 per double cab.',
      exemptions: ['EV: CO₂ esente (ma 25% di dazio doganale)'],
    },
    es: {
      system_description: 'Impuesto CO₂ en la compra: R132/g por encima de 95 g/km (vehículos de pasajeros). Duplicado a R176 para doble cabina.',
      exemptions: ['EV: CO₂ exento (pero 25% de arancel de importación)'],
    },
  },

  // ── Singapore ─────────────────────────────────────────────────────────────
  SG: {
    en: {
      system_description: 'Bonus/Malus based on 5 pollutants (CO₂, HC, CO, NOx, PM). Bands A1/A2 = rebate, B = neutral, C1/C2 = surcharge.',
      exemptions: ['EV: rebate up to S$45,000 (EEAI + VES)'],
      notes: 'Added to ARF (Additional Registration Fee) + COE (Certificate of Entitlement, can exceed S$100k).',
    },
    de: {
      system_description: 'Bonus/Malus basiert auf 5 Schadstoffen. Bänder A1/A2 = Rabatt, B = neutral, C1/C2 = Zuschlag.',
      exemptions: ['EV: Rabatt bis S$45.000 (EEAI + VES)'],
    },
    it: {
      system_description: 'Bonus/Malus basato su 5 inquinanti. Bande A1/A2 = rimborso, B = neutro, C1/C2 = supplemento.',
      exemptions: ['EV: rimborso fino a S$45.000 (EEAI + VES)'],
    },
    es: {
      system_description: 'Bonus/Malus basado en 5 contaminantes. Bandas A1/A2 = reembolso, B = neutro, C1/C2 = recargo.',
      exemptions: ['EV: reembolso hasta S$45.000 (EEAI + VES)'],
    },
  },

  // ── United States ─────────────────────────────────────────────────────────
  US: {
    en: {
      system_description: 'No CO₂ malus. Federal Gas Guzzler Tax based on MPG (fuel consumption). Cars <22.5 MPG: $1,000–$7,700. SUVs/Pickups EXEMPT.',
      exemptions: ['SUVs, pickups, mini-vans (exempt)', 'EV: no tax + federal credit $7,500'],
      specific_penalty: 'By MPG (no direct CO₂)',
      notes: 'Severely outdated system: 95% of the US market (SUVs/trucks) escapes it. No federal CO₂ reform in sight.',
    },
    de: {
      system_description: 'Kein CO₂-Malus. Bundesweite Gas Guzzler Tax basiert auf MPG. Pkw <22,5 MPG: 1.000–7.700 $. SUV/Pickups BEFREIT.',
      exemptions: ['SUVs, Pickups, Minivans (befreit)', 'EV: keine Steuer + Bundeskredit 7.500 $'],
      specific_penalty: 'Nach MPG (kein direktes CO₂)',
    },
    it: {
      system_description: 'Nessun malus CO₂. Gas Guzzler Tax federale basata sui MPG. Auto <22,5 MPG: 1.000–7.700 $. SUV/Pickup ESENTI.',
      exemptions: ['SUV, pickup, minivan (esenti)', 'EV: nessuna tassa + credito federale 7.500 $'],
      specific_penalty: 'Per MPG (nessun CO₂ diretto)',
    },
    es: {
      system_description: 'Sin malus de CO₂. Gas Guzzler Tax federal basada en MPG. Coches <22,5 MPG: 1.000–7.700 $. SUV/Camionetas EXENTOS.',
      exemptions: ['SUVs, camionetas, minivans (exentos)', 'EV: sin impuesto + crédito federal 7.500 $'],
      specific_penalty: 'Por MPG (sin CO₂ directo)',
    },
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  CA: {
    en: {
      system_description: 'Federal excise tax on fuel-inefficient vehicles (>13L/100km). $1,000–$4,000. No direct CO₂ system.',
      exemptions: ['EV', 'PHEV (federal incentives up to $5,000)'],
      specific_penalty: 'By fuel consumption (no direct CO₂)',
      notes: 'Quebec has its own system (Roulez vert). No direct CO₂ malus at federal level in Canada.',
    },
    de: {
      system_description: 'Bundesweite Verbrauchsteuer auf kraftstoffineffiziente Fahrzeuge (>13L/100km). 1.000–4.000 $. Kein direktes CO₂-System.',
      exemptions: ['EV', 'PHEV (Bundesanreize bis 5.000 $)'],
      specific_penalty: 'Nach Kraftstoffverbrauch (kein direktes CO₂)',
    },
    it: {
      system_description: 'Accisa federale su veicoli non efficienti (>13L/100km). 1.000–4.000 $. Nessun sistema CO₂ diretto.',
      exemptions: ['EV', 'PHEV (incentivi federali fino a 5.000 $)'],
      specific_penalty: 'Per consumo carburante (nessun CO₂ diretto)',
    },
    es: {
      system_description: 'Impuesto federal sobre vehículos poco eficientes (>13L/100km). 1.000–4.000 $. Sin sistema CO₂ directo.',
      exemptions: ['EV', 'PHEV (incentivos federales hasta 5.000 $)'],
      specific_penalty: 'Por consumo de combustible (sin CO₂ directo)',
    },
  },

  // ── Japan ─────────────────────────────────────────────────────────────────
  JP: {
    en: {
      tax_name: 'Eco-friendly Tax (reduction)',
      system_description: 'No direct CO₂ malus. REDUCTION system for eco-friendly vehicles (up to 100% on certain taxes).',
      exemptions: ['EV/PHEV: exemption up to 100% on 3 taxes'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Acquisition tax + Automobile tax + Tonnage tax based on weight/displacement. Bonus for efficiency.',
    },
    de: {
      system_description: 'Kein direkter CO₂-Malus. RABATT-System für umweltfreundliche Fahrzeuge (bis 100% auf bestimmte Steuern).',
      exemptions: ['EV/PHEV: Befreiung bis 100% auf 3 Steuern'],
      specific_penalty: 'Kein CO₂-Malus',
    },
    it: {
      system_description: 'Nessun malus CO₂ diretto. Sistema di RIDUZIONI per veicoli eco-friendly (fino al 100% su certe tasse).',
      exemptions: ['EV/PHEV: esenzione fino al 100% su 3 tasse'],
      specific_penalty: 'Nessun malus CO₂',
    },
    es: {
      system_description: 'Sin malus CO₂ directo. Sistema de REDUCCIONES para vehículos eco-friendly (hasta 100% en ciertos impuestos).',
      exemptions: ['EV/PHEV: exención hasta 100% en 3 impuestos'],
      specific_penalty: 'Sin malus CO₂',
    },
  },

  // ── China ─────────────────────────────────────────────────────────────────
  CN: {
    en: {
      system_description: 'No direct CO₂ malus. Vehicle Purchase Tax = 10% of pre-tax price for all thermal vehicles.',
      exemptions: ['NEV (New Energy Vehicles): 10% VPT exemption until 2025, then 5% in 2026–2027'],
      specific_penalty: '10% of price (not CO₂)',
      notes: 'System focused on NEVs (electrics) rather than CO₂ of thermal vehicles.',
    },
    de: {
      system_description: 'Kein direkter CO₂-Malus. Fahrzeugkaufsteuer = 10% des Nettopreises für alle Verbrenner.',
      exemptions: ['NEV (Neue Energiefahrzeuge): 10% KfzSt-Befreiung bis 2025, dann 5% 2026–2027'],
      specific_penalty: '10% des Preises (kein CO₂)',
    },
    it: {
      system_description: 'Nessun malus CO₂ diretto. Vehicle Purchase Tax = 10% del prezzo IVA esclusa per tutti i veicoli termici.',
      exemptions: ['NEV (Veicoli a Nuova Energia): esenzione 10% VPT fino al 2025, poi 5% nel 2026–2027'],
      specific_penalty: '10% del prezzo (non CO₂)',
    },
    es: {
      system_description: 'Sin malus CO₂ directo. Impuesto de Compra de Vehículos = 10% del precio sin IVA para todos los vehículos térmicos.',
      exemptions: ['NEV (Vehículos de Nueva Energía): exención 10% ICV hasta 2025, luego 5% en 2026–2027'],
      specific_penalty: '10% del precio (no CO₂)',
    },
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  AU: {
    en: {
      system_description: 'No CO₂ malus. LCT 33% above A$80,567 (A$91,387 for fuel-efficient <7L/100km).',
      exemptions: ['Vehicles <A$80,567 (or A$91,387 efficient)', 'EV (since 2022)'],
      specific_penalty: 'By price (not CO₂)',
      notes: 'Australia has no national CO₂ malus. The LCT targets luxury vehicles.',
    },
    de: {
      system_description: 'Kein CO₂-Malus. LCT 33% über A$80.567 (A$91.387 für kraftstoffeffiziente Fahrzeuge <7L/100km).',
      exemptions: ['Fahrzeuge <A$80.567 (oder A$91.387 effizient)', 'EV (seit 2022)'],
      specific_penalty: 'Nach Preis (kein CO₂)',
    },
    it: {
      system_description: 'Nessun malus CO₂. LCT 33% oltre A$80.567 (A$91.387 per veicoli efficienti <7L/100km).',
      exemptions: ['Veicoli <A$80.567 (o A$91.387 efficienti)', 'EV (dal 2022)'],
      specific_penalty: 'Per prezzo (non CO₂)',
    },
    es: {
      system_description: 'Sin malus CO₂. LCT 33% por encima de A$80.567 (A$91.387 para vehículos eficientes <7L/100km).',
      exemptions: ['Vehículos <A$80.567 (o A$91.387 eficientes)', 'EV (desde 2022)'],
      specific_penalty: 'Por precio (no CO₂)',
    },
  },

  // ── Brazil ────────────────────────────────────────────────────────────────
  BR: {
    en: {
      system_description: 'No CO₂ malus. IPI (Imposto sobre Produtos Industrializados): 7–25% by displacement and fuel type.',
      exemptions: ['Flex-fuel (reduced rate)', 'EV/Hybrids: reduced IPI'],
      specific_penalty: 'By displacement (not CO₂)',
      notes: '2026 fiscal reform introduces a "Selective Tax" that could include CO₂.',
    },
    de: {
      system_description: 'Kein CO₂-Malus. IPI (Verbrauchsteuer): 7–25% nach Hubraum und Kraftstofftyp.',
      exemptions: ['Flex-Fuel (reduzierter Satz)', 'EV/Hybride: reduziertes IPI'],
      specific_penalty: 'Nach Hubraum (kein CO₂)',
    },
    it: {
      system_description: 'Nessun malus CO₂. IPI (Imposto sobre Produtos Industrializados): 7–25% per cilindrata e tipo carburante.',
      exemptions: ['Flex-fuel (aliquota ridotta)', 'EV/Ibridi: IPI ridotto'],
      specific_penalty: 'Per cilindrata (non CO₂)',
    },
    es: {
      system_description: 'Sin malus CO₂. IPI (Imposto sobre Produtos Industrializados): 7–25% por cilindrada y tipo de combustible.',
      exemptions: ['Flex-fuel (tasa reducida)', 'EV/Híbridos: IPI reducido'],
      specific_penalty: 'Por cilindrada (no CO₂)',
    },
  },

  // ── India ─────────────────────────────────────────────────────────────────
  IN: {
    en: {
      tax_name: 'GST + Cess (by category)',
      system_description: 'No CO₂ malus. GST 28% + compensation cess 1–22% by category (engine size, length).',
      exemptions: ['EV: GST reduced to 5%', 'Hybrids: variable rate'],
      specific_penalty: 'By category (not CO₂)',
      notes: 'System based on vehicle size, not emissions. EVs benefit heavily.',
    },
    de: {
      tax_name: 'GST + Cess (nach Kategorie)',
      system_description: 'Kein CO₂-Malus. GST 28% + Ausgleichsabgabe 1–22% nach Kategorie (Motorengröße, Fahrzeuglänge).',
      exemptions: ['EV: GST reduziert auf 5%', 'Hybride: variabler Satz'],
      specific_penalty: 'Nach Kategorie (kein CO₂)',
      notes: 'System basiert auf Fahrzeuggröße, nicht Emissionen. EVs profitieren stark.',
    },
    it: {
      tax_name: 'GST + Cess (per categoria)',
      system_description: 'Nessun malus CO₂. GST 28% + cess di compensazione 1–22% per categoria (cilindrata, lunghezza).',
      exemptions: ['EV: GST ridotto al 5%', 'Ibridi: tasso variabile'],
      specific_penalty: 'Per categoria (non CO₂)',
      notes: 'Sistema basato sulla dimensione del veicolo, non sulle emissioni. Gli EV beneficiano enormemente.',
    },
    es: {
      tax_name: 'GST + Cess (por categoría)',
      system_description: 'Sin malus CO₂. GST 28% + cess de compensación 1–22% por categoría (tamaño motor, longitud).',
      exemptions: ['EV: GST reducido al 5%', 'Híbridos: tasa variable'],
      specific_penalty: 'Por categoría (no CO₂)',
      notes: 'Sistema basado en el tamaño del vehículo, no las emisiones. Los EV se benefician ampliamente.',
    },
  },

  // ── South Korea ───────────────────────────────────────────────────────────
  KR: {
    en: {
      system_description: 'No direct CO₂ malus. Acquisition tax 7%, individual consumption tax 5%, education tax 30% of ICT.',
      exemptions: ['EV: partial exemptions (acquisition tax reduced to 4%)', 'Hybrids: reductions'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Significant subsidies for EV (up to 12M KRW). No direct CO₂ malus.',
    },
    de: {
      system_description: 'Kein direkter CO₂-Malus. Erwerbsteuer 7%, Verbrauchsteuer 5%, Bildungssteuer 30% der ICT.',
      exemptions: ['EV: teilweise Befreiungen (Erwerbsteuer auf 4% reduziert)', 'Hybride: Ermäßigungen'],
      specific_penalty: 'Kein CO₂-Malus',
    },
    it: {
      system_description: 'Nessun malus CO₂ diretto. Tassa di acquisizione 7%, imposta sui consumi individuali 5%, tassa educativa 30% dell\'ICT.',
      exemptions: ['EV: esenzioni parziali (tassa di acquisizione ridotta al 4%)', 'Ibridi: riduzioni'],
      specific_penalty: 'Nessun malus CO₂',
    },
    es: {
      system_description: 'Sin malus CO₂ directo. Impuesto de adquisición 7%, impuesto al consumo individual 5%, impuesto educativo 30% del ICT.',
      exemptions: ['EV: exenciones parciales (impuesto de adquisición reducido al 4%)', 'Híbridos: reducciones'],
      specific_penalty: 'Sin malus CO₂',
    },
  },

  // ── Ireland ───────────────────────────────────────────────────────────────
  IE: {
    en: { tax_name: 'VRT (Vehicle Registration Tax)' },
    de: { tax_name: 'VRT (Fahrzeugzulassungssteuer)' },
    it: { tax_name: 'VRT (Tassa Registrazione Veicolo)' },
    es: { tax_name: 'VRT (Impuesto Matriculación Vehículo)' },
  },

  // ── Luxembourg ────────────────────────────────────────────────────────────
  LU: {
    en: {
      tax_name: 'CO₂ Registration Tax (Luxembourg)',
      exemptions: ['EV: exempt + €5,000 bonus'],
      notes: 'Among the most EV-friendly in Europe.',
    },
    de: {
      tax_name: 'CO₂-Zulassungssteuer (Luxemburg)',
      exemptions: ['EV: befreit + 5.000 € Bonus'],
      notes: 'Einer der EV-freundlichsten Standorte in Europa.',
    },
    it: {
      tax_name: 'Tassa CO₂ di immatricolazione (Lussemburgo)',
      exemptions: ['EV: esente + bonus €5.000'],
    },
    es: {
      tax_name: 'Tasa CO₂ de matriculación (Luxemburgo)',
      exemptions: ['EV: exento + bono €5.000'],
    },
  },

  // ── Slovenia ──────────────────────────────────────────────────────────────
  SI: {
    en: {
      exemptions: ['EV: 0%'],
      notes: 'Estimate 2024.',
    },
    de: { exemptions: ['EV: 0%'], notes: 'Schätzung 2024.' },
    it: { exemptions: ['EV: 0%'], notes: 'Stima 2024.' },
    es: { exemptions: ['EV: 0%'], notes: 'Estimación 2024.' },
  },

  // ── Greece ────────────────────────────────────────────────────────────────
  GR: {
    en: { exemptions: ['EV: exempt + €6,000 bonus'], notes: 'Schedule 2024.' },
    de: { exemptions: ['EV: befreit + 6.000 € Bonus'], notes: 'Tarif 2024.' },
    it: { exemptions: ['EV: esente + bonus €6.000'], notes: 'Tabella 2024.' },
    es: { exemptions: ['EV: exento + bono €6.000'], notes: 'Baremo 2024.' },
  },

  // ── Estonia ───────────────────────────────────────────────────────────────
  EE: {
    en: { tax_name: 'Sõidukimaks (annual CO₂ tax)', exemptions: ['EV: ~€50/year flat rate'], notes: 'Since 1 July 2024. Annual.' },
    de: { tax_name: 'Sõidukimaks (jährliche CO₂-Steuer)', exemptions: ['EV: ~50 €/Jahr Pauschale'] },
    it: { tax_name: 'Sõidukimaks (tassa CO₂ annuale)', exemptions: ['EV: ~50 €/anno forfettario'] },
    es: { tax_name: 'Sõidukimaks (impuesto CO₂ anual)', exemptions: ['EV: ~50 €/año tarifa plana'] },
  },

  // ── Malta ─────────────────────────────────────────────────────────────────
  MT: {
    en: { exemptions: ['EV: exempt + €11,000 grant'], notes: 'Estimate 2024.' },
    de: { exemptions: ['EV: befreit + 11.000 € Zuschuss'], notes: 'Schätzung 2024.' },
    it: { exemptions: ['EV: esente + sussidio €11.000'], notes: 'Stima 2024.' },
    es: { exemptions: ['EV: exento + subvención €11.000'], notes: 'Estimación 2024.' },
  },

  // ── Cyprus ────────────────────────────────────────────────────────────────
  CY: {
    en: { exemptions: ['EV: exempt'], notes: 'Estimate 2024.' },
    de: { exemptions: ['EV: befreit'], notes: 'Schätzung 2024.' },
    it: { exemptions: ['EV: esente'], notes: 'Stima 2024.' },
    es: { exemptions: ['EV: exento'], notes: 'Estimación 2024.' },
  },

  // ── Croatia ───────────────────────────────────────────────────────────────
  HR: {
    en: { exemptions: ['EV: exempt'], notes: 'Estimate. CO₂ + power system.' },
    de: { exemptions: ['EV: befreit'], notes: 'Schätzung. CO₂ + Leistungssystem.' },
    it: { exemptions: ['EV: esente'], notes: 'Stima. Sistema CO₂ + potenza.' },
    es: { exemptions: ['EV: exento'], notes: 'Estimación. Sistema CO₂ + potencia.' },
  },

  // ── Slovakia ──────────────────────────────────────────────────────────────
  SK: {
    en: {
      tax_name: 'No CO₂ malus (Slovakia)',
      system_description: 'No CO₂ malus at registration.',
      exemptions: ['EV: reduced VAT'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Reform under discussion.',
    },
    de: {
      tax_name: 'Kein CO₂-Malus (Slowakei)',
      system_description: 'Kein CO₂-Malus bei der Zulassung.',
      exemptions: ['EV: ermäßigte MwSt'],
      specific_penalty: 'Kein CO₂-Malus',
    },
    it: {
      tax_name: 'Nessun malus CO₂ (Slovacchia)',
      system_description: 'Nessun malus CO₂ all\'immatricolazione.',
      exemptions: ['EV: IVA ridotta'],
      specific_penalty: 'Nessun malus CO₂',
    },
    es: {
      tax_name: 'Sin malus CO₂ (Eslovaquia)',
      system_description: 'Sin malus CO₂ en la matriculación.',
      exemptions: ['EV: IVA reducido'],
      specific_penalty: 'Sin malus CO₂',
    },
  },

  // ── Czech Republic ────────────────────────────────────────────────────────
  CZ: {
    en: {
      tax_name: 'No CO₂ malus (Czech Republic)',
      system_description: 'No CO₂ malus at registration.',
      exemptions: ['EV: incentives up to 300,000 CZK'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Slow EV transition.',
    },
    de: {
      tax_name: 'Kein CO₂-Malus (Tschechien)',
      system_description: 'Kein CO₂-Malus bei der Zulassung.',
      exemptions: ['EV: Anreize bis 300.000 CZK'],
      specific_penalty: 'Kein CO₂-Malus',
    },
    it: {
      tax_name: 'Nessun malus CO₂ (Repubblica Ceca)',
      system_description: 'Nessun malus CO₂ all\'immatricolazione.',
      exemptions: ['EV: incentivi fino a 300.000 CZK'],
      specific_penalty: 'Nessun malus CO₂',
    },
    es: {
      tax_name: 'Sin malus CO₂ (República Checa)',
      system_description: 'Sin malus CO₂ en la matriculación.',
      exemptions: ['EV: incentivos hasta 300.000 CZK'],
      specific_penalty: 'Sin malus CO₂',
    },
  },

  // ── Hungary ───────────────────────────────────────────────────────────────
  HU: {
    en: {
      system_description: 'Based on power (kW) and age.',
      exemptions: ['EV: exempt'],
      specific_penalty: 'By power (not CO₂)',
      notes: 'Based on engine power.',
    },
    de: {
      system_description: 'Basiert auf Leistung (kW) und Alter.',
      exemptions: ['EV: befreit'],
      specific_penalty: 'Nach Leistung (kein CO₂)',
    },
    it: {
      system_description: 'Basato su potenza (kW) ed età.',
      exemptions: ['EV: esente'],
      specific_penalty: 'Per potenza (non CO₂)',
    },
    es: {
      system_description: 'Basado en potencia (kW) y antigüedad.',
      exemptions: ['EV: exento'],
      specific_penalty: 'Por potencia (no CO₂)',
    },
  },

  // ── Latvia ────────────────────────────────────────────────────────────────
  LV: {
    en: {
      system_description: 'Annual tax based on weight and power.',
      exemptions: ['EV: reduced rate'],
      specific_penalty: 'By weight/kW (not CO₂)',
      notes: 'Reform in progress.',
    },
    de: {
      system_description: 'Jährliche Steuer basiert auf Gewicht und Leistung.',
      exemptions: ['EV: ermäßigter Satz'],
      specific_penalty: 'Nach Gewicht/kW (kein CO₂)',
    },
    it: {
      system_description: 'Tassa annuale basata su peso e potenza.',
      exemptions: ['EV: tasso ridotto'],
      specific_penalty: 'Per peso/kW (non CO₂)',
    },
    es: {
      system_description: 'Impuesto anual basado en peso y potencia.',
      exemptions: ['EV: tasa reducida'],
      specific_penalty: 'Por peso/kW (no CO₂)',
    },
  },

  // ── Lithuania ─────────────────────────────────────────────────────────────
  LT: {
    en: {
      system_description: 'Annual tax based on power and age.',
      exemptions: ['EV: exempt'],
      specific_penalty: 'By power (not CO₂)',
      notes: 'Reform expected 2026.',
    },
    de: {
      system_description: 'Jährliche Steuer basiert auf Leistung und Alter.',
      exemptions: ['EV: befreit'],
      specific_penalty: 'Nach Leistung (kein CO₂)',
    },
    it: {
      system_description: 'Tassa annuale basata su potenza ed età.',
      exemptions: ['EV: esente'],
      specific_penalty: 'Per potenza (non CO₂)',
    },
    es: {
      system_description: 'Impuesto anual basado en potencia y antigüedad.',
      exemptions: ['EV: exento'],
      specific_penalty: 'Por potencia (no CO₂)',
    },
  },

  // ── Romania ───────────────────────────────────────────────────────────────
  RO: {
    en: {
      tax_name: 'No CO₂ malus (Romania)',
      system_description: 'The timbru de mediu was abolished in 2017.',
      exemptions: ['EV: purchase bonus €10,000'],
      specific_penalty: 'No CO₂ malus',
      notes: 'Timbru de mediu cancelled. No replacement.',
    },
    de: {
      tax_name: 'Kein CO₂-Malus (Rumänien)',
      system_description: 'Das timbru de mediu wurde 2017 abgeschafft.',
      exemptions: ['EV: Kaufbonus 10.000 €'],
      specific_penalty: 'Kein CO₂-Malus',
    },
    it: {
      tax_name: 'Nessun malus CO₂ (Romania)',
      system_description: 'Il timbru de mediu è stato abolito nel 2017.',
      exemptions: ['EV: bonus acquisto €10.000'],
      specific_penalty: 'Nessun malus CO₂',
    },
    es: {
      tax_name: 'Sin malus CO₂ (Rumanía)',
      system_description: 'El timbru de mediu fue abolido en 2017.',
      exemptions: ['EV: bono de compra €10.000'],
      specific_penalty: 'Sin malus CO₂',
    },
  },

  // ── Bulgaria ──────────────────────────────────────────────────────────────
  BG: {
    en: {
      system_description: 'Annual tax based on power and Euro standard.',
      exemptions: ['EV: exempt'],
      specific_penalty: 'By power (not CO₂)',
      notes: 'One of the least advanced EU countries on CO₂.',
    },
    de: {
      system_description: 'Jährliche Steuer basiert auf Leistung und Euro-Norm.',
      exemptions: ['EV: befreit'],
      specific_penalty: 'Nach Leistung (kein CO₂)',
    },
    it: {
      system_description: 'Tassa annuale basata su potenza e norma Euro.',
      exemptions: ['EV: esente'],
      specific_penalty: 'Per potenza (non CO₂)',
    },
    es: {
      system_description: 'Impuesto anual basado en potencia y norma Euro.',
      exemptions: ['EV: exento'],
      specific_penalty: 'Por potencia (no CO₂)',
    },
  },
}

// ── Special case: France exemptions depend on period ──────────────────────────
function getFRExemptions(lang, period) {
  const isLatePeriod = period === '2026' || period === '2027'
  const key = isLatePeriod ? 'exemptions_2026_27' : 'exemptions_before_2026'
  return (COUNTRY_LABELS.FR[lang] || COUNTRY_LABELS.FR.en)?.[key]
    || COUNTRY_LABELS.FR.en[key]
}

// ── Main localization function ────────────────────────────────────────────────
export function localizeResult(result, lang) {
  if (!result || lang === 'fr') return result

  const code = result.country?.code
  if (!code) return result

  const labelSet = COUNTRY_LABELS[code]
  if (!labelSet) {
    // No translations defined — just add localized country name
    return {
      ...result,
      country: { ...result.country, localizedName: getCountryName(code, lang) },
    }
  }

  // Prefer the requested lang, fall back to EN
  const labels = labelSet[lang] || labelSet.en || {}
  const enLabels = labelSet.en || {}

  // Special handling for France exemptions (period-dependent)
  let exemptions = labels.exemptions || enLabels.exemptions
  if (code === 'FR') {
    // Detect period from tax_name (e.g. "Malus CO₂ + Poids (TMOM) — 2025")
    const periodMatch = result.tax_name?.match(/\b(202[3-9])\b/)
    const period = periodMatch ? periodMatch[1] : '2025'
    exemptions = getFRExemptions(lang, period)
    if (exemptions) {
      // Override both current and fallback
    } else {
      exemptions = result.exemptions // keep original
    }
  }

  // Build merged result — only override fields that have translations
  const merged = { ...result }

  // tax_name
  if (labels.tax_name || enLabels.tax_name) {
    merged.tax_name = labels.tax_name || enLabels.tax_name
  } else if ((labels.tax_name_prefix || enLabels.tax_name_prefix) && result.tax_name) {
    // For FR/GB: prefix + the dynamic part (e.g. period/barème)
    const prefix = labels.tax_name_prefix || enLabels.tax_name_prefix
    const suffix = result.tax_name.split('—')[1] || ''
    const translatedSuffix = translateTaxNameSuffix(suffix, lang)
    merged.tax_name = translatedSuffix ? `${prefix} —${translatedSuffix}` : prefix
  }

  if (labels.system_description || enLabels.system_description) {
    merged.system_description = labels.system_description || enLabels.system_description
  }

  if (exemptions) {
    merged.exemptions = exemptions
  }

  // specific_penalty: only override when the result is a static "no-malus" string
  if (result.specific_penalty_amount === 0 && (labels.specific_penalty || enLabels.specific_penalty)) {
    merged.specific_penalty = labels.specific_penalty || enLabels.specific_penalty
  }

  if (labels.notes || enLabels.notes) {
    merged.notes = labels.notes || enLabels.notes
  }

  // Translate bracket labels
  if (merged.brackets) {
    merged.brackets = merged.brackets.map(b => ({ ...b, label: translateBracketLabel(b.label, lang) }))
  }
  if (merged.weight_brackets) {
    merged.weight_brackets = merged.weight_brackets.map(b => ({ ...b, label: translateBracketLabel(b.label, lang) }))
  }

  // Translate specific_penalty when it's a static "no tax" string
  if (merged.specific_penalty === 'Aucune taxe') {
    merged.specific_penalty = translateBracketLabel('Aucune taxe', lang)
  }

  // Always add localized country name
  merged.country = {
    ...result.country,
    localizedName: getCountryName(code, lang) || result.country.name,
  }

  return merged
}
