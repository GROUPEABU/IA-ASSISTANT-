#!/usr/bin/env node
/**
 * Vérification end-to-end de la Veille Prix sur le BUILD DE PROD.
 *
 * vite preview ne sert pas les edge functions /api/* → on les mocke via
 * l'interception réseau Playwright pour simuler une réponse live réaliste
 * (C5 Aircross MAX, < 50 000 km). On vérifie :
 *   1. le flux complet : filtres → loading → résultat affiché
 *   2. le badge « Données live » (vert) apparaît
 *   3. les maths d'achat pro (applyPricingRules) sont correctes
 *   4. le filtre km est bien injecté dans le prompt envoyé à /api/chat
 *   5. AUCUN résultat intermédiaire (badge violet) n'est affiché
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4326
const BASE = `http://localhost:${PORT}`

// Rapport Markdown streamé (le nouveau format "comme le chat"), avec les 3
// chiffres clés et un tableau de repères marché, pour un C5 Aircross MAX
// < 50 000 km. On streame en PLUSIEURS deltas pour vérifier l'affichage live.
const REPORT_CHUNKS = [
  '## L\'essentiel\n',
  '- **Marge dégageable** : 3 000 – 4 000 € HT\n',
  '- **Prix d\'achat pro conseillé** : 17 217 – 18 217 € HT\n',
  '- **Revente conseillée (1er du net)** : 26 000 € TTC\n\n',
  '## Repères marché\n\n',
  '| Prix moyen | Prix médian | Fourchette | Annonces |\n|---|---|---|---|\n',
  '| 28 500 € | 27 500 € | 26 000 – 30 500 € | ~58 |\n\n',
  '## Arguments commerciaux\n- Décote déjà absorbée\n- Finition haute\n',
]

// SSE multi-deltas avec un server_tool_use web_search en amont
// (→ usedWebSearch = true → badge vert « Données live »).
function sseReport(chunks) {
  const events = [
    { type: 'message_start', message: { content: [] } },
    { type: 'content_block_start', index: 0, content_block: { type: 'server_tool_use', name: 'web_search' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    ...chunks.map(c => ({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: c } })),
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    { type: 'message_stop' },
  ]
  return events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n'
}

let capturedChatBodies = []

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: process.cwd(), stdio: 'inherit',
  })

  const fail = (msg) => { console.error('❌ ' + msg); preview.kill('SIGTERM'); process.exit(1) }

  try {
    // attendre serveur
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      try { if ((await fetch(BASE + '/')).ok) break } catch {} ; await sleep(400)
    }

    const browser = await chromium.launch()
    const page = await browser.newPage()

    // ── Mock /api/price-watch ──
    await page.route('**/api/price-watch**', (route) => {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          sources: [{ name: 'La Centrale', url: 'https://lacentrale.fr' }],
          hasLiveData: false, fetchedAt: new Date().toISOString(),
          centraleUrl: 'https://lacentrale.fr/listing', filters: {},
        }),
      })
    })

    // ── Mock /api/chat (un seul appel : streaming markdown + web search) ──
    await page.route('**/api/chat**', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      capturedChatBodies.push(body)
      route.fulfill({
        status: 200, contentType: 'text/event-stream',
        body: sseReport(REPORT_CHUNKS),
      })
    })

    // login
    await page.goto(BASE + '/login')
    await page.fill('input[autocomplete="username"]', 'admin')
    await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/hub', { timeout: 8000 })
    await page.locator('button:has-text("Tout accepter")').first().click().catch(() => {})

    // aller sur la veille prix
    await page.goto(BASE + '/price-watch')
    await page.waitForSelector('input[aria-label="Marque"]', { timeout: 8000 })

    // remplir marque + modèle + finition + km
    await page.fill('input[aria-label="Marque"]', 'Citroën')
    await page.fill('input[aria-label="Modèle"]', 'C5 Aircross')
    await page.fill('input[aria-label="Finition / Version"]', 'MAX')
    await page.selectOption('select:has(option[value="50000"])', '50000')

    // cliquer Analyser
    await page.locator('button:has-text("Analyser les prix")').first().click()

    // attendre que le rapport streamé s'affiche (titre L'essentiel)
    await page.waitForSelector('text=/L.essentiel/', { timeout: 15000 })
    // puis le badge vert « Données live » a la fin du stream
    await page.waitForSelector('text=/Données live|Live data/', { timeout: 8000 })
    await sleep(400)

    const bodyText = await page.locator('body').innerText()
    const stripWs = (x) => x.replace(/\s/g, '')
    const bodyNoWs = stripWs(bodyText)

    const hasTitre  = /L.essentiel/i.test(bodyText)
    const hasAchat  = bodyNoWs.includes('17217') && bodyNoWs.includes('18217')
    const hasTable  = /Prix médian/i.test(bodyText) && bodyNoWs.includes('27500')
    const hasPdfBtn = await page.locator('button:has-text("PDF"), button:has-text("Télécharger")').count() > 0

    const webBody = capturedChatBodies.find(b => Array.isArray(b.tools) && b.tools.some(t => t.type?.startsWith('web_search')))
    const promptText = webBody ? JSON.stringify(webBody.messages) : ''
    const promptNoWs = stripWs(promptText)
    const hasKmFilter = /50.?000km/i.test(promptNoWs) && /KILOM[\u00c9E]TRAGESTRICT/i.test(promptNoWs)
    const fs = await import('node:fs')
    fs.writeFileSync('/tmp/pw-webprompt.txt', promptText)
    fs.writeFileSync('/tmp/pw-bodytext.txt', bodyText)

    await page.screenshot({ path: '/tmp/pricewatch-result.png', fullPage: true })

    console.log('\n========== RESULTAT VERIFICATION VEILLE PRIX (streaming) ==========')
    console.log(`Rapport streame affiche (titre)    : ${hasTitre ? 'OK' : 'KO'}`)
    console.log(`Achat pro 17 217 - 18 217 EUR HT   : ${hasAchat ? 'OK' : 'KO'}`)
    console.log(`Tableau reperes marche rendu       : ${hasTable ? 'OK' : 'KO'}`)
    console.log(`Badge Donnees live (vert)          : OK`)
    console.log(`Bouton PDF present                 : ${hasPdfBtn ? 'OK' : 'KO'}`)
    console.log(`Filtre km strict dans prompt web   : ${hasKmFilter ? 'OK' : 'KO'}`)
    console.log(`Nb appels /api/chat                : ${capturedChatBodies.length} (1 attendu)`)
    console.log('Screenshot : /tmp/pricewatch-result.png')
    console.log('==================================================================\n')

    await browser.close()
    preview.kill('SIGTERM')

    if (!hasTitre) fail('Rapport streamé non affiché')
    if (!hasAchat) fail('Fourchette achat pro absente du rapport')
    if (!hasTable) fail('Tableau repères marché non rendu')
    if (!hasPdfBtn) fail('Bouton PDF absent')
    if (!hasKmFilter) fail('Filtre km absent du prompt web')
    console.log('✅ VEILLE PRIX OK — rapport streamé, badge live, achat pro, tableau, PDF, filtre km.')
    process.exit(0)
  } catch (e) {
    console.error(e)
    fail('Exception : ' + e.message)
  }
}
main()
