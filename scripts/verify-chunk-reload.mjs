#!/usr/bin/env node
/**
 * Vérifie lazyWithReload sur le BUILD DE PROD, avec watchdog anti-blocage.
 *   C. Navigation normale → la page Veille Prix s'affiche (sélecteur pays).
 *   B. Chunk périmé PERMANENT (échoue toujours) → 1 reload max, puis
 *      ErrorBoundary (pas de boucle de rechargement infinie).
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4342
const BASE = `http://localhost:${PORT}`

// Watchdog : si quoi que ce soit bloque > 75 s, on sort en échec.
const watchdog = setTimeout(() => { console.error('❌ WATCHDOG timeout'); process.exit(3) }, 75000)

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/hub', { timeout: 8000 })
}

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' })
  const cleanup = () => { try { preview.kill('SIGKILL') } catch {} }
  const fail = (m) => { console.error('❌ ' + m); cleanup(); clearTimeout(watchdog); process.exit(1) }

  const deadline = Date.now() + 15000
  while (Date.now() < deadline) { try { if ((await fetch(BASE + '/')).ok) break } catch {} ; await sleep(400) }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(9000)
  let loads = 0
  page.on('load', () => loads++)

  const r = {}
  try {
    await login(page)

    // ── C. Navigation normale ──
    await page.goto(BASE + '/price-watch', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('select:has(option[value="DE"])', { timeout: 9000 })
    r.normal = await page.locator('select:has(option[value="DE"])').count() > 0

    // ── B. Chunk permanent → ErrorBoundary, sans boucle ──
    let aborts = 0
    await page.route('**/assets/PriceWatch-*.js', (route) => { aborts++; route.abort('failed') })
    // repartir propre : vider le drapeau de reload + revenir au hub
    await page.goto(BASE + '/hub', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => { try { sessionStorage.removeItem('abu_chunk_reload') } catch {} })
    const loadsBefore = loads
    await page.goto(BASE + '/price-watch', { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForSelector('text=/erreur inattendue|unexpected error/i', { timeout: 15000 })
    const loadsAtError = loads
    await sleep(3000)                              // fenêtre anti-boucle
    r.errorShown = true
    r.noLoop = (loads === loadsAtError)            // plus aucun reload après l'erreur
    r.reloadsDuringB = loadsAtError - loadsBefore  // 1 goto + 1 reload auto = 2
    r.aborts = aborts
    r.flag = await page.evaluate(() => { try { return sessionStorage.getItem('abu_chunk_reload') } catch { return null } })
    await page.screenshot({ path: '/tmp/chunk-reload-errorboundary.png' })
  } catch (e) {
    await page.screenshot({ path: '/tmp/chunk-reload-fail.png' }).catch(() => {})
    await browser.close(); fail('Exception : ' + e.message)
  }

  await browser.close(); cleanup(); clearTimeout(watchdog)

  console.log('\n========== VERIF CHUNK-RELOAD ==========')
  console.log(`C. Navigation normale OK          : ${r.normal ? 'OK' : 'KO'}`)
  console.log(`B. ErrorBoundary affiché          : ${r.errorShown ? 'OK' : 'KO'}`)
  console.log(`B. Pas de boucle de reload        : ${r.noLoop ? 'OK' : 'KO'}`)
  console.log(`   reloads pendant B = ${r.reloadsDuringB} (≤2 attendu), aborts=${r.aborts}, flag=${r.flag}`)
  console.log('Screenshot : /tmp/chunk-reload-errorboundary.png')
  console.log('========================================\n')

  if (!r.normal) fail('Navigation normale cassée')
  if (!r.errorShown) fail('ErrorBoundary non affiché')
  if (!r.noLoop) fail('Boucle de rechargement détectée')
  if (r.reloadsDuringB > 2) fail(`Trop de reloads: ${r.reloadsDuringB}`)
  console.log('✅ CHUNK-RELOAD OK — nav normale intacte, reload auto borné à 1×, ErrorBoundary en secours, aucune boucle.')
  process.exit(0)
}
main()
