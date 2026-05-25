import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://127.0.0.1:4173'
const OUT  = '/tmp/i18n-verify'
mkdirSync(OUT, { recursive: true })

const findings = []
const log = (s) => { console.log(s); findings.push(s) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  // Ensure no localStorage leaks between tests
  storageState: undefined,
})
const page = await ctx.newPage()
page.on('pageerror', e => log(`PAGEERROR: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') log(`CONSOLE ERROR: ${m.text()}`) })

// ── 1. LOGIN ──────────────────────────────────────────────────────────────────
log('▸ Login page')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/01-login-dark-fr.png` })

await page.fill('input[autocomplete="username"]', 'admin')
await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
await page.click('button[type="submit"]')
await page.waitForURL(`${BASE}/hub`, { timeout: 10000 })
log('✓ Logged in')

// ── 2. HUB DEFAULT (FR / DARK) ────────────────────────────────────────────────
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/02-hub-dark-fr.png`, fullPage: true })
const hubFR = await page.textContent('body')
const hasFRBadge = hubFR.includes('Rapports IA') && hubFR.includes('40 pays')
log(`Hub FR badges visible: ${hasFRBadge ? '✓' : '✗'}`)

// ── 3. SWITCH TO ENGLISH ──────────────────────────────────────────────────────
log('▸ Switch language → English')
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
// The last select is the language selector
const selects = page.locator('select')
const count = await selects.count()
log(`Found ${count} selects on Settings`)
// Find the select that has options "fr","en","de","it","es"
let langIdx = -1
for (let i = 0; i < count; i++) {
  const opts = await selects.nth(i).locator('option').allTextContents()
  if (opts.join(',').includes('English')) { langIdx = i; break }
}
log(`Language select index: ${langIdx}`)
await selects.nth(langIdx).selectOption('en')
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/03-settings-en-dark.png`, fullPage: true })

// ── 4. HUB IN ENGLISH ─────────────────────────────────────────────────────────
log('▸ Hub in English')
await page.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/04-hub-en-dark.png`, fullPage: true })

const hubEN = await page.textContent('body')
const checksEN = [
  { needle: 'Welcome',          should: 'present', kind: 'EN hero' },
  { needle: 'AI Reports',       should: 'present', kind: 'badge AI Reports' },
  { needle: '40 countries',     should: 'present', kind: 'badge 40 countries' },
  { needle: 'Used · New',       should: 'present', kind: 'badge Used · New' },
  { needle: 'Access',           should: 'present', kind: 'CTA Access' },
  { needle: 'Rapports IA',      should: 'absent',  kind: 'FR badge leak' },
  { needle: '40 pays',          should: 'absent',  kind: 'FR pays leak' },
  { needle: 'Accéder',          should: 'absent',  kind: 'FR Accéder leak' },
]
for (const c of checksEN) {
  const has = hubEN.includes(c.needle)
  const ok = (c.should === 'present') === has
  log(`  ${ok ? '✓' : '✗'} ${c.kind}: "${c.needle}" ${c.should} (actually ${has ? 'present' : 'absent'})`)
}

// ── 5. CO2 MALUS IN ENGLISH ───────────────────────────────────────────────────
log('▸ CO2 Malus in English')
await page.goto(`${BASE}/co2-malus`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/05-malus-en-dark.png`, fullPage: true })

const malusEN = await page.textContent('body')
const malusChecks = [
  { needle: 'Powertrain',       should: 'present' },
  { needle: 'Registration date',should: 'present' },
  { needle: 'Advanced parameters', should: 'present' },
  { needle: 'Motorisation',     should: 'absent', kind: 'FR Motorisation leak' },
  { needle: 'Date 1ère immat',  should: 'absent', kind: 'FR date label leak' },
  { needle: 'Paramètres avancés', should: 'absent', kind: 'FR advanced leak' },
]
for (const c of malusChecks) {
  const has = malusEN.includes(c.needle)
  const ok = (c.should === 'present') === has
  log(`  ${ok ? '✓' : '✗'} "${c.needle}" ${c.should} (${has ? 'present' : 'absent'})`)
}

// ── 6. CHAT PAGE IN ENGLISH ──────────────────────────────────────────────────
log('▸ Chat in English')
await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/06-chat-en-dark.png`, fullPage: true })

const chatEN = await page.textContent('body')
const chatChecks = [
  { needle: 'AI Assistant',      should: 'present' },
  { needle: 'How can I help',    should: 'present' },
  { needle: 'Posez',             should: 'absent', kind: 'FR placeholder leak' },
  { needle: 'Assistant IA spécialisé', should: 'absent', kind: 'FR tagline leak' },
]
for (const c of chatChecks) {
  const has = chatEN.includes(c.needle)
  const ok = (c.should === 'present') === has
  log(`  ${ok ? '✓' : '✗'} "${c.needle}" ${c.should} (${has ? 'present' : 'absent'})`)
}

// ── 7. SWITCH TO LIGHT MODE + SCREENSHOTS ────────────────────────────────────
log('▸ Light mode')
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
// Click the "Light" theme button (Sun icon)
const lightBtn = page.locator('button').filter({ hasText: 'Light' }).first()
await lightBtn.click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/07-settings-en-light.png`, fullPage: true })

await page.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/08-hub-en-light.png`, fullPage: true })

await page.goto(`${BASE}/co2-malus`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/09-malus-en-light.png`, fullPage: true })

await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/10-chat-en-light.png`, fullPage: true })

// ── 8. SWITCH TO GERMAN + SCREENSHOT HUB ─────────────────────────────────────
log('▸ German language')
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const selects2 = page.locator('select')
const count2 = await selects2.count()
let langIdx2 = -1
for (let i = 0; i < count2; i++) {
  const opts = await selects2.nth(i).locator('option').allTextContents()
  if (opts.join(',').includes('Deutsch')) { langIdx2 = i; break }
}
await selects2.nth(langIdx2).selectOption('de')
await page.waitForTimeout(500)
await page.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/11-hub-de-light.png`, fullPage: true })

const hubDE = await page.textContent('body')
const deChecks = [
  { needle: 'KI-Berichte', should: 'present' },
  { needle: '40 Länder',   should: 'present' },
  { needle: 'Rapports IA', should: 'absent', kind: 'FR leak in DE' },
  { needle: 'AI Reports',  should: 'absent', kind: 'EN leak in DE' },
]
for (const c of deChecks) {
  const has = hubDE.includes(c.needle)
  const ok = (c.should === 'present') === has
  log(`  ${ok ? '✓' : '✗'} "${c.needle}" ${c.should} (${has ? 'present' : 'absent'})`)
}

// ── 9. MOBILE VIEW ─────────────────────────────────────────────────────────────
log('▸ Mobile viewport (iPhone 14)')
const mob = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true,
})
const mp = await mob.newPage()
await mp.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await mp.fill('input[autocomplete="username"]', 'admin')
await mp.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
await mp.click('button[type="submit"]')
await mp.waitForURL(`${BASE}/hub`)
// Settings to set light + en
await mp.goto(`${BASE}/settings`)
await mp.waitForTimeout(400)
const mSelects = mp.locator('select')
const mCount = await mSelects.count()
for (let i = 0; i < mCount; i++) {
  const opts = await mSelects.nth(i).locator('option').allTextContents()
  if (opts.join(',').includes('English')) {
    await mSelects.nth(i).selectOption('en')
    break
  }
}
await mp.waitForTimeout(300)
const mLight = mp.locator('button').filter({ hasText: /Light/i }).first()
if (await mLight.count()) await mLight.click()
await mp.waitForTimeout(400)
await mp.goto(`${BASE}/hub`)
await mp.waitForTimeout(500)
await mp.screenshot({ path: `${OUT}/12-hub-en-light-mobile.png`, fullPage: true })

writeFileSync(`${OUT}/findings.txt`, findings.join('\n'))
await browser.close()
console.log(`\n✓ Verification complete — screenshots in ${OUT}/`)
