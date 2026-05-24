/**
 * ABU Testing — Autobuyunion Automated UI Tester
 * Tests mobile scroll, layout, and key features across all pages
 * Runs 3 rounds and produces a consolidated report with screenshots.
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://project-s74gc.vercel.app'
const USERNAME = 'admin'
const PASSWORD = 'autobuyunion2025'
const ROUNDS   = 3
const OUT_DIR  = '/tmp/abu-test'

// iPhone 14 Pro viewport
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
// Desktop viewport
const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false }

const PAGES = [
  { name: 'Hub',          path: '/hub',         scrollTest: true },
  { name: 'Settings',     path: '/settings',    scrollTest: true },
  { name: 'CO2 Malus',    path: '/co2-malus',   scrollTest: true },
  { name: 'Veille Prix',  path: '/price-watch', scrollTest: true },
  { name: 'TCO',          path: '/tco',         scrollTest: true },
  { name: 'Objections',   path: '/objections',  scrollTest: true },
  { name: 'Chat IA',      path: '/chat',        scrollTest: false },  // not a scroll page
  { name: 'Produits',     path: '/products',    scrollTest: true },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg, level = 'INFO') {
  const prefix = { INFO: '📋', PASS: '✅', FAIL: '❌', WARN: '⚠️ ', ROUND: '🔄' }[level] || '▸'
  console.log(`${prefix}  ${msg}`)
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[autocomplete="username"]', USERNAME)
  await page.fill('input[autocomplete="current-password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/hub`, { timeout: 10000 })
}

/**
 * Checks if bottom content is visible above the bottom nav.
 * Returns: { navTop, lastElemBottom, clearance, ok, detail }
 */
async function checkScrollVisibility(page) {
  return page.evaluate(() => {
    // Bottom nav
    const nav = document.querySelector('nav.fixed')
    if (!nav) return { navTop: null, ok: true, detail: 'No fixed nav (desktop?)' }
    const navTop = nav.getBoundingClientRect().top

    // Scroll to absolute bottom
    const main = document.querySelector('main') || document.documentElement
    main.scrollTo({ top: main.scrollHeight, behavior: 'instant' })

    // Wait for scroll to settle then measure last element
    const allElems = document.querySelectorAll('main > div > *')
    const last = allElems[allElems.length - 1]
    if (!last) return { navTop, ok: true, detail: 'No children found' }
    const rect = last.getBoundingClientRect()

    const clearance = navTop - rect.bottom
    return {
      navTop: Math.round(navTop),
      lastElemBottom: Math.round(rect.bottom),
      clearance: Math.round(clearance),
      ok: clearance >= -5,  // allow 5px tolerance
      detail: clearance >= -5
        ? `OK — ${Math.round(clearance)}px clearance above nav`
        : `FAIL — content extends ${Math.abs(Math.round(clearance))}px behind nav`,
    }
  })
}

/**
 * Check chat input is visible (not hidden behind bottom nav)
 */
async function checkChatInput(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav.fixed')
    const input = document.querySelector('textarea')
    const sendBtn = document.querySelector('button[type="submit"]')
    if (!nav || !input) return { ok: false, detail: 'Nav or input not found' }

    const navTop = nav.getBoundingClientRect().top
    const inputRect = input.getBoundingClientRect()
    const btnRect = sendBtn?.getBoundingClientRect()

    const inputVisible = inputRect.bottom <= navTop
    const btnVisible = btnRect ? btnRect.bottom <= navTop : true

    return {
      navTop: Math.round(navTop),
      inputBottom: Math.round(inputRect.bottom),
      btnBottom: btnRect ? Math.round(btnRect.bottom) : null,
      ok: inputVisible && btnVisible,
      detail: inputVisible && btnVisible
        ? `OK — input fully visible (${Math.round(navTop - inputRect.bottom)}px above nav)`
        : `FAIL — input/btn extends ${Math.round(inputRect.bottom - navTop)}px behind nav`,
    }
  })
}

/**
 * Check language switch works
 */
async function checkLanguage(page) {
  // Go to settings, switch to English, check hub title changes
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  // Select English
  const langSelect = page.locator('select').filter({ hasText: /Français|English|Deutsch/ }).last()
  await langSelect.selectOption('en')
  await page.waitForTimeout(600)

  // Go to hub and check English text
  await page.goto(`${BASE_URL}/hub`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const text = await page.textContent('body')
  const hasEnglish = text.includes('Interactive tools') || text.includes('Countries covered') || text.includes('Access')

  // Switch back to French
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const langSelectFr = page.locator('select').filter({ hasText: /Français|English|Deutsch/ }).last()
  await langSelectFr.selectOption('fr')
  await page.waitForTimeout(300)

  return {
    ok: hasEnglish,
    detail: hasEnglish
      ? 'OK — interface switched to English'
      : 'FAIL — English strings not found after language switch',
  }
}

/**
 * Check currency switch works
 */
async function checkCurrency(page) {
  // Set currency to GBP
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const currSelect = page.locator('select[value]').filter({ has: page.locator('option[value="EUR"]') }).first()
  await currSelect.selectOption('GBP')
  await page.waitForTimeout(600)

  // Go to products page and check GBP symbol
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const text = await page.textContent('body')
  const hasGBP = text.includes('£')

  // Reset to EUR
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const currSelectEur = page.locator('select[value]').filter({ has: page.locator('option[value="EUR"]') }).first()
  await currSelectEur.selectOption('EUR')
  await page.waitForTimeout(300)

  return {
    ok: hasGBP,
    detail: hasGBP
      ? 'OK — prices showing in £ after GBP selection'
      : 'FAIL — GBP symbol not found in Products page',
  }
}

// ── Main test runner ──────────────────────────────────────────────────────────

async function runRound(roundNum, browser) {
  log(`Round ${roundNum}/${ROUNDS}`, 'ROUND')
  const results = []
  const roundDir = join(OUT_DIR, `round-${roundNum}`)
  ensureDir(roundDir)

  // ── Mobile tests ───────────────────────────────────────────────────────────
  log(`  Mobile (${MOBILE.width}×${MOBILE.height})`)
  const mobileCtx = await browser.newContext({
    viewport: { width: MOBILE.width, height: MOBILE.height },
    deviceScaleFactor: MOBILE.deviceScaleFactor,
    isMobile: MOBILE.isMobile,
    hasTouch: MOBILE.hasTouch,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const mobilePage = await mobileCtx.newPage()

  // Login
  try {
    await login(mobilePage)
    log(`  Login OK`, 'PASS')
    results.push({ test: 'Login', viewport: 'mobile', ok: true, detail: 'Logged in successfully' })
  } catch (e) {
    log(`  Login FAILED: ${e.message}`, 'FAIL')
    results.push({ test: 'Login', viewport: 'mobile', ok: false, detail: e.message })
    await mobileCtx.close()
    return results
  }

  // Test each page: scroll to bottom, screenshot
  for (const pg of PAGES) {
    try {
      await mobilePage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 })
      await mobilePage.waitForTimeout(800)

      // Scroll to bottom
      await mobilePage.evaluate(() => {
        const main = document.querySelector('main')
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'instant' })
      })
      await mobilePage.waitForTimeout(400)

      // Screenshot
      const ssPath = join(roundDir, `mobile_${pg.name.replace(/\s+/g, '_').toLowerCase()}.png`)
      await mobilePage.screenshot({ path: ssPath, fullPage: false })

      // Scroll visibility check
      let check
      if (pg.name === 'Chat IA') {
        check = await checkChatInput(mobilePage)
      } else if (pg.scrollTest) {
        check = await checkScrollVisibility(mobilePage)
      } else {
        check = { ok: true, detail: 'Scroll test skipped' }
      }

      const level = check.ok ? 'PASS' : 'FAIL'
      log(`  Mobile / ${pg.name}: ${check.detail}`, level)
      results.push({ test: `Scroll — ${pg.name}`, viewport: 'mobile', ...check, screenshot: ssPath })

    } catch (e) {
      log(`  Mobile / ${pg.name} ERROR: ${e.message}`, 'FAIL')
      results.push({ test: `Scroll — ${pg.name}`, viewport: 'mobile', ok: false, detail: e.message })
    }
  }

  // Language switch test (mobile)
  try {
    const lang = await checkLanguage(mobilePage)
    log(`  Language switch: ${lang.detail}`, lang.ok ? 'PASS' : 'FAIL')
    results.push({ test: 'Language switch', viewport: 'mobile', ...lang })
  } catch (e) {
    log(`  Language switch ERROR: ${e.message}`, 'WARN')
    results.push({ test: 'Language switch', viewport: 'mobile', ok: false, detail: e.message })
  }

  // Currency switch test (mobile)
  try {
    const cur = await checkCurrency(mobilePage)
    log(`  Currency switch: ${cur.detail}`, cur.ok ? 'PASS' : 'FAIL')
    results.push({ test: 'Currency switch', viewport: 'mobile', ...cur })
  } catch (e) {
    log(`  Currency switch ERROR: ${e.message}`, 'WARN')
    results.push({ test: 'Currency switch', viewport: 'mobile', ok: false, detail: e.message })
  }

  await mobileCtx.close()

  // ── Desktop smoke test ─────────────────────────────────────────────────────
  log(`  Desktop (${DESKTOP.width}×${DESKTOP.height})`)
  const desktopCtx = await browser.newContext({
    viewport: { width: DESKTOP.width, height: DESKTOP.height },
  })
  const desktopPage = await desktopCtx.newPage()

  try {
    await login(desktopPage)
    // Quick screenshot of hub on desktop
    await desktopPage.goto(`${BASE_URL}/hub`, { waitUntil: 'networkidle' })
    await desktopPage.waitForTimeout(600)
    const dsPath = join(roundDir, `desktop_hub.png`)
    await desktopPage.screenshot({ path: dsPath })
    log(`  Desktop Hub: OK`, 'PASS')
    results.push({ test: 'Desktop Hub', viewport: 'desktop', ok: true, detail: 'Hub loaded on desktop', screenshot: dsPath })
  } catch (e) {
    results.push({ test: 'Desktop Hub', viewport: 'desktop', ok: false, detail: e.message })
  }

  await desktopCtx.close()
  return results
}

// ── Report generator ──────────────────────────────────────────────────────────

function generateReport(allRounds) {
  const lines = []
  lines.push('═══════════════════════════════════════════════════════')
  lines.push('   ABU TESTING — RAPPORT FINAL')
  lines.push(`   ${new Date().toLocaleString('fr-FR')} — ${ROUNDS} rounds — ${BASE_URL}`)
  lines.push('═══════════════════════════════════════════════════════')
  lines.push('')

  // Group by test name
  const byTest = {}
  for (const round of allRounds) {
    for (const r of round) {
      const key = `${r.test} [${r.viewport}]`
      if (!byTest[key]) byTest[key] = []
      byTest[key].push(r)
    }
  }

  let totalPass = 0, totalFail = 0

  for (const [testName, runs] of Object.entries(byTest)) {
    const passes = runs.filter(r => r.ok).length
    const total  = runs.length
    const allOk  = passes === total
    const icon   = allOk ? '✅' : passes > 0 ? '⚠️ ' : '❌'

    lines.push(`${icon} ${testName}`)
    lines.push(`   Résultat: ${passes}/${total} rounds OK`)

    // Show clearance values if available
    const clearances = runs.filter(r => r.clearance !== undefined).map(r => r.clearance)
    if (clearances.length > 0) {
      lines.push(`   Clearance scroll: ${clearances.map(c => `${c}px`).join(' / ')} (min recommandé: 0px)`)
    }

    // Last detail
    const lastDetail = runs[runs.length - 1]?.detail
    if (lastDetail) lines.push(`   Dernier: ${lastDetail}`)

    lines.push('')

    if (allOk) totalPass++
    else totalFail++
  }

  lines.push('───────────────────────────────────────────────────────')
  lines.push(`   RÉSUMÉ: ${totalPass} tests OK / ${totalFail} tests en échec`)
  lines.push(`   Taux de réussite: ${Math.round(totalPass / (totalPass + totalFail) * 100)}%`)
  lines.push('═══════════════════════════════════════════════════════')

  return lines.join('\n')
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  ensureDir(OUT_DIR)
  console.log('\n🚀 ABU Testing démarré — URL:', BASE_URL)
  console.log(`   Viewport mobile: ${MOBILE.width}×${MOBILE.height}`)
  console.log(`   Pages testées: ${PAGES.map(p => p.name).join(', ')}`)
  console.log(`   Rounds: ${ROUNDS}\n`)

  const browser = await chromium.launch({ headless: true })
  const allRounds = []

  for (let i = 1; i <= ROUNDS; i++) {
    const roundResults = await runRound(i, browser)
    allRounds.push(roundResults)
    if (i < ROUNDS) {
      log(`Round ${i} terminé. Pause 2s avant suivant...`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  await browser.close()

  const report = generateReport(allRounds)
  console.log('\n' + report)

  // Save report
  const reportPath = join(OUT_DIR, 'abu-report.txt')
  writeFileSync(reportPath, report)
  console.log(`\n📁 Screenshots et rapport dans: ${OUT_DIR}`)
  console.log(`   Rapport: ${reportPath}`)

  // Exit with error code if failures
  const hasFails = allRounds.flat().some(r => !r.ok)
  process.exit(hasFails ? 1 : 0)
}

main().catch(e => {
  console.error('ABU Test fatal error:', e)
  process.exit(2)
})
