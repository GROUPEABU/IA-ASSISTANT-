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

const PORT = 4296
const BASE = `http://localhost:${PORT}`

// Réponse veilleprix réaliste : premier du net 26 000 TTC pour un C5 Aircross
// MAX < 50 000 km. Achat pro attendu = round(26000/1.2) - 450 - 3000 = 18 217.
const VENTE_TTC = 26000
const FAKE_VEILLE = {
  prix_moyen: 28500, prix_median: 27500, prix_q1: 26000, prix_q3: 30500,
  nb_annonces_estim: 58, tendance: 'baisse', tendance_pct: 3.2,
  prix_neuf_catalogue: 42800, decote_annuelle_pct: 14,
  valeur_residuelle_1an: 24000, valeur_residuelle_3ans: 18500,
  fourchette_achat_pro_min: 99999, fourchette_achat_pro_max: 99999, // doit être ÉCRASÉ par applyPricingRules
  malus_estime: 0, marge_brute_potentielle: 99999,
  prix_meilleur_marche: 26000, prix_conseille_vente: VENTE_TTC,
  cote_argus_min: 24500, cote_argus_max: 29000, alerte: null,
  analyse: 'Marché en léger repli, bonne liquidité sur cette finition.',
  conseil_achat: 'Privilégier les unités < 50 000 km bien équipées.',
  conseil_vente: 'Se positionner à 26 000 € TTC pour être 1er du net.',
  equipements_recherches: ['GPS', 'Caméra', 'Toit pano', 'Sièges chauffants'],
  arguments_commerciaux: ['Décote déjà absorbée', 'Finition haute', 'Hybride sobre'],
  points_vigilance: ['Vérifier carnet', 'Pneus', 'Batterie hybride'],
  annonces_par_source: [{ source: 'La Centrale', prix_min: 26000, prix_moy: 28500, prix_max: 32000, nb: 30 }],
}

// SSE qui émet la réponse JSON en un bloc texte, avec un server_tool_use
// web_search en amont (→ usedWebSearch = true → badge vert « Données live »).
function sseFor(jsonObj) {
  const txt = JSON.stringify(jsonObj)
  const events = [
    { type: 'message_start', message: { content: [] } },
    { type: 'content_block_start', index: 0, content_block: { type: 'server_tool_use', name: 'web_search' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: txt } },
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

    // ── Mock /api/chat (Phase 1 sans web + Phase 2 avec web) ──
    await page.route('**/api/chat**', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      capturedChatBodies.push(body)
      const isWebSearch = Array.isArray(body.tools) && body.tools.some(t => t.type?.startsWith('web_search'))
      // Phase 2 (web) : badge vert. Phase 1 (sans web) : on renvoie aussi un JSON
      // mais on s'attend à ce qu'il ne soit PAS affiché (pas de badge violet).
      route.fulfill({
        status: 200, contentType: 'text/event-stream',
        body: sseFor(isWebSearch ? FAKE_VEILLE : { ...FAKE_VEILLE, prix_conseille_vente: 31000 }),
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

    // attendre le résultat (badge "Données live")
    await page.waitForSelector('text=/Données live|Live data/', { timeout: 15000 })
    await sleep(600)

    // ── Vérif 1 : badge violet (estimation hors-ligne) NE doit PAS apparaître ──
    const violetCount = await page.locator('text=/Expertise IA · données marché|AI expertise/').count()

    // ── Vérif 2 : prix d'achat pro affiché ──
    const bodyText = await page.locator('body').innerText()

    // ── Vérif 3 : maths attendues ──
    const venteHT = Math.round(VENTE_TTC / 1.2)
    const achatMax = venteHT - 450 - 3000      // 18 217
    const achatMin = achatMax - 1000           // 17 217
    const fmt = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

    // ── Vérif 4 : km filter dans le prompt web ──
    const webBody = capturedChatBodies.find(b => Array.isArray(b.tools) && b.tools.some(t => t.type?.startsWith('web_search')))
    const promptText = webBody ? JSON.stringify(webBody.messages) : ''
    const stripWs = (s) => s.replace(/\s/g, '')
    const promptNoWs = stripWs(promptText)
    const hasKmFilter = /50.?000km/i.test(promptNoWs) && /KILOM[ÉE]TRAGESTRICT/i.test(promptNoWs)
    const fs = await import('node:fs')
    fs.writeFileSync('/tmp/pw-webprompt.txt', promptText)
    fs.writeFileSync('/tmp/pw-bodytext.txt', bodyText)

    await page.screenshot({ path: '/tmp/pricewatch-result.png', fullPage: true })

    // ── RAPPORT ──
    console.log('\n══════════ RÉSULTAT VÉRIFICATION VEILLE PRIX ══════════')
    console.log(`Phase 2 (web) prix conseillé vente : ${VENTE_TTC} € TTC`)
    console.log(`Achat pro attendu (maths)          : ${fmt(achatMin)} – ${fmt(achatMax)} € HT`)
    const achatOk = stripWs(bodyText).includes(stripWs(fmt(achatMax))) && stripWs(bodyText).includes(stripWs(fmt(achatMin)))
    console.log(`  → fourchette affichée trouvée ?  : ${achatOk ? '✅' : '❌'}`)
    console.log(`Badge "Données live" (vert)        : ✅ (attendu pour déclencher la suite)`)
    console.log(`Badge violet hors-ligne affiché ?  : ${violetCount === 0 ? '✅ non (correct)' : '❌ OUI (' + violetCount + ')'}`)
    console.log(`Filtre km strict dans prompt web ? : ${hasKmFilter ? '✅' : '❌'}`)
    console.log(`Nb d'appels /api/chat              : ${capturedChatBodies.length} (Phase1 + Phase2 attendus)`)
    console.log('Screenshot : /tmp/pricewatch-result.png')
    console.log('═══════════════════════════════════════════════════════\n')

    await browser.close()
    preview.kill('SIGTERM')

    if (!achatOk) fail('Fourchette achat pro incorrecte ou absente')
    if (violetCount !== 0) fail('Badge violet hors-ligne affiché (Phase 1 ne doit pas s\'afficher)')
    if (!hasKmFilter) fail('Filtre km absent du prompt web')
    console.log('✅ VEILLE PRIX OK — flux complet, badge live, maths achat pro, filtre km.')
    process.exit(0)
  } catch (e) {
    console.error(e)
    fail('Exception : ' + e.message)
  }
}
main()
