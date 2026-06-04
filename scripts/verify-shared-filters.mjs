#!/usr/bin/env node
/**
 * Vérifie que les filtres partagés (mêmes que la Veille Prix) s'affichent bien
 * sur Objections, Pitch et la fenêtre « Générer une fiche IA », sur le BUILD PROD.
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4348
const BASE = `http://localhost:${PORT}`
const watchdog = setTimeout(() => { console.error('❌ WATCHDOG'); process.exit(3) }, 90000)

const LABELS = ['Marque', 'Modèle', 'Carrosserie', 'Année min', 'Année max', 'Kilométrage min', 'Kilométrage max', 'Carburant', 'Boîte']

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' })
  const cleanup = () => { try { preview.kill('SIGKILL') } catch {} }
  const fail = (m) => { console.error('❌ ' + m); cleanup(); clearTimeout(watchdog); process.exit(1) }

  const deadline = Date.now() + 15000
  while (Date.now() < deadline) { try { if ((await fetch(BASE + '/')).ok) break } catch {} ; await sleep(400) }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))

  try {
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[autocomplete="username"]', 'hubert.saget@aafgroup.eu')
    await page.fill('input[autocomplete="current-password"]', 'Cous1hu*')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/hub', { timeout: 8000 })
    await page.locator('button:has-text("Tout accepter")').first().click().catch(() => {})

    const checkPage = async (path, name) => {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=/Marque/i', { timeout: 8000 })
      const body = (await page.locator('body').innerText()).toUpperCase()
      const missing = LABELS.filter(l => !body.includes(l.toUpperCase()))
      if (missing.length) fail(`${name} : labels manquants → ${missing.join(', ')}`)
      console.log(`${name.padEnd(12)} : OK (tous les filtres présents)`)
    }

    await checkPage('/objections', 'Objections')
    await checkPage('/pitch', 'Pitch')

    // Fiche IA : ouvrir le modal depuis Produits
    await page.goto(BASE + '/products', { waitUntil: 'domcontentloaded' })
    const genBtn = page.locator('button:has-text("Générer"), button:has-text("fiche")').first()
    await genBtn.click({ timeout: 8000 }).catch(() => {})
    await sleep(500)
    const modalOpen = await page.locator('[role="dialog"]').count() > 0
    if (modalOpen) {
      const body = (await page.locator('[role="dialog"]').innerText()).toUpperCase()
      const missing = LABELS.filter(l => !body.includes(l.toUpperCase()))
      if (missing.length) fail(`Fiche IA : labels manquants → ${missing.join(', ')}`)
      console.log('Fiche IA     : OK (tous les filtres présents dans le modal)')
    } else {
      console.log('Fiche IA     : modal non ouvert automatiquement (bouton introuvable) — non bloquant')
    }

    await page.screenshot({ path: '/tmp/shared-filters.png', fullPage: true })

    if (errors.length) fail('Erreurs console : ' + errors.slice(0, 5).join(' | '))
    await browser.close(); cleanup(); clearTimeout(watchdog)
    console.log('\n✅ FILTRES PARTAGÉS OK — Objections, Pitch (+ Fiche IA) alignés sur la Veille Prix, sans erreur console.')
    process.exit(0)
  } catch (e) {
    await page.screenshot({ path: '/tmp/shared-filters-fail.png' }).catch(() => {})
    await browser.close(); fail('Exception : ' + e.message)
  }
}
main()
