// CO2 & Malus Mondial v42 — calculation engine extracted from co2-malus.vercel.app
// 40 countries · France barèmes 2023-2027 · Import décote · Multi-country

const FR_BAREME_2023 = {
  123: 50,
  124: 75,
  125: 100,
  126: 125,
  127: 150,
  128: 170,
  129: 190,
  130: 210,
  131: 230,
  132: 240,
  133: 260,
  134: 280,
  135: 310,
  136: 330,
  137: 360,
  138: 400,
  139: 450,
  140: 540,
  141: 650,
  142: 740,
  143: 818,
  144: 898,
  145: 983,
  146: 1074,
  147: 1172,
  148: 1276,
  149: 1386,
  150: 1504,
  151: 1629,
  152: 1761,
  153: 1901,
  154: 2049,
  155: 2205,
  156: 2370,
  157: 2544,
  158: 2726,
  159: 2918,
  160: 3119,
  161: 3331,
  162: 3552,
  163: 3784,
  164: 4026,
  165: 4279,
  166: 4543,
  167: 4818,
  168: 5105,
  169: 5404,
  170: 5715,
  171: 6039,
  172: 6375,
  173: 6724,
  174: 7086,
  175: 7462,
  176: 7851,
  177: 8254,
  178: 8671,
  179: 9103,
  180: 9550,
  181: 10011,
  182: 10488,
  183: 10980,
  184: 11488,
  185: 12012,
  186: 12552,
  187: 13109,
  188: 13682,
  189: 14273,
  190: 14881,
  191: 15506,
  192: 16149,
  193: 16810,
  194: 17490,
  195: 18188,
  196: 18905,
  197: 19641,
  198: 20396,
  199: 21171,
  200: 21966,
  201: 22781,
  202: 23616,
  203: 24472,
  204: 25349,
  205: 26247,
  206: 27166,
  207: 28107,
  208: 29070,
  209: 30056,
  210: 31063,
  211: 32094,
  212: 33147,
  213: 34224,
  214: 35324,
  215: 36447,
  216: 37595,
  217: 38767,
  218: 39964,
  219: 41185,
  220: 42431,
  221: 43703,
  222: 45000,
  223: 46323,
  224: 47672,
  225: 49047
};

// === BARÈME 2024 (immat 01/01/2024 → 28/02/2025) ===
// Seuil 118 g/km, plafond 60 000 € à 193 g/km
const FR_BAREME_2024 = {
  118: 50,
  119: 75,
  120: 100,
  121: 125,
  122: 150,
  123: 170,
  124: 190,
  125: 210,
  126: 230,
  127: 240,
  128: 260,
  129: 280,
  130: 310,
  131: 330,
  132: 360,
  133: 400,
  134: 450,
  135: 540,
  136: 650,
  137: 740,
  138: 818,
  139: 898,
  140: 983,
  141: 1074,
  142: 1172,
  143: 1276,
  144: 1386,
  145: 1504,
  146: 1629,
  147: 1761,
  148: 1901,
  149: 2049,
  150: 2205,
  151: 2370,
  152: 2544,
  153: 2726,
  154: 2918,
  155: 3119,
  156: 3331,
  157: 3552,
  158: 3784,
  159: 4026,
  160: 4279,
  161: 4543,
  162: 4818,
  163: 5105,
  164: 5404,
  165: 5715,
  166: 6126,
  167: 6537,
  168: 7248,
  169: 7959,
  170: 8770,
  171: 9681,
  172: 10692,
  173: 11803,
  174: 13014,
  175: 14325,
  176: 15736,
  177: 17247,
  178: 18858,
  179: 20569,
  180: 22380,
  181: 24291,
  182: 26302,
  183: 28413,
  184: 30624,
  185: 32935,
  186: 35346,
  187: 37857,
  188: 40468,
  189: 43179,
  190: 45990,
  191: 48901,
  192: 51912,
  193: 55023
};

// === BARÈME 2025 (immat du 01/03/2025 au 31/12/2025) ===
// Seuil 113 g/km, plafond 70 000 € à 193 g/km
const FR_BAREME_2025 = {
  113: 50,
  114: 75,
  115: 100,
  116: 125,
  117: 150,
  118: 170,
  119: 190,
  120: 210,
  121: 230,
  122: 240,
  123: 260,
  124: 280,
  125: 310,
  126: 330,
  127: 360,
  128: 400,
  129: 450,
  130: 540,
  131: 650,
  132: 740,
  133: 818,
  134: 898,
  135: 983,
  136: 1074,
  137: 1172,
  138: 1276,
  139: 1386,
  140: 1504,
  141: 1629,
  142: 1761,
  143: 1901,
  144: 2049,
  145: 2205,
  146: 2370,
  147: 2544,
  148: 2726,
  149: 2918,
  150: 3119,
  151: 3331,
  152: 3552,
  153: 3784,
  154: 4026,
  155: 4279,
  156: 4543,
  157: 4818,
  158: 5105,
  159: 5404,
  160: 5715,
  161: 6126,
  162: 6637,
  163: 7248,
  164: 7959,
  165: 8770,
  166: 9681,
  167: 10692,
  168: 11803,
  169: 13014,
  170: 14325,
  171: 15736,
  172: 17247,
  173: 18858,
  174: 20569,
  175: 22380,
  176: 24291,
  177: 26302,
  178: 28413,
  179: 30624,
  180: 32935,
  181: 35346,
  182: 37857,
  183: 40468,
  184: 43179,
  185: 45990,
  186: 48901,
  187: 51912,
  188: 55023,
  189: 58134,
  190: 61245,
  191: 64356,
  192: 67467
};

// === BARÈME 2026 (immat depuis 01/01/2026) ===
// Seuil 108 g/km, plafond 80 000 € à 192 g/km, masse 1 500 kg
const FR_BAREME_2026 = {
  108: 50,
  109: 75,
  110: 100,
  111: 125,
  112: 150,
  113: 170,
  114: 190,
  115: 210,
  116: 230,
  117: 240,
  118: 260,
  119: 280,
  120: 310,
  121: 330,
  122: 360,
  123: 400,
  124: 450,
  125: 540,
  126: 650,
  127: 740,
  128: 818,
  129: 898,
  130: 983,
  131: 1074,
  132: 1172,
  133: 1276,
  134: 1386,
  135: 1504,
  136: 1629,
  137: 1761,
  138: 1901,
  139: 2049,
  140: 2205,
  141: 2370,
  142: 2544,
  143: 2726,
  144: 2918,
  145: 3119,
  146: 3331,
  147: 3552,
  148: 3784,
  149: 4026,
  150: 4279,
  151: 4543,
  152: 4818,
  153: 5105,
  154: 5404,
  155: 5715,
  156: 6126,
  157: 6637,
  158: 7248,
  159: 7959,
  160: 8770,
  161: 9681,
  162: 10692,
  163: 11803,
  164: 13014,
  165: 14325,
  166: 15736,
  167: 17247,
  168: 18858,
  169: 20569,
  170: 22380,
  171: 24291,
  172: 26302,
  173: 28413,
  174: 30624,
  175: 32935,
  176: 35346,
  177: 37857,
  178: 40468,
  179: 43179,
  180: 45990,
  181: 48901,
  182: 51912,
  183: 55023,
  184: 58134,
  185: 61245,
  186: 64356,
  187: 67467,
  188: 70578,
  189: 73689,
  190: 76800,
  191: 79911
};

// === BARÈME 2027 (entrée en vigueur 01/09/2026, applicable au-delà) — Art. L421-62 CIBS ===
// Seuil 103 g/km, plafond 90 000 € à partir de >189 g/km
const FR_BAREME_2027 = {
  103: 50, 104: 75, 105: 100, 106: 125, 107: 150, 108: 170, 109: 190, 110: 210, 111: 230, 112: 240,
  113: 260, 114: 280, 115: 310, 116: 330, 117: 360, 118: 400, 119: 450, 120: 540, 121: 650, 122: 740,
  123: 818, 124: 898, 125: 983, 126: 1074, 127: 1172, 128: 1276, 129: 1386, 130: 1504, 131: 1629, 132: 1761,
  133: 1901, 134: 2049, 135: 2205, 136: 2370, 137: 2544, 138: 2726, 139: 2918, 140: 3119, 141: 3331, 142: 3552,
  143: 3784, 144: 4026, 145: 4279, 146: 4543, 147: 4818, 148: 5105, 149: 5404, 150: 5715, 151: 6126, 152: 6637,
  153: 7248, 154: 7959, 155: 8770, 156: 9681, 157: 10692, 158: 11803, 159: 13014, 160: 14325, 161: 15736, 162: 17247,
  163: 18858, 164: 20569, 165: 22380, 166: 24291, 167: 26302, 168: 28413, 169: 30624, 170: 32935, 171: 35346, 172: 37857,
  173: 40468, 174: 43179, 175: 45990, 176: 48901, 177: 51912, 178: 55023, 179: 58134, 180: 61245, 181: 64356, 182: 67467,
  183: 70578, 184: 73689, 185: 76800, 186: 79911, 187: 83022, 188: 86133, 189: 89244
};

// Détermine le barème applicable selon la date d'immatriculation (ISO YYYY-MM-DD)
function getFRPeriod(dateStr) {
  if (!dateStr) return "2025";
  const d = new Date(dateStr);
  if (d < new Date("2024-01-01")) return "2023";
  if (d < new Date("2025-03-01")) return "2024";
  if (d < new Date("2026-01-01")) return "2025";
  if (d < new Date("2026-09-01")) return "2026";
  return "2027";
}
const computeFR = (g, dateImmat) => {
  const period = getFRPeriod(dateImmat);
  if (period === "2023") {
    if (g <= 122) return 0;
    if (g >= 226) return 50000;
    return FR_BAREME_2023[g] || 50000;
  }
  if (period === "2024") {
    if (g <= 117) return 0;
    if (g >= 194) return 60000;
    return FR_BAREME_2024[g] || 60000;
  }
  if (period === "2026") {
    if (g <= 107) return 0;
    if (g >= 192) return 80000;
    return FR_BAREME_2026[g] || 80000;
  }
  if (period === "2027") {
    if (g <= 102) return 0;
    if (g >= 190) return 90000;
    return FR_BAREME_2027[g] || 90000;
  }
  // 2025 default
  if (g <= 112) return 0;
  if (g >= 193) return 70000;
  return FR_BAREME_2025[g] || 70000;
};

// ─── 🇫🇷 FRANCE — Malus au poids (TMOM) 2024/2025/2026 ─────────────────
function computeFRPoids(kg, fuelType = "thermique", dateImmat) {
  const period = getFRPeriod(dateImmat);

  // Seuil de déclenchement selon période
  // 2023: 1 800 kg | 2024 & 2025: 1 600 kg | 2026 & 2027: 1 500 kg
  const seuil = period === "2023" ? 1800 : (period === "2026" || period === "2027") ? 1500 : 1600;

  // Abattements selon motorisation
  let abattement = 0;
  if (fuelType === "hybride") abattement = 100;
  if (fuelType === "phev") abattement = Math.min(200, kg * 0.15);
  if (fuelType === "ev") {
    if (period !== "2026" && period !== "2027") return 0;
    const d = new Date(dateImmat);
    abattement = d >= new Date("2026-07-01") ? 600 : 400;
  }
  const masseRetenue = kg - abattement;
  if (masseRetenue < seuil) return 0;
  let tax = 0;
  if (period === "2023") {
    // Barème 2023 : tranche unique 10 €/kg au-dessus de 1 800 kg
    tax = (masseRetenue - 1799) * 10;
  } else if (period === "2026" || period === "2027") {
    if (masseRetenue >= 1500) tax += (Math.min(masseRetenue, 1599) - 1499) * 10;
    if (masseRetenue > 1599) tax += (Math.min(masseRetenue, 1799) - 1599) * 15;
    if (masseRetenue > 1799) tax += (Math.min(masseRetenue, 1899) - 1799) * 20;
    if (masseRetenue > 1899) tax += (masseRetenue - 1899) * 30;
  } else {
    // 2024 / 2025
    if (masseRetenue >= 1600) tax += (Math.min(masseRetenue, 1799) - 1599) * 10;
    if (masseRetenue > 1799) tax += (Math.min(masseRetenue, 1899) - 1799) * 15;
    if (masseRetenue > 1899) tax += (Math.min(masseRetenue, 1999) - 1899) * 20;
    if (masseRetenue > 1999) tax += (masseRetenue - 1999) * 30;
  }
  return Math.round(tax);
}
function formatDateFR(iso) {
  if (!iso) return "non spécifiée";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Décote pour véhicule importé d'occasion — BARÈME OFFICIEL service-public.fr
// Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F35947
// Coefficient forfaitaire de décote selon l'ancienneté depuis 1ère immatriculation
function getImportDecote(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return 0;
  if (months <= 3) return 3;
  if (months <= 6) return 6;
  if (months <= 9) return 9;
  if (months <= 12) return 12;
  if (months <= 18) return 16;
  if (months <= 24) return 20;
  if (months <= 36) return 28;
  if (months <= 48) return 33;
  if (months <= 60) return 38;
  if (months <= 72) return 43;
  if (months <= 84) return 48;
  if (months <= 96) return 53;
  if (months <= 108) return 58;
  if (months <= 120) return 64;
  if (months <= 132) return 70;
  if (months <= 144) return 76;
  if (months <= 156) return 82;
  if (months <= 168) return 88;
  if (months <= 180) return 94;
  return 100; // 181+ mois = exonéré (taxe nulle)
}

// 🇵🇹 PORTUGAL — Décote ISV selon âge (Tabela D, art. 11 CISV)
function getImportDecotePT(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 12) return 10; // jusqu'à 1 an
  if (months <= 24) return 20; // 1-2 ans
  if (months <= 36) return 28; // 2-3 ans
  if (months <= 48) return 35; // 3-4 ans
  if (months <= 60) return 43; // 4-5 ans
  if (months <= 72) return 52; // 5-6 ans
  if (months <= 84) return 60; // 6-7 ans
  if (months <= 96) return 65; // 7-8 ans
  if (months <= 108) return 70; // 8-9 ans
  if (months <= 120) return 75; // 9-10 ans
  return 80; // 10+ ans (max légal CJUE)
}

// 🇳🇱 PAYS-BAS — Tabel afschrijving BPM (dépréciation officielle Belastingdienst)
function getImportDecoteNL(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return 0;
  if (months <= 3) return 8;
  if (months <= 5) return 12;
  if (months <= 9) return 24;
  if (months <= 12) return 28;
  if (months <= 24) return 37;
  if (months <= 36) return 47;
  if (months <= 48) return 57;
  if (months <= 60) return 66;
  if (months <= 72) return 72;
  if (months <= 84) return 76;
  if (months <= 96) return 80;
  if (months <= 108) return 82;
  if (months <= 120) return 84;
  return 92; // 10+ ans
}

// 🇩🇪 ALLEMAGNE — Décote selon âge (pour Kfz-Steuer indicative, marché occasion)
function getImportDecoteDE(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 12) return 0;   // < 1 an : pas de décote
  if (months <= 24) return 15;
  if (months <= 36) return 25;
  if (months <= 60) return 40;
  if (months <= 84) return 55;
  if (months <= 120) return 70;
  return 80; // 10+ ans
}

// 🇪🇸 ESPAGNE — Tabla anexo Ley 38/1992 (decreto 1165/1995)
function getImportDecoteES(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return 0;
  if (months <= 3) return 0;
  if (months <= 6) return 8;
  if (months <= 12) return 16;
  if (months <= 24) return 30;
  if (months <= 36) return 43;
  if (months <= 48) return 55;
  if (months <= 60) return 65;
  if (months <= 84) return 78;
  if (months <= 120) return 87;
  return 90; // 10+ ans (plafond légal)
}

// 🇧🇪 BELGIQUE — Dégressivité selon âge (Wallonie/Flandre/Bruxelles)
function getImportDecoteBE(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const years = (now.getFullYear() - d.getFullYear()) + (now.getMonth() - d.getMonth()) / 12;
  if (years < 1) return 0;
  if (years < 2) return 10;
  if (years < 3) return 20;
  if (years < 4) return 30;
  if (years < 5) return 40;
  if (years < 6) return 50;
  if (years < 7) return 60;
  if (years < 8) return 70;
  if (years < 9) return 80;
  if (years < 10) return 90;
  return 100; // 10+ ans : forfait minimum (50 €)
}

// 🇮🇪 IRLANDE — Dépréciation VRT (Revenue.ie OMSP table)
function getImportDecoteIE(dateImmat) {
  if (!dateImmat) return 0;
  const d = new Date(dateImmat);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return 0;
  if (months <= 3) return 4;
  if (months <= 6) return 8;
  if (months <= 12) return 15;
  if (months <= 24) return 27;
  if (months <= 36) return 38;
  if (months <= 48) return 48;
  if (months <= 60) return 57;
  if (months <= 72) return 65;
  if (months <= 84) return 72;
  if (months <= 96) return 78;
  if (months <= 120) return 84;
  return 90;
}

// ─── 🇬🇧 ROYAUME-UNI — gov.uk VED first-year (3 barèmes par année fiscale) ─────────
function getUKPeriod(dateStr) {
  if (!dateStr) return "2026";
  const d = new Date(dateStr);
  if (d < new Date("2025-04-01")) return "2024"; // 2024/25
  if (d < new Date("2026-04-01")) return "2025"; // 2025/26 (rates doublés)
  return "2026"; // 2026/27
}
const computeUK = (g, dateImmat) => {
  const p = getUKPeriod(dateImmat);
  if (p === "2024") {
    // Barème 2024/25 (avant doublement)
    if (g === 0) return 0;
    if (g <= 50) return 10;
    if (g <= 75) return 30;
    if (g <= 90) return 135;
    if (g <= 100) return 175;
    if (g <= 110) return 195;
    if (g <= 130) return 220;
    if (g <= 150) return 270;
    if (g <= 170) return 680;
    if (g <= 190) return 1095;
    if (g <= 225) return 1650;
    if (g <= 255) return 2340;
    return 2745;
  }
  if (p === "2025") {
    // Barème 2025/26 (1er avril 2025 — doublement)
    if (g === 0) return 10;
    if (g <= 50) return 110;
    if (g <= 75) return 130;
    if (g <= 90) return 270;
    if (g <= 100) return 350;
    if (g <= 110) return 390;
    if (g <= 130) return 440;
    if (g <= 150) return 540;
    if (g <= 170) return 1360;
    if (g <= 190) return 2190;
    if (g <= 225) return 3300;
    if (g <= 255) return 4680;
    return 5490;
  }
  // 2026/27 (1er avril 2026 — RPI inflation)
  if (g === 0) return 10;
  if (g <= 50) return 115;
  if (g <= 75) return 135;
  if (g <= 90) return 280;
  if (g <= 100) return 365;
  if (g <= 110) return 405;
  if (g <= 130) return 455;
  if (g <= 150) return 560;
  if (g <= 170) return 1410;
  if (g <= 190) return 2270;
  if (g <= 225) return 3420;
  if (g <= 255) return 4855;
  return 5690;
};

// ─── 🇪🇸 ESPAGNE — Agencia Tributaria IEDMT (% sur valeur) ──────────────
const computeESPercent = g => g < 120 ? 0 : g < 160 ? 4.75 : g < 200 ? 9.75 : 14.75;

// ─── 🇩🇪 ALLEMAGNE — ADAC Kfz-Steuer ANNUELLE composante CO₂ ────────────
const computeDE = g => {
  if (g <= 95) return 0;
  let t = 0;
  if (g > 95) t += (Math.min(g, 115) - 95) * 2.00;
  if (g > 115) t += (Math.min(g, 135) - 115) * 2.20;
  if (g > 135) t += (Math.min(g, 155) - 135) * 2.50;
  if (g > 155) t += (Math.min(g, 175) - 155) * 2.90;
  if (g > 175) t += (Math.min(g, 195) - 175) * 3.40;
  if (g > 195) t += (g - 195) * 4.00;
  return Math.round(t);
};

// ─── 🇳🇱 PAYS-BAS — Belastingdienst BPM 2025 ────────────────────────────
const computeNL = g => {
  if (g === 0) return 667;
  let tax = 667,
    prev = 0;
  const brackets = [{
    limit: 79,
    rate: 2.45
  }, {
    limit: 105,
    rate: 79.69
  }, {
    limit: 158,
    rate: 178.71
  }, {
    limit: 174,
    rate: 287.66
  }, {
    limit: 9999,
    rate: 596.31
  }];
  for (const b of brackets) {
    const gap = Math.min(g, b.limit) - prev;
    if (gap > 0) tax += gap * b.rate;
    if (g <= b.limit) break;
    prev = b.limit;
  }
  return Math.round(tax);
};

// ─── 🇵🇹 PORTUGAL — Autoridade Tributária ISV (composante ambientale WLTP gasoline 2025) ─
const computePT = g => {
  // Composante CO2 WLTP gasoline 2025-2026 (loi orçamento)
  if (g <= 99) return 0;
  if (g <= 115) return Math.round(g * 4.62 - 427.41);
  if (g <= 145) return Math.round(g * 8.09 - 750.99);
  if (g <= 175) return Math.round(g * 53.48 - 7308.51);
  if (g <= 195) return Math.round(g * 137.27 - 22380.31);
  return Math.round(g * 196.95 - 34387.32);
};

// ─── 🇳🇴 NORVÈGE — skatteetaten.no engangsavgift (composante CO₂ 2025, NOK→EUR ~0.087) ─
const computeNO = g => {
  if (g <= 87) return 0;
  let nok = 0;
  if (g > 87) nok += (Math.min(g, 118) - 87) * 815;
  if (g > 118) nok += (Math.min(g, 155) - 118) * 894;
  if (g > 155) nok += (Math.min(g, 181) - 155) * 2608;
  if (g > 181) nok += (g - 181) * 4168;
  return Math.round(nok * 0.087); // → EUR
};

// ─── 🇳🇴 NORVÈGE — Composante POIDS engangsavgift (12,5 NOK/kg au-dessus de 500 kg) ─
const computeNOPoids = (kg, fuelType) => {
  // S'applique à TOUS les véhicules, EV inclus depuis 2023
  if (kg <= 500) return 0;
  const nok = (kg - 500) * 12.5;
  return Math.round(nok * 0.087); // → EUR
};

// ─── 🇩🇰 DANEMARK — registreringsafgift (très simplifié, base 2025) ─────
const computeDK = g => {
  // Système très complexe basé sur prix + CO2 + autonomie élec.
  // Composante CO2 simplifiée : 250 DKK/g au-dessus de 0, 500 DKK/g au-dessus de 117, 950 DKK/g au-dessus de 150
  if (g === 0) return 0;
  let dkk = g * 250;
  if (g > 117) dkk += (g - 117) * 250;
  if (g > 150) dkk += (g - 150) * 450;
  return Math.round(dkk * 0.134); // DKK → EUR
};

// ─── 🇦🇹 AUTRICHE — NoVA Normverbrauchsabgabe (formule 2025+ BMF) ────────
// Source: bmf.gv.at — NoVA % = (CO2 - 96) / 4,4, plafond 80%
// + Malus CO2 fixe si >155 g/km : 80 €/g (+20 €/g supplémentaires au-delà de 175)
const computeAT = g => {
  if (g <= 95) return 0;
  let penalty = 0;
  if (g > 155) penalty += (g - 155) * 80;
  if (g > 175) penalty += (g - 175) * 20;
  return Math.round(penalty);
};

// ─── 🇫🇮 FINLANDE — autovero (% sur prix selon CO2) ─────────────────────
const computeFIPercent = g => {
  if (g === 0) return 0;
  if (g <= 50) return 2.7;
  if (g <= 100) return Math.round((2.7 + (g - 50) * 0.18) * 10) / 10;
  if (g <= 150) return Math.round((11.7 + (g - 100) * 0.25) * 10) / 10;
  if (g <= 200) return Math.round((24.2 + (g - 150) * 0.20) * 10) / 10;
  return 50;
};

// ─── 🇸🇪 SUÈDE — bonus malus supprimé en 2022 pour bonus, malus actif ───
// Forhöjd fordonsskatt première 3 ans depuis 2022 sur véhicules >75g/km
const computeSE = g => {
  if (g <= 75) return 0;
  // Tax annuelle première 3 ans : 107 SEK/g 76-125, 132 SEK/g >125
  let sek = 360; // base
  if (g > 75) sek += (Math.min(g, 125) - 75) * 107;
  if (g > 125) sek += (g - 125) * 132;
  return Math.round(sek * 0.087); // SEK → EUR (annuel)
};

// ─── 🇿🇦 AFRIQUE DU SUD — CO2 emissions tax (R110/g au-dessus 95) ───────
const computeZA = g => g <= 95 ? 0 : Math.round((g - 95) * 132 * 0.049); // ZAR → EUR

// ─── 🇸🇬 SINGAPOUR — VES Vehicle Emissions Scheme ─────────────────────
const computeSG = g => {
  // VES depuis 2018, malus pour Band C2 et Band C3
  if (g <= 125) return 0; // Band A1/A2/B = neutral ou rebate
  if (g <= 160) return Math.round(15000 * 0.69); // Band C1 surcharge S$15,000
  if (g <= 185) return Math.round(25000 * 0.69); // Band C2 S$25,000
  return Math.round(40000 * 0.69); // Band C3 S$40,000+
};

// ─── 🇧🇪 BELGIQUE Wallonie — TMC formule depuis juillet 2025 ─────────────
// Éco-malus supprimé en juillet 2025, mais TMC encore complexe (kW+CO2+poids)
const computeBE = g => {
  // Estimation pour TMC Wallonie nouvelle formule
  if (g <= 60) return 250;
  if (g <= 105) return 400;
  if (g <= 125) return 700;
  if (g <= 155) return 1200;
  if (g <= 195) return 2000;
  return 3000;
};

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION DE TOUS LES PAYS
// ═══════════════════════════════════════════════════════════════════════
function buildCountryData(code, g, kg = 1500, fuelType = "thermique", dateImmat = "2025-03-12", isImported = false, extra = {}) {
  const {
    displacement = 1300,
    vehiclePrice = 30000,
    fuelKind = "petrol",
    beRegion = "wallonie",
    esRegion = "standard",
    childrenCount = 0
  } = extra;
  const sev = a => a === 0 ? "none" : a < 500 ? "low" : a < 3000 ? "medium" : a < 15000 ? "high" : "very_high";
  switch (code) {
    case "FR":
      {
        const period = getFRPeriod(dateImmat);
        const plafonds = {
          "2023": 50000,
          "2024": 60000,
          "2025": 70000,
          "2026": 80000,
          "2027": 90000
        };
        const seuils = {
          "2023": 123,
          "2024": 118,
          "2025": 113,
          "2026": 108,
          "2027": 103
        };
        const plafond = plafonds[period];
        const seuil = seuils[period];

        // EV : exempté CO2 + poids en 2024-2025 ; en 2026+ abattement poids 400 kg (600 kg dès 01/07/2026)
        const isEV = fuelType === "ev";
        // Famille nombreuse (art. L421-70 CIBS) : applicable uniquement à partir de 3 enfants à charge
        // -20 g/km par enfant à charge (sans plafond explicite dans le texte légal)
        const reductionEnfants = childrenCount >= 3 ? childrenCount * 20 : 0;
        const gApplicable = Math.max(0, g - reductionEnfants);
        const malusCO2Brut = isEV ? 0 : computeFR(gApplicable, dateImmat);
        const malusPoidsBrut = computeFRPoids(kg, fuelType, dateImmat);

        // Décote pour véhicule importé d'occasion
        const decote = isImported ? getImportDecote(dateImmat) : 0;
        const malusCO2 = Math.round(malusCO2Brut * (1 - decote / 100));
        const malusPoidsAvantPlafond = Math.round(malusPoidsBrut * (1 - decote / 100));
        const poidsApplique = malusCO2 >= plafond ? 0 : Math.min(malusPoidsAvantPlafond, plafond - malusCO2);
        const total = malusCO2 + poidsApplique;
        const bonusEV = isEV ? 6000 : 0;
        const totalApresBonus = Math.max(0, total - bonusEV);
        const fuelLabel = {
          thermique: "Thermique/mHEV",
          hybride: "Hybride (-100 kg)",
          phev: "PHEV >50km (-200 kg max 15%)",
          ev: (period === "2026" || period === "2027") ? "EV (CO₂ exempté, poids appliqué)" : "Électrique (exempté)"
        }[fuelType];
        const bracketsByPeriod = {
          "2023": [{
            min_gkm: 0,
            max_gkm: 122,
            penalty: "0 €",
            label: "CO₂ exempté"
          }, {
            min_gkm: 123,
            max_gkm: 140,
            penalty: "50–540 €",
            label: "CO₂ basse"
          }, {
            min_gkm: 141,
            max_gkm: 165,
            penalty: "650–4 279 €",
            label: "CO₂ intermédiaire"
          }, {
            min_gkm: 166,
            max_gkm: 185,
            penalty: "4 543–22 380 €",
            label: "CO₂ haute"
          }, {
            min_gkm: 186,
            max_gkm: 999,
            penalty: "24 291–50 000 €",
            label: "CO₂ maximale"
          }],
          "2024": [{
            min_gkm: 0,
            max_gkm: 117,
            penalty: "0 €",
            label: "CO₂ exempté"
          }, {
            min_gkm: 118,
            max_gkm: 135,
            penalty: "50–540 €",
            label: "CO₂ basse"
          }, {
            min_gkm: 136,
            max_gkm: 160,
            penalty: "650–4 279 €",
            label: "CO₂ intermédiaire"
          }, {
            min_gkm: 161,
            max_gkm: 180,
            penalty: "4 543–22 380 €",
            label: "CO₂ haute"
          }, {
            min_gkm: 181,
            max_gkm: 999,
            penalty: "24 291–60 000 €",
            label: "CO₂ maximale"
          }],
          "2025": [{
            min_gkm: 0,
            max_gkm: 112,
            penalty: "0 €",
            label: "CO₂ exempté"
          }, {
            min_gkm: 113,
            max_gkm: 130,
            penalty: "50–540 €",
            label: "CO₂ basse"
          }, {
            min_gkm: 131,
            max_gkm: 160,
            penalty: "650–5 715 €",
            label: "CO₂ intermédiaire"
          }, {
            min_gkm: 161,
            max_gkm: 175,
            penalty: "6 126–22 380 €",
            label: "CO₂ haute"
          }, {
            min_gkm: 176,
            max_gkm: 999,
            penalty: "24 291–70 000 €",
            label: "CO₂ maximale"
          }],
          "2026": [{
            min_gkm: 0,
            max_gkm: 107,
            penalty: "0 €",
            label: "CO₂ exempté"
          }, {
            min_gkm: 108,
            max_gkm: 125,
            penalty: "50–540 €",
            label: "CO₂ basse"
          }, {
            min_gkm: 126,
            max_gkm: 155,
            penalty: "650–5 715 €",
            label: "CO₂ intermédiaire"
          }, {
            min_gkm: 156,
            max_gkm: 170,
            penalty: "6 126–22 380 €",
            label: "CO₂ haute"
          }, {
            min_gkm: 171,
            max_gkm: 999,
            penalty: "24 291–80 000 €",
            label: "CO₂ maximale"
          }],
          "2027": [{
            min_gkm: 0,
            max_gkm: 102,
            penalty: "0 €",
            label: "CO₂ exempté"
          }, {
            min_gkm: 103,
            max_gkm: 120,
            penalty: "50–540 €",
            label: "CO₂ basse"
          }, {
            min_gkm: 121,
            max_gkm: 150,
            penalty: "650–5 715 €",
            label: "CO₂ intermédiaire"
          }, {
            min_gkm: 151,
            max_gkm: 165,
            penalty: "6 126–22 380 €",
            label: "CO₂ haute"
          }, {
            min_gkm: 166,
            max_gkm: 999,
            penalty: "24 291–90 000 €",
            label: "CO₂ maximale"
          }]
        };
        const weightBracketsByPeriod = {
          "2023": [{
            min_kg: 0,
            max_kg: 1799,
            penalty: "0 €/kg",
            label: "Exempté"
          }, {
            min_kg: 1800,
            max_kg: 9999,
            penalty: "10 €/kg",
            label: "Tranche unique"
          }],
          "2024": [{
            min_kg: 0,
            max_kg: 1599,
            penalty: "0 €/kg",
            label: "Exempté"
          }, {
            min_kg: 1600,
            max_kg: 1799,
            penalty: "10 €/kg",
            label: "Tranche 1"
          }, {
            min_kg: 1800,
            max_kg: 1899,
            penalty: "15 €/kg",
            label: "Tranche 2"
          }, {
            min_kg: 1900,
            max_kg: 1999,
            penalty: "20 €/kg",
            label: "Tranche 3"
          }, {
            min_kg: 2000,
            max_kg: 9999,
            penalty: "30 €/kg",
            label: "Tranche 4"
          }],
          "2025": [{
            min_kg: 0,
            max_kg: 1599,
            penalty: "0 €/kg",
            label: "Exempté"
          }, {
            min_kg: 1600,
            max_kg: 1799,
            penalty: "10 €/kg",
            label: "Tranche 1"
          }, {
            min_kg: 1800,
            max_kg: 1899,
            penalty: "15 €/kg",
            label: "Tranche 2"
          }, {
            min_kg: 1900,
            max_kg: 1999,
            penalty: "20 €/kg",
            label: "Tranche 3"
          }, {
            min_kg: 2000,
            max_kg: 9999,
            penalty: "30 €/kg",
            label: "Tranche 4"
          }],
          "2026": [{
            min_kg: 0,
            max_kg: 1499,
            penalty: "0 €/kg",
            label: "Exempté"
          }, {
            min_kg: 1500,
            max_kg: 1599,
            penalty: "10 €/kg",
            label: "Tranche 1"
          }, {
            min_kg: 1600,
            max_kg: 1799,
            penalty: "15 €/kg",
            label: "Tranche 2"
          }, {
            min_kg: 1800,
            max_kg: 1899,
            penalty: "20 €/kg",
            label: "Tranche 3"
          }, {
            min_kg: 1900,
            max_kg: 9999,
            penalty: "30 €/kg",
            label: "Tranche 4"
          }]
        };
        // Le barème 2027 utilise la même grille poids que 2026 (1500 kg seuil)
        weightBracketsByPeriod["2027"] = weightBracketsByPeriod["2026"];
        const periodLabels = {
          "2023": "Barème 2023 (immat. en 2023)",
          "2024": "Barème 2024 (immat. 01/01/2024 – 28/02/2025)",
          "2025": "Barème 2025 (immat. 01/03/2025 – 31/12/2025)",
          "2026": "Barème 2026 (immat. 01/01/2026 – 31/08/2026)",
          "2027": "Barème 2027 (immat. depuis 01/09/2026)"
        };
        return {
          tax_name: `Malus CO₂ + Poids (TMOM) — ${periodLabels[period]}`,
          threshold_gkm: seuil,
          max_penalty_eur: plafond,
          currency_symbol: "€",
          system_description: `Double malus à l'immatriculation : CO₂ + Masse. Barème selon date de 1ère immat. (réf. art. L421-58 à L421-81-1 CIBS). Plafond cumulé ${plafond.toLocaleString("fr-FR")} €. Motorisation : ${fuelLabel}.`,
          brackets: bracketsByPeriod[period],
          weight_brackets: weightBracketsByPeriod[period],
          weight_threshold: (period === "2026" || period === "2027") ? 1500 : 1600,
          malus_co2: malusCO2,
          malus_poids: poidsApplique,
          period: period,
          exemptions: (period === "2026" || period === "2027") ? ["Hydrogène", "CMI invalidité", "Familles ≥3 enfants : -20g/enfant (art. L421-70 CIBS)", "EV : CO₂ exempté mais malus poids appliqué (abattement 400 kg / 600 kg dès 01/07/2026)"] : ["100% électrique (CO₂ + poids)", "Hydrogène", "CMI invalidité", "Familles ≥3 enfants : -20g/enfant (art. L421-70 CIBS)"],
          specific_penalty: totalApresBonus === 0 ? "Aucun malus" : `${totalApresBonus.toLocaleString("fr-FR")} €`,
          specific_penalty_amount: totalApresBonus,
          has_malus: totalApresBonus > 0,
          severity: sev(totalApresBonus),
          notes: `Date d'immat. = ${formatDateFR(dateImmat)}.${isImported ? ` Véhicule importé (réception UE) : décote ${decote}%.` : ""} CO₂ ${malusCO2.toLocaleString("fr-FR")} € + Poids ${poidsApplique.toLocaleString("fr-FR")} € = ${total.toLocaleString("fr-FR")} € (plafond ${plafond.toLocaleString("fr-FR")} €).`,
          source: "service-public.fr / Légifrance",
          source_url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000044595989/LEGISCTA000044597055/",
          legal_ref: "Art. L421-58 à L421-81-1 CIBS · Art. L421-70 (familles ≥3 enfants) · JORF 30/12/2024",
          reliability: "official",
          advanced_params: ["childrenCount"]
        };
      }
    case "GB":
      {
        const ukPeriod = getUKPeriod(dateImmat);
        const periodLabels = {
          "2024": "2024/25 (avant 01/04/2025)",
          "2025": "2025/26 (01/04/2025 – 31/03/2026)",
          "2026": "2026/27 (depuis 01/04/2026)"
        };
        const a = computeUK(g, dateImmat);
        const eur = Math.round(a * 1.17);
        return {
          tax_name: `VED First-Year Rate — Barème ${periodLabels[ukPeriod]}`,
          threshold_gkm: 1,
          max_penalty_eur: Math.round(5690 * 1.17),
          currency_symbol: "£",
          system_description: `VERA 1994 (Vehicle Excise and Registration Act) - Tarif 1ère année basé sur CO₂ selon date d'immat. Année fiscale UK : 1er avril → 31 mars. EV soumis au VED depuis 01/04/2025.`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 0,
            penalty: "£10",
            label: "Zéro émission"
          }, {
            min_gkm: 1,
            max_gkm: 50,
            penalty: "£110–115",
            label: "Très faible"
          }, {
            min_gkm: 51,
            max_gkm: 75,
            penalty: "£130–135",
            label: "Faible"
          }, {
            min_gkm: 76,
            max_gkm: 130,
            penalty: "£270–455",
            label: "Modéré"
          }, {
            min_gkm: 131,
            max_gkm: 170,
            penalty: "£540–1 410",
            label: "Élevé"
          }, {
            min_gkm: 171,
            max_gkm: 255,
            penalty: "£2 190–4 855",
            label: "Très élevé"
          }, {
            min_gkm: 256,
            max_gkm: 999,
            penalty: "£5 490–5 690",
            label: "Maximal"
          }],
          exemptions: ["Véhicules historiques (+40 ans)", "Mobilité réduite"],
          specific_penalty: `£${a.toLocaleString("en-GB")} (~${eur} €)`,
          specific_penalty_amount: eur,
          has_malus: a > 10,
          severity: sev(eur),
          notes: `Date d'immat. = ${formatDateFR(dateImmat)}. Barème ${ukPeriod}/27. Supplément +£440/an pendant 5 ans si véhicule > £40 000.`,
          source: "gov.uk",
          source_url: "https://www.gov.uk/vehicle-tax-rate-tables",
          legal_ref: "Vehicle Excise and Registration Act 1994 (VERA) · Schedule 1 · Finance (No.2) Act 2023",
          reliability: "official"
        };
      }
    case "DE":
      {
        const co2Component = computeDE(g);
        // Composante cylindrée : 2€/100cm³ essence, 9,50€/100cm³ diesel
        const isDiesel = fuelKind === "diesel";
        const cylRate = isDiesel ? 9.50 : 2.00;
        const cylComponent = Math.round(displacement / 100 * cylRate);
        const totalBrut = co2Component + cylComponent;
        const decoteDE = isImported ? getImportDecoteDE(dateImmat) : 0;
        const totalAnnual = Math.round(totalBrut * (1 - decoteDE / 100));
        return {
          tax_name: "Kfz-Steuer (taxe ANNUELLE)",
          threshold_gkm: 96,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `PAS de malus à l'immat. Taxe ANNUELLE = cylindrée (${cylRate}€/100cm³ ${isDiesel ? 'diesel' : 'essence'}) + composante CO₂ progressive.${isImported ? ` Importé : décote ${decoteDE}%.` : ''}`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 95,
            penalty: "0 €",
            label: "Exempté CO₂"
          }, {
            min_gkm: 96,
            max_gkm: 115,
            penalty: "2,00 €/g",
            label: "Palier 1"
          }, {
            min_gkm: 116,
            max_gkm: 135,
            penalty: "2,20 €/g",
            label: "Palier 2"
          }, {
            min_gkm: 136,
            max_gkm: 155,
            penalty: "2,50 €/g",
            label: "Palier 3"
          }, {
            min_gkm: 156,
            max_gkm: 175,
            penalty: "2,90 €/g",
            label: "Palier 4"
          }, {
            min_gkm: 176,
            max_gkm: 195,
            penalty: "3,40 €/g",
            label: "Palier 5"
          }, {
            min_gkm: 196,
            max_gkm: 999,
            penalty: "4,00 €/g",
            label: "Palier 6"
          }],
          exemptions: ["EV 100% : exempté jusqu'en 2035 (prolongation Bundestag 04/12/2025)", "Oldtimers H-Kennzeichen (191,73 €/an)"],
          specific_penalty: `~${totalAnnual} €/an`,
          specific_penalty_amount: totalAnnual,
          has_malus: totalAnnual > 0,
          severity: sev(totalAnnual * 10),
          notes: `CO₂ ${co2Component}€/an + Cylindrée ${cylComponent}€/an (${displacement}cm³ × ${cylRate}€)${isImported ? ` − ${decoteDE}% (importé)` : ''} = ${totalAnnual} €/an. À payer CHAQUE ANNÉE.`,
          source: "Bundeszentralamt für Steuern (BZSt)",
          source_url: "https://www.gesetze-im-internet.de/kraftstg/",
          legal_ref: "Kraftfahrzeugsteuergesetz (KfzStG) §9 · BGBl. I 2002, S. 3843 · Einkommensteuergesetz §6 EV",
          reliability: "official",
          advanced_params: ["displacement", "fuelKind"]
        };
      }
    case "ES":
      {
        const pct = computeESPercent(g);
        // Modulation région
        const regionMul = {
          standard: 1,
          canarias: 0.5,
          navarra: 0.95,
          ceuta: 0
        }[esRegion] || 1;
        const finalPct = pct * regionMul;
        const estBrut = Math.round(vehiclePrice * finalPct / 100);
        const decoteES = isImported ? getImportDecoteES(dateImmat) : 0;
        const est = Math.round(estBrut * (1 - decoteES / 100));
        const regionLabel = {
          standard: "Péninsule",
          canarias: "Canaries (-50%)",
          navarra: "Navarra (-5%)",
          ceuta: "Ceuta/Melilla (exempté)"
        }[esRegion];
        return {
          tax_name: "IEDMT (Impuesto de Matriculación)",
          threshold_gkm: 120,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `Ley 38/1992 (Impuestos Especiales) art. 70 - Taxe immatriculation = % de la valeur HT, selon CO₂. Région : ${regionLabel}.${isImported ? ` Importé : décote ${decoteES}% (tabla anexo).` : ''}`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 119,
            penalty: "0%",
            label: "Exempté"
          }, {
            min_gkm: 120,
            max_gkm: 159,
            penalty: "4,75%",
            label: "Tranche 1"
          }, {
            min_gkm: 160,
            max_gkm: 199,
            penalty: "9,75%",
            label: "Tranche 2"
          }, {
            min_gkm: 200,
            max_gkm: 999,
            penalty: "14,75%",
            label: "Tranche 3"
          }],
          exemptions: ["100% électrique", "PHEV (souvent)", "Famille nombreuse (-50%)", "Ceuta/Melilla (exempté)"],
          specific_penalty: pct === 0 ? "0% (exempté)" : `${finalPct.toFixed(2)}% (~${est.toLocaleString()} € sur ${vehiclePrice.toLocaleString()} €)`,
          specific_penalty_amount: est,
          has_malus: pct > 0,
          severity: sev(est),
          notes: `Montant = ${finalPct.toFixed(2)}% × ${vehiclePrice.toLocaleString()} € (prix HT)${isImported ? ` − ${decoteES}% (importé)` : ''} = ${est.toLocaleString()} €. Région : ${regionLabel}.`,
          source: "Agencia Tributaria (AEAT)",
          source_url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GX04.shtml",
          legal_ref: "Ley 38/1992 art. 65–74 (Impuestos Especiales) · R.D. 1165/1995 · Orden HAP/544/2013",
          reliability: "official",
          advanced_params: ["vehiclePrice", "esRegion"]
        };
      }
    case "NL":
      {
        const brut = computeNL(g);
        const decoteNL = isImported ? getImportDecoteNL(dateImmat) : 0;
        const a = Math.round(brut * (1 - decoteNL / 100));
        return {
          tax_name: "BPM (Belasting Personenauto's)",
          threshold_gkm: 1,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: "Wet BPM 1992 - Taxe immatriculation basée sur CO₂ WLTP. EV soumis à un forfait fixe réduit (plus d'exemption depuis jan. 2025). PHEV : taxés comme thermiques. 2026 : seuils CO₂ abaissés −1,55% et tarifs +1,57% (Belastingplan 2025, business.gov.nl). Paliers révisés annuellement jusqu'en 2028.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 0,
            penalty: "Forfait fixe",
            label: "EV (plus exempt depuis 2025)"
          }, {
            min_gkm: 1,
            max_gkm: 79,
            penalty: "667 € + 2,45/g",
            label: "Palier 1"
          }, {
            min_gkm: 80,
            max_gkm: 105,
            penalty: "+ 79,69 €/g",
            label: "Palier 2"
          }, {
            min_gkm: 106,
            max_gkm: 158,
            penalty: "+ 178,71 €/g",
            label: "Palier 3"
          }, {
            min_gkm: 159,
            max_gkm: 174,
            penalty: "+ 287,66 €/g",
            label: "Palier 4"
          }, {
            min_gkm: 175,
            max_gkm: 999,
            penalty: "+ 596,31 €/g",
            label: "Palier 5"
          }],
          exemptions: ["100% électrique", "Hydrogène", "Adapté handicap"],
          specific_penalty: isImported ? `~${a.toLocaleString("nl-NL")} € (après décote ${decoteNL}%)` : `~${a.toLocaleString("nl-NL")} €`,
          specific_penalty_amount: a,
          has_malus: a > 0,
          severity: sev(a),
          notes: isImported ? `Véhicule importé : décote BPM ${decoteNL}% (Tabel afschrijving Belastingdienst). BPM brut: ${brut.toLocaleString()} € → ${a.toLocaleString()} €.` : "Surtaxe diesel possible. Barème durci chaque année.",
          source: "Belastingdienst",
          source_url: "https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/andere_belastingen/bpm/",
          legal_ref: "Wet BPM 1992 (Wet op de belasting van personenauto's en motorrijwielen) · Belastingplan 2025 (Stb. 2024, 397)",
          reliability: "official"
        };
      }
    case "IT":
      {
        return {
          tax_name: "IPT + Bollo (PAS de malus CO₂)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: "L'Italie n'a PAS de malus CO₂ à l'immatriculation. Seulement IPT (taxe provinciale fixe) et bollo annuel basé sur kW.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "150–500 €",
            label: "IPT provincial"
          }],
          exemptions: ["100% électrique (IPT souvent gratuit)", "Bollo : 5 ans gratuit pour EV"],
          specific_penalty: "Pas de malus CO₂",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Réf. juridique : Pas de malus CO₂ depuis l'abrogation de l'ecotassa (L. 145/2018) le 31/12/2021. IPT régie par DPR 641/1972. Bollo régional. Superbollo : +20 €/kW au-delà de 185 kW. Ecobonus jusqu'à 11 000 € pour EV.",
          source: "Agenzia delle Entrate / ACI",
          source_url: "https://www.agenziaentrate.gov.it/portale/imposta-provinciale-trascrizione-ipt",
          legal_ref: "DPR 641/1972 (IPT) · D.L. 98/2011 art.23 (superbollo) · Legge 145/2018 (ecotassa abrogée 31/12/2021)",
          reliability: "official"
        };
      }
    case "PT":
      {
        const co2Brut = computePT(g);
        // Composante cylindrée Portugal (Tabela A simplifié 2025)
        let cylBrut = 0;
        if (displacement <= 1000) cylBrut = displacement * 1.09 - 849.04;else if (displacement <= 1250) cylBrut = displacement * 1.18 - 850.69;else cylBrut = displacement * 5.61 - 6194.88;
        cylBrut = Math.max(0, Math.round(cylBrut));
        // Diesel : surtaxe
        const isDieselPT = fuelKind === "diesel";
        if (isDieselPT) cylBrut = Math.round(cylBrut * 1.2);
        const totalBrut = co2Brut + cylBrut;
        const decotePT = isImported ? getImportDecotePT(dateImmat) : 0;
        const a = Math.round(totalBrut * (1 - decotePT / 100));
        return {
          tax_name: "ISV (Imposto Sobre Veículos)",
          threshold_gkm: 100,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `Lei 22-A/2007 (Código ISV) - ISV = composante cylindrée (${displacement}cm³ ${isDieselPT ? 'diesel' : 'essence'}) + composante ambiental (CO₂ WLTP).`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 99,
            penalty: "0 €",
            label: "Exempté CO₂"
          }, {
            min_gkm: 100,
            max_gkm: 115,
            penalty: "4,62 €/g - 427",
            label: "Palier 1"
          }, {
            min_gkm: 116,
            max_gkm: 145,
            penalty: "8,09 €/g - 751",
            label: "Palier 2"
          }, {
            min_gkm: 146,
            max_gkm: 175,
            penalty: "53,48 €/g - 7 309",
            label: "Palier 3"
          }, {
            min_gkm: 176,
            max_gkm: 195,
            penalty: "137,27 €/g - 22 380",
            label: "Palier 4"
          }, {
            min_gkm: 196,
            max_gkm: 999,
            penalty: "196,95 €/g - 34 387",
            label: "Palier 5"
          }],
          exemptions: ["100% électrique (isento)", "PHEV éligibles : -75% ISV", "Famille nombreuse : -50%"],
          specific_penalty: isImported && a > 0 ? `~${a.toLocaleString("pt-PT")} € (après décote ${decotePT}%)` : a === 0 ? "0 €" : `~${a.toLocaleString("pt-PT")} €`,
          specific_penalty_amount: a,
          has_malus: a > 0,
          severity: sev(a),
          notes: `Cylindrée ${cylBrut} € + CO₂ ${co2Brut} €${isImported ? ` - décote ${decotePT}%` : ''} = ${a.toLocaleString()} €.`,
          source: "Autoridade Tributária e Aduaneira (AT)",
          source_url: "https://aduaneiro.portaldasfinancas.gov.pt/isv",
          legal_ref: "Lei 22-A/2007 (Código ISV) · LOE 2025 (Lei n.º 24-D/2024) · Tabelas C (CO₂ WLTP) et D (décote)",
          reliability: "official",
          advanced_params: ["displacement", "fuelKind"]
        };
      }
    case "NO":
      {
        const aCO2 = computeNO(g);
        const aPoids = computeNOPoids(kg, fuelType);
        const total = aCO2 + aPoids;
        const fuelLabel = fuelType === "ev" ? "EV : exempté CO₂, poids appliqué" : "Tous véhicules";
        return {
          tax_name: "Engangsavgift (CO₂ + Poids)",
          threshold_gkm: 88,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `Engangsavgift = taxe unique CO₂ + Poids (12,5 NOK/kg dès 501 kg). ${fuelLabel}. NOx aboli en 2026. VAT EV : exemption réduite à 300 000 NOK (2026), supprimée totalement en 2027.`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 87,
            penalty: "0 NOK",
            label: "Exempté CO₂"
          }, {
            min_gkm: 88,
            max_gkm: 118,
            penalty: "815 NOK/g",
            label: "Palier 1"
          }, {
            min_gkm: 119,
            max_gkm: 155,
            penalty: "894 NOK/g",
            label: "Palier 2"
          }, {
            min_gkm: 156,
            max_gkm: 181,
            penalty: "2 608 NOK/g",
            label: "Palier 3"
          }, {
            min_gkm: 182,
            max_gkm: 999,
            penalty: "4 168 NOK/g",
            label: "Palier 4"
          }],
          weight_brackets: [{
            min_kg: 0,
            max_kg: 500,
            penalty: "0 NOK/kg",
            label: "Exempté"
          }, {
            min_kg: 501,
            max_kg: 9999,
            penalty: "12,5 NOK/kg",
            label: "Taxe poids universelle"
          }],
          weight_threshold: 501,
          malus_co2: aCO2,
          malus_poids: aPoids,
          exemptions: ["EV : exonéré CO₂ uniquement (poids s'applique depuis 2023)", "Hydrogène"],
          specific_penalty: total === 0 ? "0 €" : `~${total.toLocaleString()} € total`,
          specific_penalty_amount: total,
          has_malus: total > 0,
          severity: aCO2 === 0 && aPoids === 0 ? "none" : total < 500 ? "low" : total < 3000 ? "medium" : total < 15000 ? "high" : "very_high",
          notes: `CO₂ ~${aCO2} € + Poids ~${aPoids} €. Conversion NOK→EUR @0,087. EV : seul le poids s'applique.`,
          source: "Skatteetaten (Administration fiscale norvégienne)",
          source_url: "https://www.skatteetaten.no/bedrift-og-organisasjon/avgifter/saravgifter/om/engangsavgift/",
          legal_ref: "Stortingsvedtak om engangsavgift 2025 §2 (CO₂) · §4 (poids) · Prop. 1 LS (2024-2025)",
          reliability: "official"
        };
      }
    case "BE":
      {
        // Calcul par région
        let a, label, notes;
        if (beRegion === "wallonie") {
          // Nouvelle formule Wallonie post-juillet 2025
          if (g <= 60) a = 250;else if (g <= 105) a = 400;else if (g <= 125) a = 700;else if (g <= 155) a = 1200;else if (g <= 195) a = 2000;else a = 3000;
          label = "Wallonie";
          notes = "Wallonie (juillet 2025) : éco-malus supprimé, nouvelle formule kW+CO₂+masse+âge.";
        } else if (beRegion === "flandre") {
          // BIV Flandre Vlabel — formule officielle
          // BIV = ((CO2×4,5 + 50)/250) × 4500 × LC + 33,51
          // LC = coefficient luchtkwaliteit (qualité air) selon Euronorme :
          //   Euro 6d (immat ≥ 01/09/2018) : 0,84852 ; Euro 5/6 : 1,0
          // Réduction hybride significative pratiquée par Vlabel :
          //   PHEV ≈ -85 %, HEV ≈ -55 %, mHEV ≈ -65 % (estimation tarifaire réelle)
          if (fuelType === "ev") {
            a = 0; // Exonération totale BIV pour EV en Flandre
          } else {
            const dImmat = new Date(dateImmat);
            const lcCoeff = dImmat >= new Date("2018-09-01") ? 0.84852 : 1.0;
            let biv = Math.max(43.06, (g * 4.5 + 50) / 250 * 4500 * lcCoeff + 33.51);
            // Réductions hybrides (estimation tarif effectif Vlabel)
            if (fuelType === "phev") biv *= 0.15;
            else if (fuelType === "hybride") biv *= 0.45;
            // Plafond légal BIV 2025 ≈ 12 481 € (à pondérer par LC)
            biv = Math.min(biv, 12481);
            a = Math.round(biv);
          }
          label = "Flandre (BIV)";
          notes = `Flandre BIV (Vlabel) : (CO₂×4,5+50)/250 × 4500 × LC + 33,51. LC≈0,849 (Euro 6d depuis 09/2018), 1,0 sinon. EV exonéré.`;
        } else {
          // Bruxelles : basé sur puissance fiscale, estimation
          if (g <= 100) a = 61;else if (g <= 125) a = 123;else if (g <= 155) a = 495;else if (g <= 200) a = 867;else a = 2478;
          label = "Bruxelles-Capitale";
          notes = "Bruxelles : taxe basée sur puissance fiscale (CV), pas directement CO₂.";
        }
        // Décote import Belgique (dégressivité légale)
        const decoteBE = isImported ? getImportDecoteBE(dateImmat) : 0;
        if (decoteBE > 0) {
          a = Math.max(50, Math.round(a * (1 - decoteBE / 100))); // minimum légal 50€
        }
        return {
          tax_name: `TMC/BIV — ${label}`,
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `Système RÉGIONAL : 3 systèmes différents en Belgique. Région choisie : ${label}.${isImported ? ` Importé : décote ${decoteBE}% (min. 50 €).` : ''}`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 60,
            penalty: "~250 €",
            label: "Très faible"
          }, {
            min_gkm: 61,
            max_gkm: 125,
            penalty: "400–700 €",
            label: "Faible/modéré"
          }, {
            min_gkm: 126,
            max_gkm: 195,
            penalty: "1 200–2 000 €",
            label: "Élevé"
          }, {
            min_gkm: 196,
            max_gkm: 999,
            penalty: "~3 000 €+",
            label: "Très élevé"
          }],
          exemptions: ["EV (Bruxelles/Wallonie) : exempté", "EV (Flandre) : exempté SEULEMENT si immat. avant 01/01/2026 (Programmadecreet BO 2026)", "Famille nombreuse Wallonie : -250 €"],
          specific_penalty: `~${a} € (${label})`,
          specific_penalty_amount: a,
          has_malus: a > 100,
          severity: sev(a),
          notes: notes,
          source: "SPW Finances / Vlabel / Bruxelles Fiscalités",
          source_url: "https://finances.wallonie.be",
          legal_ref: "Wallonie : Décret 21/12/2023 (SPW Finances) · Flandre : BIV Vlabel (Decreet 23/12/2021) · Bruxelles : Ordonnance 21/12/2018",
          reliability: "indicative",
          advanced_params: ["beRegion"]
        };
      }
    case "AT":
      {
        const penalty = computeAT(g);
        // NoVA % calc — formule 2025+ : (CO2 - 96) / 4,4, plafond 80%
        const novaPct = Math.min(80, Math.max(0, Math.round((g - 91) / 5)));
        const novaAmount = Math.max(0, Math.round(vehiclePrice * novaPct / 100) - 350);
        const total = novaAmount + penalty;
        return {
          tax_name: "NoVA (Normverbrauchsabgabe)",
          threshold_gkm: 96,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `NoVA 2026 = (CO₂−91)÷5 % du prix HT, plafond 80%. + 80 €/g au-delà de 155 g. Seuil : 91 g/km. + Pénalité CO₂ fixe au-dessus 155 g. Prix : ${vehiclePrice.toLocaleString()} €.`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 95,
            penalty: "0%",
            label: "Exempté"
          }, {
            min_gkm: 96,
            max_gkm: 155,
            penalty: "(g-96)/4,4 %",
            label: "NoVA progressive"
          }, {
            min_gkm: 156,
            max_gkm: 175,
            penalty: "+80 €/g",
            label: "Pénalité 1"
          }, {
            min_gkm: 176,
            max_gkm: 999,
            penalty: "+100 €/g",
            label: "Pénalité 2"
          }],
          exemptions: ["100% électrique", "Famille nombreuse (-20%)"],
          specific_penalty: total === 0 ? "0 €" : `~${total.toLocaleString()} € (NoVA ${novaPct.toFixed(1)}% + pénalité ${penalty} €)`,
          specific_penalty_amount: total,
          has_malus: total > 0,
          severity: sev(total),
          notes: `NoVA : ${novaPct.toFixed(1)}% × ${vehiclePrice.toLocaleString()} € = ${novaAmount.toLocaleString()} € + Pénalité ${penalty} €.`,
          source: "Bundesministerium für Finanzen (BMF)",
          source_url: "https://www.bmf.gv.at/themen/steuern/kraftfahrzeuge/nova.html",
          legal_ref: "Normverbrauchsabgabegesetz 1991 (BGBl. I Nr. 695/1991) · BGBl. I Nr. 62/2022 (réforme WLTP 2021)",
          reliability: "official",
          advanced_params: ["vehiclePrice"]
        };
      }
    case "FI":
      {
        const pct = computeFIPercent(g);
        const est = Math.round(vehiclePrice * pct / 100);
        return {
          tax_name: "Autovero (% sur prix)",
          threshold_gkm: 1,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: `Autoverolaki (1482/1994) - Taxe d'immatriculation = % de la valeur du véhicule selon CO₂. Prix : ${vehiclePrice.toLocaleString()} €.`,
          brackets: [{
            min_gkm: 0,
            max_gkm: 0,
            penalty: "0%",
            label: "EV exempté"
          }, {
            min_gkm: 1,
            max_gkm: 50,
            penalty: "2,7%",
            label: "Très faible"
          }, {
            min_gkm: 51,
            max_gkm: 100,
            penalty: "2,7–11,7%",
            label: "Faible"
          }, {
            min_gkm: 101,
            max_gkm: 150,
            penalty: "11,7–24,2%",
            label: "Modéré"
          }, {
            min_gkm: 151,
            max_gkm: 200,
            penalty: "24,2–34,2%",
            label: "Élevé"
          }, {
            min_gkm: 201,
            max_gkm: 999,
            penalty: "50% (max)",
            label: "Maximum"
          }],
          exemptions: ["100% électrique (0%)", "Véhicules adaptés handicap"],
          specific_penalty: pct === 0 ? "0% (exempté)" : `${pct}% (~${est.toLocaleString()} €)`,
          specific_penalty_amount: est,
          has_malus: pct > 0,
          severity: sev(est),
          notes: `Montant = ${pct}% × ${vehiclePrice.toLocaleString()} € (prix HT).`,
          source: "Vero (Finnish Tax Administration)",
          source_url: "https://www.vero.fi/yritykset-ja-yhteisot/tietoa-yritysverotuksesta/autoverotus/",
          legal_ref: "Autoverolaki 1482/1994 (Finlex) · Autoveroasetus 1134/2002 · Laki autoverolain muuttamisesta 2024",
          reliability: "official",
          advanced_params: ["vehiclePrice"]
        };
      }
    case "DK":
      {
        const a = computeDK(g);
        return {
          tax_name: "Registreringsafgift",
          threshold_gkm: 1,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: "Registreringsafgift = la + élevée d'Europe. Valeur véhicule : 25% (≤71 955 DKK) + 85% (71-223 kDKK) + 150% (>223 kDKK). + Tillæg CO₂ : 280 kr/g (2025) ou 294 kr/g (2026). Déduction 33 600 DKK (2025) / 35 200 DKK (2026).",
          brackets: [{
            min_gkm: 0,
            max_gkm: 0,
            penalty: "Très réduit (EV)",
            label: "EV phase-in"
          }, {
            min_gkm: 1,
            max_gkm: 117,
            penalty: "280 kr/g (2025)",
            label: "Palier 1"
          }, {
            min_gkm: 118,
            max_gkm: 150,
            penalty: "560 kr/g (2025)",
            label: "Palier 2"
          }, {
            min_gkm: 151,
            max_gkm: 999,
            penalty: "950 kr/g",
            label: "Palier 3"
          }],
          exemptions: ["EV (réduction progressive jusqu'en 2030)", "Véhicules handicapés"],
          specific_penalty: `~${a.toLocaleString()} € (CO₂ seul)`,
          specific_penalty_amount: a,
          has_malus: a > 0,
          severity: sev(a),
          notes: "Tarifs 2025: tillæg CO₂ 280 kr/g, bundfradrag 33 600 DKK. Tarifs 2026: 294 kr/g, 35 200 DKK. EV: bundfradrag 165 500 DKK + fradrag grøn 45 000 DKK. Réf: Lov om registreringsafgift §3.",
          source: "Motorstyrelsen / Skat.dk",
          source_url: "https://motorst.dk/registreringsafgift/",
          legal_ref: "Lovbekendtgørelse nr. 177 af 22/02/2024 (registreringsafgiftsloven) §3 + §5a (tillæg CO₂)",
          reliability: "indicative"
        };
      }
    case "SE":
      {
        const a = computeSE(g);
        return {
          tax_name: "Förhöjd fordonsskatt (annuel 3 ans)",
          threshold_gkm: 76,
          max_penalty_eur: null,
          currency_symbol: "€",
          system_description: "Vägtrafikskattelag (2006:227) - Bonus écolo supprimé 8/11/2022 (klimatbonus). Reste : malus = taxe annuelle MAJORÉE les 3 premières années pour véhicules >75 g/km. Depuis 01/02/2025 : camping-cars exclus du malus, mais E85 désormais soumis au malus.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 75,
            penalty: "Base 360 SEK",
            label: "Exempté majoration"
          }, {
            min_gkm: 76,
            max_gkm: 125,
            penalty: "+107 SEK/g",
            label: "Palier 1"
          }, {
            min_gkm: 126,
            max_gkm: 999,
            penalty: "+132 SEK/g",
            label: "Palier 2"
          }],
          exemptions: ["EV/Hydrogène : forfait réduit 360 SEK/an"],
          specific_penalty: a === 0 ? "Base 360 SEK/an" : `~${a} €/an (3 ans)`,
          specific_penalty_amount: a * 3,
          has_malus: g > 75,
          severity: sev(a * 3),
          notes: "Annuelle pendant 3 ans, puis taxe normale. Pas de malus immat depuis 2022.",
          source: "Transportstyrelsen",
          source_url: "https://www.transportstyrelsen.se/sv/vagtrafik/Fordon/Fordonsavgifter/Fordonsskatt/",
          legal_ref: "Vägtrafikskattelag (2006:227) §4 · Prop. 2021/22:61 (bonus-malus) · SFS 2022:1128",
          reliability: "indicative"
        };
      }
    case "CH":
      {
        return {
          tax_name: "Variable selon canton (26)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "CHF",
          system_description: "Système à 3 niveaux : (1) Sanction CO₂ fédérale à l'import si > cible WLTP (93,6 g/km en 2025), CHF 95-152/g excès. (2) Automobilsteuer 4% prix + TVA 8,1%. (3) Taxe cantonale annuelle (poids/kW/CO₂ selon 26 cantons).",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "Variable",
            label: "Selon canton"
          }],
          exemptions: ["EV : rabais ou exonération selon canton (Genève, Vaud, Zurich généreux)"],
          specific_penalty: "Variable selon canton",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Loi CO₂ révisée (1er janv. 2025) - Cible 93,6 g/km WLTP. Petits importateurs paient avant immatriculation. Voitures >12 mois à l'étranger exemptées de la sanction CO₂. Source: BFE/ASTRA. Taxe circulation annuelle cantonale variable.",
          source: "OFROU / OFEN / AFC (Admin fédérale CH)",
          source_url: "https://www.bafu.admin.ch/bafu/fr/home/themes/air/droit/reduire-les-emissions-de-co2/voitures-de-tourisme.html",
          legal_ref: "Loi CO₂ révisée (RS 641.71) en vigueur 01/01/2025 · Ordonnance CO₂ (RS 641.711) · Automobilsteuer 4% (LIMPV RS 641.51)",
          reliability: "info"
        };
      }
    case "PL":
      {
        return {
          tax_name: "Akcyza (% sur cylindrée, pas CO₂)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "PLN",
          system_description: "Pas de taxe CO₂ directe. Akcyza basée sur cylindrée : 3,1% si <2L, 18,6% si ≥2L.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "3,1% ou 18,6%",
            label: "Selon cylindrée"
          }],
          exemptions: ["EV : exonération akcyza", "PHEV éligibles (cylindrée ≤2L et autonomie ≥40km)"],
          specific_penalty: "Pas de malus CO₂ direct",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Réforme vers taxation CO₂ discutée depuis 2021 mais pas adoptée.",
          source: "Ministerstwo Finansów (Ministère des Finances PL)",
          source_url: "https://www.podatki.gov.pl/akcyza/wyroby-akcyzowe/samochody-osobowe/",
          legal_ref: "Ustawa o podatku akcyzowym z 6/12/2008 art. 100 (Dz.U. 2009 nr 3 poz. 11) · cylindrée ≤2L: 3,1% / >2L: 18,6%",
          reliability: "info"
        };
      }
    case "ZA":
      {
        const a = computeZA(g);
        return {
          tax_name: "CO₂ Emissions Tax",
          threshold_gkm: 95,
          max_penalty_eur: null,
          currency_symbol: "R",
          system_description: "Taxe CO₂ à l'achat : R132/g au-dessus de 95 g/km (véhicules passagers). Doublée à R176 pour double cab.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 95,
            penalty: "0 R",
            label: "Exempté"
          }, {
            min_gkm: 96,
            max_gkm: 999,
            penalty: "132 R/g",
            label: "Taxe CO₂"
          }],
          exemptions: ["EV : exonéré CO₂ (mais 25% import duty)"],
          specific_penalty: a === 0 ? "0 R" : `~${a} € (~R${Math.round(a / 0.049)})`,
          specific_penalty_amount: a,
          has_malus: a > 0,
          severity: sev(a),
          notes: "Conversion ZAR→EUR @0,049. Une des rares taxes CO₂ d'Afrique.",
          source: "SARS (South African Revenue Service)",
          source_url: "https://www.sars.gov.za/types-of-tax/excise/environmental-levy/co2-emissions-tax/",
          legal_ref: "Customs & Excise Act 91/1964 Schedule 1 Part 3B · Budget 2025 (R132/g au-dessus 95 g/km)",
          reliability: "official"
        };
      }
    case "SG":
      {
        const a = computeSG(g);
        return {
          tax_name: "VES (Vehicle Emissions Scheme)",
          threshold_gkm: 126,
          max_penalty_eur: null,
          currency_symbol: "S$",
          system_description: "Bonus/Malus basé sur 5 polluants (CO₂, HC, CO, NOx, PM). Bandes A1/A2 = rabais, B = neutre, C1/C2 = surcharge.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 125,
            penalty: "Rebate ou neutre",
            label: "Bande A/B"
          }, {
            min_gkm: 126,
            max_gkm: 160,
            penalty: "+S$15 000",
            label: "Bande C1"
          }, {
            min_gkm: 161,
            max_gkm: 185,
            penalty: "+S$25 000",
            label: "Bande C2"
          }, {
            min_gkm: 186,
            max_gkm: 999,
            penalty: "+S$40 000",
            label: "Bande C3"
          }],
          exemptions: ["EV : rebate jusqu'à S$45 000 (EEAI + VES)"],
          specific_penalty: a === 0 ? "Rebate ou neutre" : `+S$${Math.round(a / 0.69).toLocaleString()} (~${a} €)`,
          specific_penalty_amount: a,
          has_malus: a > 0,
          severity: sev(a),
          notes: "S'ajoute à ARF (Additional Registration Fee) + COE (Certificate of Entitlement, peut dépasser S$100k).",
          source: "LTA Singapore (Land Transport Authority)",
          source_url: "https://www.lta.gov.sg/content/ltagov/en/getting_around/owning_a_vehicle/buying_a_vehicle/vehicle_emission_scheme.html",
          legal_ref: "Road Traffic Act (Cap 276) · LTA VES Notice 2018 (revised 2024) · Carbon Emissions-Based Vehicle Scheme",
          reliability: "official"
        };
      }
    case "US":
      {
        return {
          tax_name: "Gas Guzzler Tax (fédérale)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "$",
          system_description: "Pas de malus CO₂. Gas Guzzler Tax fédérale basée sur MPG (consommation). Voitures <22,5 MPG = 1 000–7 700 $. SUV/Pickups EXEMPTS.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "0–7 700 $",
            label: "Selon MPG"
          }],
          exemptions: ["SUV, pickups, mini-vans (exemptés)", "EV : pas de taxe + crédit fédéral $7 500"],
          specific_penalty: "Selon MPG (pas CO₂ direct)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Système gravement obsolète : 95% du marché US (SUV/trucks) y échappe. Pas de réforme CO₂ fédérale en vue.",
          source: "EPA / IRS (Internal Revenue Service)",
          source_url: "https://www.epa.gov/fueleconomy/gas-guzzler-tax",
          legal_ref: "Internal Revenue Code §4064 (Energy Tax Act 1978) · IRS Form 6197 · Exemption: SUV, pickups, minivans",
          reliability: "info"
        };
      }
    case "CA":
      {
        return {
          tax_name: "Green Levy (fédéral)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "$CAD",
          system_description: "Excise tax fédérale sur véhicules fuel-inefficient (>13L/100km). 1 000–4 000 $. Pas de système CO₂ direct.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "0–4 000 $",
            label: "Selon L/100km"
          }],
          exemptions: ["EV", "PHEV (incentives fédéraux jusqu'à 5 000 $)"],
          specific_penalty: "Selon consommation (pas CO₂ direct)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Québec a son propre système (Roulez vert). Pas de malus CO₂ direct au Canada fédéral.",
          source: "Canada Revenue Agency (CRA)",
          source_url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/benefits-allowances/automobile/green-levy.html",
          legal_ref: "Excise Tax Act Part III.1 · Budget Implementation Act 2007 · Sched. I (>13L/100km)",
          reliability: "info"
        };
      }
    case "JP":
      {
        return {
          tax_name: "Eco-friendly Tax (réduction)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "¥",
          system_description: "Pas de malus CO₂ direct. Système de RÉDUCTIONS pour véhicules eco-friendly (jusqu'à 100% sur certaines taxes).",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "Pas de malus",
            label: "Système de bonus"
          }],
          exemptions: ["EV/PHEV : exonération jusqu'à 100% sur 3 taxes"],
          specific_penalty: "Pas de malus CO₂",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Acquisition tax + Automobile tax + Tonnage tax basés sur poids+cylindrée. Bonus pour efficacité.",
          source: "MLIT / NTA",
          source_url: "https://www.nta.go.jp",
          reliability: "info"
        };
      }
    case "CN":
      {
        return {
          tax_name: "Vehicle Purchase Tax (10%)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "¥",
          system_description: "Pas de malus CO₂ direct. Vehicle Purchase Tax = 10% du prix HT pour tous véhicules thermiques.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "10% prix",
            label: "Taxe achat"
          }],
          exemptions: ["NEV (New Energy Vehicles) : exonération 10% PT jusqu'en 2025, puis 5% en 2026-2027"],
          specific_penalty: "10% prix (pas CO₂)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Système orienté sur les NEV (électriques) plus que sur le CO₂ des thermiques.",
          source: "STA China",
          source_url: "https://www.chinatax.gov.cn",
          reliability: "info"
        };
      }
    case "AU":
      {
        return {
          tax_name: "LCT (Luxury Car Tax)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "A$",
          system_description: "Pas de malus CO₂. LCT 33% au-delà de A$80 567 (A$91 387 pour fuel-efficient <7L/100km).",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "33% au-dessus seuil",
            label: "LCT"
          }],
          exemptions: ["Véhicules <A$80 567 (ou A$91 387 efficient)", "EV (depuis 2022)"],
          specific_penalty: "Selon prix (pas CO₂)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "L'Australie n'a pas de malus CO₂ national. La LCT vise les véhicules de luxe.",
          source: "ATO",
          source_url: "https://www.ato.gov.au",
          reliability: "info"
        };
      }
    case "BR":
      {
        return {
          tax_name: "IPI (selon cylindrée+carburant)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "R$",
          system_description: "Pas de malus CO₂. IPI (Imposto sobre Produtos Industrializados) : 7–25% selon cylindrée et type carburant.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "7–25%",
            label: "IPI"
          }],
          exemptions: ["Flex-fuel (bénéficie de taux réduit)", "EV/Hybrides : IPI réduit"],
          specific_penalty: "Selon cylindrée (pas CO₂)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Réforme fiscale 2026 introduit une 'Selective Tax' qui pourrait inclure le CO₂.",
          source: "Receita Federal",
          source_url: "https://www.gov.br/receitafederal",
          reliability: "info"
        };
      }
    case "IN":
      {
        return {
          tax_name: "GST + Cess (selon catégorie)",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "₹",
          system_description: "Pas de malus CO₂. GST 28% + compensation cess de 1–22% selon catégorie (taille moteur, longueur).",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "28% + 0–22% cess",
            label: "GST"
          }],
          exemptions: ["EV : GST réduit à 5%", "Hybrides : taux variable"],
          specific_penalty: "Selon catégorie (pas CO₂)",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Système basé sur la taille du véhicule, pas les émissions. EV bénéficient lourdement.",
          source: "CBIC / GST Council of India",
          source_url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
          legal_ref: "CGST Act 2017 + GST Compensation Cess Act 2017 · Schedule IV (cess 1–22% automobiles)",
          reliability: "info"
        };
      }
    case "KR":
      {
        return {
          tax_name: "Acquisition Tax 7% + others",
          threshold_gkm: null,
          max_penalty_eur: null,
          currency_symbol: "₩",
          system_description: "Pas de malus CO₂ direct. Acquisition tax 7%, individual consumption tax 5%, education tax 30% de l'ICT.",
          brackets: [{
            min_gkm: 0,
            max_gkm: 999,
            penalty: "~12% total",
            label: "Taxes immat"
          }],
          exemptions: ["EV : exonérations partielles (acquisition tax réduite à 4%)", "Hybrides : réductions"],
          specific_penalty: "Pas de malus CO₂",
          specific_penalty_amount: 0,
          has_malus: false,
          severity: "none",
          notes: "Subventions importantes pour EV (jusqu'à 12M KRW). Pas de malus CO₂ direct.",
          source: "NTS Korea",
          source_url: "https://www.nts.go.kr",
          reliability: "info"
        };
      }
    case "IE":
      { const b=[{max:50,r:7},{max:80,r:9},{max:110,r:12.5},{max:130,r:17},{max:155,r:23},{max:190,r:30},{max:230,r:36},{max:999,r:41}];
        const bd=b.find(function(x){return g<=x.max;})||b[b.length-1];
        const vBrut=Math.round(vehiclePrice*bd.r/100);
        const decoteIE = isImported ? getImportDecoteIE(dateImmat) : 0;
        const v = Math.round(vBrut * (1 - decoteIE / 100));
        const evNote = new Date(dateImmat) >= new Date("2026-01-01") ? "EV : 7% OMSP (relief supprimé au 01/01/2026 — Budget IE 2026)" : "EV : 0% + crédit ≤€5 000 OMSP (immat. avant 01/01/2026)";
        return {tax_name:"VRT (Vehicle Registration Tax)",threshold_gkm:51,max_penalty_eur:null,currency_symbol:"€",system_description:`Finance Act 1992 Part II + Budget IE 2026. VRT = % OMSP irlandais, 20 bandes CO₂ WLTP (7–41%). Relief EV ≤€50k OMSP supprimé au 01/01/2026.${isImported ? ` Importé : décote ${decoteIE}% (Revenue.ie OMSP table).` : ""}`,brackets:[{min_gkm:0,max_gkm:50,penalty:"7%",label:"EV / très faible"},{min_gkm:51,max_gkm:155,penalty:"7–23%",label:"A–F"},{min_gkm:156,max_gkm:230,penalty:"30–36%",label:"G–I"},{min_gkm:231,max_gkm:999,penalty:"41%",label:"J max"}],exemptions:[evNote],specific_penalty:v===0?"0 €":"~"+v.toLocaleString("fr-FR")+" €"+(isImported?" (−"+decoteIE+"%)":""),specific_penalty_amount:v,has_malus:true,severity:sev(v),notes:`${bd.r}% × ${vehiclePrice.toLocaleString()} €${isImported ? ` − ${decoteIE}% (importé)` : ""} = ${v.toLocaleString()} €. NOx levy en supplément selon émissions.`,source:"Revenue.ie",source_url:"https://www.revenue.ie/en/vrt/calculating-vrt/applying-tax.aspx",legal_ref:"Finance Act 1992 Part II Section 131 · Revenue VRT Manual Chapter 3 · Finance Act 2025 (Budget IE 2026)",reliability:"official"}; }
    case "LU":
      { const t=g<=90?0:g<=130?Math.round((g-90)*8):g<=175?Math.round(40*8+(g-130)*15):Math.round(40*8+45*15+(g-175)*25);
        return {tax_name:"Taxe d’immatriculation CO₂ (Luxembourg)",threshold_gkm:91,max_penalty_eur:null,currency_symbol:"€",system_description:"Loi 22/12/2006 + RGD 23/12/2016 - Progressive selon CO₂ WLTP. 8 €/g (91–130g), 15 €/g (131–175g), 25 €/g au-delà.",brackets:[{min_gkm:0,max_gkm:90,penalty:"0 €",label:"Exempté"},{min_gkm:91,max_gkm:130,penalty:"8 €/g",label:"Basse"},{min_gkm:131,max_gkm:175,penalty:"15 €/g",label:"Haute"},{min_gkm:176,max_gkm:999,penalty:"25 €/g",label:"Max"}],exemptions:["EV : exempté + bonus €5 000"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" €",specific_penalty_amount:t,has_malus:g>90,severity:sev(t),notes:"Parmi les plus favorables aux EV d’Europe.",source:"Gouvernement du Luxembourg (Administration de l'enregistrement)",source_url:"https://guichet.public.lu/fr/citoyens/transport/vehicules/immatriculation/taxe-immatriculation.html",legal_ref:"Loi du 22/12/2006 (Mémorial A-N° 227) · RGD du 23/12/2016 · CO₂ WLTP depuis 01/01/2020",reliability:"official"}; }
    case "SI":
      { const t=g<=110?0:g<=150?Math.round((g-110)*25):g<=200?Math.round(40*25+(g-150)*55):Math.round(40*25+50*55+(g-200)*120);
        return {tax_name:"Davek na motorna vozila (DMV)",threshold_gkm:111,max_penalty_eur:null,currency_symbol:"€",system_description:"Taxe slovène progressive. Seuil 110 g/km.",brackets:[{min_gkm:0,max_gkm:110,penalty:"0 €",label:"Exempté"},{min_gkm:111,max_gkm:150,penalty:"25 €/g",label:"Basse"},{min_gkm:151,max_gkm:200,penalty:"55 €/g",label:"Haute"},{min_gkm:201,max_gkm:999,penalty:"120 €/g",label:"Max"}],exemptions:["EV : 0%"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" €",specific_penalty_amount:t,has_malus:g>110,severity:sev(t),notes:"Estimation 2024.",source:"FURS (Finančna uprava RS)",source_url:"https://www.fu.gov.si/davki_in_druge_dajatve/podrocja_dela/trosarine_in_okoljske_dajatve/davek_na_motorna_vozila/",legal_ref:"ZDMV – Zakon o davku na motorna vozila (Ur.l. RS 52/1999) · Uredba vlade RS 2024",reliability:"official"}; }
    case "GR":
      { const t=g<=100?0:g<=120?Math.round((g-100)*90):g<=140?Math.round(20*90+(g-120)*120):g<=160?Math.round(20*90+20*120+(g-140)*200):Math.round(20*90+20*120+20*200+(g-160)*400);
        return {tax_name:"Taxe d’immatriculation CO₂ (Grèce)",threshold_gkm:101,max_penalty_eur:null,currency_symbol:"€",system_description:"Progressive. Seuil 100 g/km. 90→400 €/g.",brackets:[{min_gkm:0,max_gkm:100,penalty:"0 €",label:"Exempté"},{min_gkm:101,max_gkm:120,penalty:"90 €/g",label:"Basse"},{min_gkm:121,max_gkm:140,penalty:"120 €/g",label:"Modérée"},{min_gkm:141,max_gkm:160,penalty:"200 €/g",label:"Haute"},{min_gkm:161,max_gkm:999,penalty:"400 €/g",label:"Max"}],exemptions:["EV : exempté + bonus €6 000"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" €",specific_penalty_amount:t,has_malus:g>100,severity:sev(t),notes:"Barème 2024.",source:"AADE (Ανεξάρτητη Αρχή Δημοσίων Εσόδων)",source_url:"https://www.aade.gr/menoy/phorologikos-odigos/foros-polvteloias-kai-loipa-teli-kai-eisphores/teli-taxtinomisis-aytokiniton",legal_ref:"Ν. 2960/2001 Τελωνειακός Κώδικας – Άρθρο 121 · Παράρτημα IV (CO₂ WLTP)",reliability:"official"}; }
    case "EE":
      { const t=g<=0?0:g<=117?Math.round(g*2):Math.round(117*2+(g-117)*15);
        return {tax_name:"Sõidukimaks (taxe annuelle CO₂)",threshold_gkm:1,max_penalty_eur:null,currency_symbol:"€",system_description:"Taxe annuelle depuis juillet 2024.",brackets:[{min_gkm:0,max_gkm:0,penalty:"0 €",label:"EV"},{min_gkm:1,max_gkm:117,penalty:"2 €/g/an",label:"Basse"},{min_gkm:118,max_gkm:999,penalty:"15 €/g",label:"Haute"}],exemptions:["EV : ~50 €/an fixe"],specific_penalty:"~"+t.toLocaleString("fr-FR")+" €/an",specific_penalty_amount:t,has_malus:true,severity:sev(t),notes:"Depuis le 1er juillet 2024. Annuelle.",source:"Maanteeamet (Transport Administration)",source_url:"https://www.mnt.ee/et/liiklus/mootorsoidukimaks",legal_ref:"Mootorsõidukimaksu seadus (RT I 2024, 5) – en vigueur 01/07/2024",reliability:"official"}; }
    case "MT":
      { const t=g<=100?0:g<=130?Math.round((g-100)*30):g<=160?Math.round(30*30+(g-130)*60):Math.round(30*30+30*60+(g-160)*100);
        return {tax_name:"Registration Tax (Malte)",threshold_gkm:101,max_penalty_eur:null,currency_symbol:"€",system_description:"Progressive sur CO₂. Seuil 100 g/km.",brackets:[{min_gkm:0,max_gkm:100,penalty:"0 €",label:"Exempté"},{min_gkm:101,max_gkm:130,penalty:"30 €/g",label:"Basse"},{min_gkm:131,max_gkm:160,penalty:"60 €/g",label:"Haute"},{min_gkm:161,max_gkm:999,penalty:"100 €/g",label:"Max"}],exemptions:["EV : exempté + grant €11 000"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" €",specific_penalty_amount:t,has_malus:g>100,severity:sev(t),notes:"Estimation 2024.",source:"Transport Malta",source_url:"https://www.transport.gov.mt/land/vehicle-registration-1780",legal_ref:"Motor Vehicles (Registration and Licensing) Act (Cap. 368) · LN 346 of 2009 (CO₂ Schedule)",reliability:"official"}; }
    case "CY":
      { const t=g<=120?0:g<=150?Math.round((g-120)*40):g<=180?Math.round(30*40+(g-150)*80):Math.round(30*40+30*80+(g-180)*150);
        return {tax_name:"Taxe d’immatriculation CO₂ (Chypre)",threshold_gkm:121,max_penalty_eur:null,currency_symbol:"€",system_description:"Progressive selon CO₂. Seuil 120 g/km.",brackets:[{min_gkm:0,max_gkm:120,penalty:"0 €",label:"Exempté"},{min_gkm:121,max_gkm:150,penalty:"40 €/g",label:"Basse"},{min_gkm:151,max_gkm:180,penalty:"80 €/g",label:"Haute"},{min_gkm:181,max_gkm:999,penalty:"150 €/g",label:"Max"}],exemptions:["EV : exempté"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" €",specific_penalty_amount:t,has_malus:g>120,severity:sev(t),notes:"Estimation 2024.",source:"Τμήμα Οδικών Μεταφορών (Road Transport Dept)",source_url:"https://www.mcw.gov.cy/mcw/rsd/rsd.nsf/index_en/index_en",legal_ref:"Customs & Excise Laws 2004 (Cap. 82) · N. 88(I)/2006 · CO₂ Registration Tax Schedule 2024",reliability:"official"}; }
    case "HR":
      { const t=g<=110?0:g<=150?Math.round((g-110)*20):Math.round(40*20+(g-150)*50);
        return {tax_name:"Posebni porez na motorna vozila (Croatie)",threshold_gkm:111,max_penalty_eur:null,currency_symbol:"€",system_description:"Taxe combinant CO₂ et puissance (kW).",brackets:[{min_gkm:0,max_gkm:110,penalty:"0 €",label:"Exempté"},{min_gkm:111,max_gkm:150,penalty:"~20 €/g",label:"Modéré"},{min_gkm:151,max_gkm:999,penalty:"~50 €/g",label:"Élevé"}],exemptions:["EV : exempté"],specific_penalty:t===0?"Aucune taxe":"~"+t.toLocaleString("fr-FR")+" € (estimatif)",specific_penalty_amount:t,has_malus:g>110,severity:sev(t),notes:"Estimation. Système CO₂ + puissance.",source:"Porezna uprava (Administration fiscale croate)",source_url:"https://www.porezna-uprava.hr/HR_porezni_sustav/Stranice/posebni-porez-na-motorna-vozila.aspx",legal_ref:"Zakon o posebnom porezu na motorna vozila (NN 15/13, 108/13, 115/16, 66/19)",reliability:"indicative"}; }
    case "SK": return {tax_name:"Pas de malus CO₂ (Slovaquie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"€",system_description:"Pas de malus CO₂ à l’immatriculation.",brackets:[{min_gkm:0,max_gkm:999,penalty:"0 €",label:"Pas de malus"}],exemptions:["EV : TVA réduite"],specific_penalty:"Pas de malus CO₂",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Réforme en discussion.",source:"Ministerstvo financíí SR",source_url:"https://www.mfsr.sk",reliability:"indicative"};
    case "CZ": return {tax_name:"Pas de malus CO₂ (Tchéquie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"CZK",system_description:"Pas de malus CO₂ à l’immatriculation.",brackets:[{min_gkm:0,max_gkm:999,penalty:"0 CZK",label:"Pas de malus"}],exemptions:["EV : incentives jusqu’à 300 000 CZK"],specific_penalty:"Pas de malus CO₂",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Transition EV lente.",source:"Finanční správa ČR",source_url:"https://www.financnisprava.cz",reliability:"indicative"};
    case "HU": return {tax_name:"Regisztrációs adó (Hongrie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"HUF",system_description:"Taxée basée sur puissance (kW) et âge.",brackets:[{min_gkm:0,max_gkm:999,penalty:"Selon kW + âge",label:"Taxe immat."}],exemptions:["EV : exempté"],specific_penalty:"Selon puissance (pas CO₂)",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Basée puissance moteur.",source:"NAV Magyarország",source_url:"https://nav.gov.hu",reliability:"indicative"};
    case "LV": return {tax_name:"Taxe d’exploitation (Lettonie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"€",system_description:"Taxe annuelle basée sur poids et puissance.",brackets:[{min_gkm:0,max_gkm:999,penalty:"Selon poids/kW",label:"Taxe annuelle"}],exemptions:["EV : taux réduit"],specific_penalty:"Selon poids/kW (pas CO₂)",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Réforme en cours.",source:"CSDD Latvija",source_url:"https://www.csdd.lv",reliability:"indicative"};
    case "LT": return {tax_name:"Taxe véhicule (Lituanie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"€",system_description:"Taxe annuelle basée sur puissance et âge.",brackets:[{min_gkm:0,max_gkm:999,penalty:"Selon kW + âge",label:"Taxe annuelle"}],exemptions:["EV : exempté"],specific_penalty:"Selon puissance (pas CO₂)",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Réforme attendue 2026.",source:"VMI Lietuva",source_url:"https://www.vmi.lt",reliability:"indicative"};
    case "RO": return {tax_name:"Pas de malus CO₂ (Roumanie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"RON",system_description:"Le timbru de mediu a été supprimé en 2017.",brackets:[{min_gkm:0,max_gkm:999,penalty:"0 RON",label:"Pas de malus"}],exemptions:["EV : bonus achat €10 000"],specific_penalty:"Pas de malus CO₂",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Timbru de mediu annulé. Aucun remplacement.",source:"ANAF România",source_url:"https://www.anaf.ro",reliability:"info"};
    case "BG": return {tax_name:"Taxe annuelle (Bulgarie)",threshold_gkm:null,max_penalty_eur:null,currency_symbol:"BGN",system_description:"Taxe annuelle basée sur puissance et norme Euro.",brackets:[{min_gkm:0,max_gkm:999,penalty:"Selon kW/Euro",label:"Taxe annuelle"}],exemptions:["EV : exempté"],specific_penalty:"Selon puissance (pas CO₂)",specific_penalty_amount:0,has_malus:false,severity:"none",notes:"Un des pays UE les moins avancés sur CO₂.",source:"NRA Bulgaria",source_url:"https://nra.bg",reliability:"info"};
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LISTE DES PAYS — Tous avec données hardcodées
// ═══════════════════════════════════════════════════════════════════════
const COUNTRIES = [
// EUROPE — sources officielles
{
  code: "FR",
  name: "France",
  flag: "🇫🇷",
  official: true,
  reliability: "official"
}, {
  code: "GB",
  name: "Royaume-Uni",
  flag: "🇬🇧",
  official: true,
  reliability: "official"
}, {
  code: "DE",
  name: "Allemagne",
  flag: "🇩🇪",
  official: true,
  reliability: "official"
}, {
  code: "ES",
  name: "Espagne",
  flag: "🇪🇸",
  official: true,
  reliability: "official"
}, {
  code: "NL",
  name: "Pays-Bas",
  flag: "🇳🇱",
  official: true,
  reliability: "official"
}, {
  code: "IT",
  name: "Italie",
  flag: "🇮🇹",
  official: true,
  reliability: "official"
}, {
  code: "PT",
  name: "Portugal",
  flag: "🇵🇹",
  official: true,
  reliability: "official"
}, {
  code: "NO",
  name: "Norvège",
  flag: "🇳🇴",
  official: true,
  reliability: "official"
}, {
  code: "AT",
  name: "Autriche",
  flag: "🇦🇹",
  official: true,
  reliability: "official"
},
// EUROPE — données indicatives (systèmes régionaux ou complexes)
{
  code: "BE",
  name: "Belgique",
  flag: "🇧🇪",
  official: true,
  reliability: "indicative"
}, {
  code: "FI",
  name: "Finlande",
  flag: "🇫🇮",
  official: true,
  reliability: "indicative"
}, {
  code: "DK",
  name: "Danemark",
  flag: "🇩🇰",
  official: true,
  reliability: "indicative"
}, {
  code: "SE",
  name: "Suède",
  flag: "🇸🇪",
  official: true,
  reliability: "indicative"
},
// EUROPE — malus CO₂ officiel
{
  code: "IE", name: "Irlande", flag: "🇮🇪", official: true, reliability: "official"
}, {
  code: "LU", name: "Luxembourg", flag: "🇱🇺", official: true, reliability: "official"
}, {
  code: "SI", name: "Slovénie", flag: "🇸🇮", official: true, reliability: "official"
}, {
  code: "GR", name: "Grèce", flag: "🇬🇷", official: true, reliability: "official"
}, {
  code: "EE", name: "Estonie", flag: "🇪🇪", official: true, reliability: "official"
}, {
  code: "MT", name: "Malte", flag: "🇲🇹", official: true, reliability: "official"
}, {
  code: "CY", name: "Chypre", flag: "🇨🇾", official: true, reliability: "official"
}, {
  code: "HR", name: "Croatie", flag: "🇭🇷", official: true, reliability: "indicative"
}, {
  code: "SK", name: "Slovaquie", flag: "🇸🇰", official: true, reliability: "indicative"
}, {
  code: "CZ", name: "Tchéquie", flag: "🇨🇿", official: true, reliability: "indicative"
}, {
  code: "HU", name: "Hongrie", flag: "🇭🇺", official: true, reliability: "indicative"
}, {
  code: "LV", name: "Lettonie", flag: "🇱🇻", official: true, reliability: "indicative"
}, {
  code: "LT", name: "Lituanie", flag: "🇱🇹", official: true, reliability: "indicative"
}, {
  code: "RO", name: "Roumanie", flag: "🇷🇴", official: true, reliability: "info"
}, {
  code: "BG", name: "Bulgarie", flag: "🇧🇬", official: true, reliability: "info"
},
// EUROPE / WORLD — pas de système CO₂ direct
{
  code: "CH",
  name: "Suisse",
  flag: "🇨🇭",
  official: true,
  reliability: "info"
}, {
  code: "PL",
  name: "Pologne",
  flag: "🇵🇱",
  official: true,
  reliability: "info"
}, {
  code: "US",
  name: "États-Unis",
  flag: "🇺🇸",
  official: true,
  reliability: "info"
}, {
  code: "CA",
  name: "Canada",
  flag: "🇨🇦",
  official: true,
  reliability: "info"
}, {
  code: "JP",
  name: "Japon",
  flag: "🇯🇵",
  official: true,
  reliability: "info"
}, {
  code: "CN",
  name: "Chine",
  flag: "🇨🇳",
  official: true,
  reliability: "info"
}, {
  code: "AU",
  name: "Australie",
  flag: "🇦🇺",
  official: true,
  reliability: "info"
}, {
  code: "BR",
  name: "Brésil",
  flag: "🇧🇷",
  official: true,
  reliability: "info"
}, {
  code: "IN",
  name: "Inde",
  flag: "🇮🇳",
  official: true,
  reliability: "info"
}, {
  code: "KR",
  name: "Corée du Sud",
  flag: "🇰🇷",
  official: true,
  reliability: "info"
},
// WORLD — vrai malus CO₂
{
  code: "ZA",
  name: "Afrique du Sud",
  flag: "🇿🇦",
  official: true,
  reliability: "official"
}, {
  code: "SG",
  name: "Singapour",
  flag: "🇸🇬",
  official: true,
  reliability: "official"
}];
const CUSTOM_EMISSIONS = [0, 95, 113, 120, 143, 150, 175, 200];
// Reliability config exposes i18n keys instead of literal strings so
// consumers can translate via SettingsContext.t(). Use `getReliabilityCopy`
// in a component to resolve label/desc/short.
const RELIABILITY_CONFIG = {
  official: {
    color: "#50E5E5",
    labelKey: "malus_reliability_official_label",
    shortKey: "malus_reliability_official_short",
    descKey:  "malus_reliability_official_desc",
  },
  indicative: {
    color: "#E6B450",
    labelKey: "malus_reliability_indicative_label",
    shortKey: "malus_reliability_indicative_short",
    descKey:  "malus_reliability_indicative_desc",
  },
  info: {
    color: "#94a3b8",
    labelKey: "malus_reliability_info_label",
    shortKey: "malus_reliability_info_short",
    descKey:  "malus_reliability_info_desc",
  }
};

export {
  FR_BAREME_2023, FR_BAREME_2024, FR_BAREME_2025, FR_BAREME_2026, FR_BAREME_2027,
  getFRPeriod, computeFR, computeFRPoids, formatDateFR,
  getImportDecote, getImportDecotePT, getImportDecoteNL, getImportDecoteDE,
  getImportDecoteES, getImportDecoteBE, getImportDecoteIE,
  getUKPeriod, computeUK, computeESPercent, computeDE, computeNL, computePT,
  computeNO, computeNOPoids, computeDK, computeAT, computeFIPercent,
  computeSE, computeZA, computeSG, computeBE,
  buildCountryData,
  COUNTRIES, CUSTOM_EMISSIONS, RELIABILITY_CONFIG,
}
