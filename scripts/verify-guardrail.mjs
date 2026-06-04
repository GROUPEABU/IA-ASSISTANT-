#!/usr/bin/env node
/**
 * Vérifie l'AGENT GARDE-FOU (2e passe) de la Veille Prix sur le BUILD PROD.
 *   - Appel 1 (/api/chat avec web_search) → rapport AVEC une violation
 *     (mentionne "malus" + revente ≈ prix neuf).
 *   - Appel 2 (/api/chat sans tools) → l'app envoie le prompt garde-fou ;
 *     on renvoie un rapport CORRIGÉ (sans malus).
 * On contrôle : badge garde-fou affiché, 2 appels, 2e prompt = charte
 * garde-fou + AUCUN tool web, rapport final = version corrigée.
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4344
const BASE = `http://localhost:${PORT}`
const watchdog = setTimeout(() => { console.error('❌ WATCHDOG timeout'); process.exit(3) }, 80000)

const REPORT_BAD = `## L'essentiel
- **Revente conseillée (1er du net)** : 34 900 € TTC (faible km)
- **Prix d'achat pro conseillé** : 25 633 € HT
- Le malus écologique est à la charge du client.

## Repères marché
| Prix moyen | Prix médian | Fourchette | Annonces |
|---|---|---|---|
| 35 000 € | 34 500 € | 33 000 - 37 000 € | ~12 |
`

const REPORT_FIXED = `## L'essentiel
- **Revente conseillée (1er du net)** : 24 000 - 25 200 € TTC
- **Prix d'achat pro conseillé** : 16 550 - 17 217 € HT
- **Marge dégageable** : 3 000 € HT à ce prix d'achat

## Repères marché
| Prix moyen | Prix médian | Fourchette | Annonces |
|---|---|---|---|
| 26 500 € | 26 000 € | 24 000 - 30 000 € | ~40 |

## Points de vigilance
- Pression des quasi-neufs.
`

function sse(text, withWebSearch) {
  const blocks = []
  let i = 0
  if (withWebSearch) {
    blocks.push({ type: 'content_block_start', index: i, content_block: { type: 'server_tool_use', name: 'web_search' } })
    blocks.push({ type: 'content_block_stop', index: i })
    i++
  }
  const events = [
    { type: 'message_start', message: { content: [] } },
    ...blocks,
    { type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: i, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: i },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    { type: 'message_stop' },
  ]
  return events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n'
}

const bodies = []

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' })
  const cleanup = () => { try { preview.kill('SIGKILL') } catch {} }
  const fail = (m) => { console.error('❌ ' + m); cleanup(); clearTimeout(watchdog); process.exit(1) }

  const deadline = Date.now() + 15000
  while (Date.now() < deadline) { try { if ((await fetch(BASE + '/')).ok) break } catch {} ; await sleep(400) }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(12000)

  await page.route('**/api/price-watch**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ sources: [{ name: 'La Centrale', url: 'https://lacentrale.fr' }], hasLiveData: false, fetchedAt: new Date().toISOString(), centraleUrl: 'https://lacentrale.fr', filters: {} }),
  }))

  let guardrailBadgeSeen = false
  await page.route('**/api/chat**', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    bodies.push(body)
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0
    if (bodies.length === 1) {
      // passe 1 : rapport avec violation, web search ON
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(REPORT_BAD, true) })
    } else {
      // passe 2 : garde-fou (pas de tools attendu) → rapport corrigé.
      // Latence simulée (~900ms) pour rendre le badge "Contrôle garde-fou" observable,
      // comme en conditions réelles (la 2e passe prend 3-6s).
      await sleep(900)
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(REPORT_FIXED, false) })
    }
  })

  try {
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[autocomplete="username"]', 'admin')
    await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/hub', { timeout: 8000 })
    await page.locator('button:has-text("Tout accepter")').first().click().catch(() => {})

    await page.goto(BASE + '/price-watch', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[aria-label="Marque"]')
    await page.fill('input[aria-label="Marque"]', 'Citroën')
    await page.fill('input[aria-label="Modèle"]', 'C5 Aircross')

    // observer le badge garde-fou pendant la 2e passe
    const badgePoll = (async () => {
      for (let k = 0; k < 300; k++) {
        if (await page.locator('text=/Contrôle garde-fou|Guardrail check/i').count() > 0) { guardrailBadgeSeen = true; return }
        await sleep(60)
      }
    })()

    await page.locator('button:has-text("Analyser les prix")').first().click()

    // attendre le rapport CORRIGÉ final — on scope au rapport (.report-md),
    // pas au body entier (le menu latéral contient "CO₂ & Malus").
    await page.waitForFunction(() => {
      const el = document.querySelector('.report-md')
      if (!el) return false
      const t = el.innerText
      return t.replace(/\s/g, '').includes('16550') && /17\s?217/.test(t) && !/malus/i.test(t)
    }, undefined, { timeout: 25000 })
    await badgePoll
    await sleep(300)

    const reportText = await page.locator('.report-md').innerText()
    const noMalus = !/malus/i.test(reportText)
    const hasFixed = reportText.replace(/\s/g, '').includes('16550')
    const twoCalls = bodies.length === 2
    const guardrailBody = bodies[1] || {}
    const guardrailPrompt = JSON.stringify(guardrailBody.messages || '')
    const isGuardrailPrompt = /CONTR[ÔO]LEUR QUALIT|CHARTE GARDE-FOU|garde-fou/i.test(guardrailPrompt)
    const guardrailNoTools = !(Array.isArray(guardrailBody.tools) && guardrailBody.tools.length > 0)
    const carriesBadReport = /34\s?900|25\s?633/.test(guardrailPrompt)  // le rapport à corriger est bien transmis

    await page.screenshot({ path: '/tmp/guardrail-final.png', fullPage: true })
    await browser.close(); cleanup(); clearTimeout(watchdog)

    console.log('\n========== VERIF AGENT GARDE-FOU ==========')
    console.log(`2 appels /api/chat                 : ${twoCalls ? 'OK' : 'KO'} (${bodies.length})`)
    console.log(`Badge garde-fou affiché            : ${guardrailBadgeSeen ? 'OK' : 'KO'}`)
    console.log(`2e prompt = charte garde-fou       : ${isGuardrailPrompt ? 'OK' : 'KO'}`)
    console.log(`2e passe SANS outil web            : ${guardrailNoTools ? 'OK' : 'KO'}`)
    console.log(`Rapport initial transmis au GF     : ${carriesBadReport ? 'OK' : 'KO'}`)
    console.log(`Rapport final = version corrigée   : ${hasFixed ? 'OK' : 'KO'}`)
    console.log(`Plus aucune mention "malus"        : ${noMalus ? 'OK' : 'KO'}`)
    console.log('Screenshot : /tmp/guardrail-final.png')
    console.log('===========================================\n')

    if (!twoCalls) fail('Le 2e appel (garde-fou) n\'a pas eu lieu')
    if (!guardrailBadgeSeen) fail('Badge garde-fou non affiché')
    if (!isGuardrailPrompt) fail('2e prompt n\'est pas la charte garde-fou')
    if (!guardrailNoTools) fail('La 2e passe a utilisé un outil web (ne devrait pas)')
    if (!carriesBadReport) fail('Le rapport initial n\'est pas transmis au garde-fou')
    if (!hasFixed) fail('Rapport final n\'est pas la version corrigée')
    if (!noMalus) fail('La mention "malus" subsiste après garde-fou')
    console.log('✅ AGENT GARDE-FOU OK — 2e passe déclenchée, charte transmise, sans web, rapport corrigé affiché.')
    process.exit(0)
  } catch (e) {
    await page.screenshot({ path: '/tmp/guardrail-fail.png' }).catch(() => {})
    await browser.close(); fail('Exception : ' + e.message)
  }
}
main()
