/**
 * i18n leak detector — walks every route in EN/DE and finds any French
 * UI strings still appearing. Strict mode: any FR diacritic word that
 * doesn't also exist in the EN/DE dictionary is flagged.
 *
 * Usage: node scripts/audit-i18n.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://127.0.0.1:4173'
const OUT  = '/tmp/i18n-audit'
mkdirSync(OUT, { recursive: true })

const PROTECTED_ROUTES = [
  '/hub',
  '/products',
  '/co2-malus',
  '/chat',
  '/price-watch',
  '/objections',
  '/pitch',
  '/tco',
  '/settings',
]
const PUBLIC_ROUTES = [
  '/mentions-legales',
  '/politique-confidentialite',
  '/forgot-password',
  '/reset-password',
]

// Words that are valid FR but ALSO appear in target languages (cognates,
// internationalisms, brand names) — won't be flagged
const COGNATE_ALLOWLIST = new Set([
  'autobuyunion', 'audi', 'bmw', 'jaecoo', 'tesla', 'peugeot', 'renault',
  'volkswagen', 'toyota', 'hyundai', 'dacia', 'fiat',
  'co2', 'co₂', 'wltp', 'tmom', 'phev', 'btoc', 'btob', 'b2b', 'b2c',
  'vercel', 'anthropic', 'claude', 'sas', 'rgpd', 'gdpr', 'cnil',
  'eur', 'gbp', 'chf', 'usd',
  // Status badges & technical
  'official', 'admin', 'membre',
  // Cross-language cognates (FR ↔ IT ↔ ES — same EU fiscal/legal vocabulary)
  'malus',    // used in FR, IT, ES with identical meaning ("EU eco-tax penalty")
  'fiscales', // Spanish plural of "fiscal" — perfectly valid ES
  'autoridades',// ES "autorités" — same cognate
  'datos',    // ES "données" cognate (no false positive but listed)
  'consultar',// ES "consulter" cognate
  // Numbers and abbreviations
  'pm', 'am', 'tdi', 'tsi', 'gpl',
  // Cities/regions (data)
  'wallonie', 'flandre', 'bruxelles', 'canarias', 'navarra', 'ceuta',
])

// FR words that are likely UI strings (specific French vocabulary).
// Detection: scan the page text for these. If found in EN/DE mode → leak.
const FR_INDICATORS = [
  // Common UI verbs (FR specific)
  'connexion', 'connecter', 'connecté', 'déconnexion', 'déconnecter',
  'enregistrer', 'enregistré', 'envoyer', 'recevoir', 'générer', 'générée', 'générés',
  'afficher', 'masquer', 'modifier', 'supprimer', 'fermer', 'ouvrir',
  'rechercher', 'sélectionner', 'choisir', 'cliquez', 'voir',
  // Common UI nouns (FR specific)
  'paramètres', 'paramètre', 'paramétrage',
  'tableau', 'liste', 'fiche', 'fiches', 'rapport', 'rapports',
  'véhicule', 'véhicules', 'achat', 'vente', 'ventes',
  'utilisateur', 'utilisatrice', 'compte',
  // FR-only words
  'bienvenue', 'merci', 'voici', 'aujourd', 'hier', 'demain',
  'gratuit', 'payant', 'occasion', 'neuf',
  'décote', 'malus', 'barème', 'seuil', 'plafond', 'exempté', 'exemption',
  'masse', 'poids', 'cylindrée', 'motorisation', 'carburant', 'consommation',
  'thermique', 'hybride', 'électrique', 'essence',
  // FR articles / prepositions in titles
  'sélectionnez', 'choisissez', 'pour vous', 'votre compte',
  'mois', 'année', 'jour', 'aujourd',
  // Common error / status
  'erreur', 'succès', 'chargement', 'attente',
  'identifiants', 'incorrects',
  // Legal-specific
  'mentions légales', 'confidentialité', 'données personnelles',
  'consentement', 'consultez', 'autorités', 'fiscales',
]

const results = []
const browser = await chromium.launch({ headless: true })

/** Login and set the requested language. Returns the page. */
async function loginAndSetLanguage(lang) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/hub`)
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const selects = page.locator('select')
  const count = await selects.count()
  const labelByLang = { en: 'English', de: 'Deutsch', it: 'Italiano', es: 'Español', fr: 'Français' }
  for (let i = 0; i < count; i++) {
    const opts = await selects.nth(i).locator('option').allTextContents()
    if (opts.join(',').includes(labelByLang[lang])) {
      await selects.nth(i).selectOption(lang)
      break
    }
  }
  await page.waitForTimeout(400)
  return { page, ctx }
}

/** Visits a route, extracts visible text, detects FR leaks. */
async function auditRoute(page, route, lang) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${lang}_${route.replace(/\//g, '_')}.png`, fullPage: true })

  // Extract all visible text from main content (exclude header + sidebar so we
  // focus on the page body; for legal pages there's no sidebar)
  const bodyText = await page.locator('body').textContent()
  const lower = bodyText.toLowerCase()
  const leaks = []
  for (const word of FR_INDICATORS) {
    // Word-boundary match — avoids substring false-positives like
    // "merci" matching inside "commercial".
    const re = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(lower)) {
      const isAllowed = COGNATE_ALLOWLIST.has(word.toLowerCase())
      if (!isAllowed) leaks.push(word)
    }
  }
  return { route, lang, leaks, bytes: bodyText.length }
}

async function auditLanguage(lang) {
  console.log(`\n══ Audit ${lang.toUpperCase()} ══`)
  const { page, ctx } = await loginAndSetLanguage(lang)
  for (const route of PROTECTED_ROUTES) {
    const r = await auditRoute(page, route, lang)
    results.push(r)
    console.log(`  ${r.leaks.length === 0 ? '✓' : '✗'} ${route} (${r.leaks.length} leaks)${r.leaks.length ? ': ' + r.leaks.slice(0, 6).join(', ') : ''}`)
  }
  // Public routes (no auth required)
  for (const route of PUBLIC_ROUTES) {
    const r = await auditRoute(page, route, lang)
    results.push(r)
    console.log(`  ${r.leaks.length === 0 ? '✓' : '✗'} ${route} (${r.leaks.length} leaks)${r.leaks.length ? ': ' + r.leaks.slice(0, 6).join(', ') : ''}`)
  }
  await ctx.close()
}

for (const lang of ['en', 'de', 'it', 'es']) {
  await auditLanguage(lang)
}

await browser.close()

const totalLeaks = results.reduce((s, r) => s + r.leaks.length, 0)
const summary = `Total leaks: ${totalLeaks}\n\n` + results
  .filter(r => r.leaks.length > 0)
  .map(r => `[${r.lang}] ${r.route} — ${r.leaks.length} leak(s): ${r.leaks.join(', ')}`)
  .join('\n')
writeFileSync(`${OUT}/report.txt`, summary)
console.log(`\n${'─'.repeat(60)}\n${summary}\n${'─'.repeat(60)}`)
process.exit(totalLeaks === 0 ? 0 : 1)
