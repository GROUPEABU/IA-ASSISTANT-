#!/usr/bin/env node
/**
 * Agent de vérification — barre de progression IA (AIProgress).
 *
 * POURQUOI CE SCRIPT EXISTE
 * -------------------------
 * La barre linéaire d'AIProgress a régressé plusieurs fois : la largeur rendue
 * se figeait alors que l'anneau (%) montait correctement. Cause historique : une
 * transition CSS `transition-[width]` qui redémarrait à chaque frame de la boucle
 * requestAnimationFrame et n'aboutissait jamais → barre gelée.
 *
 * Ce bug ne se voyait QUE sur le build de PRODUCTION dans une vraie page. Ce
 * script reproduit donc exactement ces conditions :
 *   1. build de production (vite build, exécuté en amont par `npm run verify:aiprogress`)
 *   2. service via `vite preview`
 *   3. pilotage des vraies pages (Objections, Pitch) avec l'API IA mockée pour
 *      figer l'état de chargement
 *   4. mesure au pixel : numéro de l'anneau vs largeur réellement rendue de la barre
 *
 * CRITÈRES (échec = exit 1)
 *   • la barre doit BOUGER (pas figée sur sa valeur initiale)
 *   • |anneau% − barre rendue%| ≤ TOLERANCE à chaque échantillon
 *
 * Usage : npm run verify:aiprogress   (build + preview + test, tout-en-un)
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4199
const BASE = `http://localhost:${PORT}`
const TOLERANCE = 4 // points de % d'écart toléré anneau vs barre
const SAMPLES = 5
const SAMPLE_INTERVAL = 1400

// Pages testées : chacune monte AIProgress (anneau + barre) pendant le chargement.
// trigger = remplir le 1er champ texte puis cliquer le bouton de génération.
const PAGES = [
  { name: 'Objections', path: '/objections', btn: /Génér/i },
  { name: 'Pitch',      path: '/pitch',      btn: /Génér/i },
]

function startPreview() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    stdio: 'pipe', detached: false,
  })
  return proc
}

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/')
      if (res.ok) return true
    } catch { /* pas encore prêt */ }
    await sleep(400)
  }
  throw new Error(`Preview server non joignable sur ${BASE} après ${timeoutMs}ms`)
}

async function login(page) {
  await page.goto(BASE + '/login')
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', 'autobuyunion2025')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/hub', { timeout: 8000 })
  // Ferme la bannière cookies si présente
  await page.locator('button:has-text("Tout accepter")').first().click().catch(() => {})
  await sleep(300)
}

/**
 * Mesure à l'instant courant :
 *   • ring    — le NUMÉRO affiché (état direct, toujours juste)
 *   • arcPct  — le remplissage RÉEL de l'arc du cercle, calculé depuis le
 *               stroke-dashoffset effectivement rendu (détecte un arc gelé)
 *   • barPct  — la largeur RÉELLE de la barre rapportée à sa piste
 */
async function measure(page) {
  return page.evaluate(() => {
    const numEl = document.querySelector('span.tabular-nums')
    const ring = numEl ? parseInt(numEl.textContent.replace('%', ''), 10) : null

    // L'arc de progression est LE cercle qui porte un stroke-dashoffset (la page
    // contient d'autres <circle> : icônes, etc.). On lit l'attribut rendu (sans
    // transition CSS, l'attribut EST la valeur affichée) + la durée de transition.
    let arcPct = null, arcTransDur = '0s', arcTransProp = ''
    const arc = [...document.querySelectorAll('svg circle')].find(
      (c) => c.getAttribute('stroke-dashoffset') != null && c.getAttribute('stroke-linecap') === 'round',
    )
    if (arc) {
      const dash = parseFloat(arc.getAttribute('stroke-dasharray')) || (2 * Math.PI * 28)
      const off = parseFloat(arc.getAttribute('stroke-dashoffset'))
      if (!Number.isNaN(off)) arcPct = Math.round((1 - off / dash) * 100)
      const cs = getComputedStyle(arc)
      arcTransDur = cs.transitionDuration; arcTransProp = cs.transitionProperty
    }

    const track = [...document.querySelectorAll('div')].find(
      (d) => /h-2/.test(d.className) && /rounded-full/.test(d.className) && d.firstElementChild,
    )
    let barPct = null, barTransDur = '0s', barTransProp = ''
    if (track) {
      const fill = track.firstElementChild
      const tw = track.getBoundingClientRect().width
      const fw = fill.getBoundingClientRect().width
      barPct = tw ? Math.round((fw / tw) * 100) : null
      const cs = getComputedStyle(fill)
      barTransDur = cs.transitionDuration; barTransProp = cs.transitionProperty
    }
    return { ring, arcPct, barPct, arcTransDur, arcTransProp, barTransDur, barTransProp }
  })
}

async function testPage(page, { name, path, btn }) {
  // API IA mockée : ne répond jamais → l'état de chargement (et donc AIProgress) persiste.
  await page.route('**/api/chat', async () => { await sleep(60000) })

  await page.goto(BASE + path)
  await sleep(500)
  await page.locator('input[type="text"]').first().fill('Citroën C5 Aircross')
  await sleep(150)
  await page.locator('button', { hasText: btn }).first().click()

  const series = []
  for (let i = 0; i < SAMPLES; i++) {
    await sleep(SAMPLE_INTERVAL)
    series.push(await measure(page))
  }
  await page.unroute('**/api/chat')

  // Analyse — l'arc ET la barre doivent bouger et suivre le numéro.
  const fails = []
  const uniq = (arr) => new Set(arr.filter((v) => v != null)).size

  const arcValues = series.map((s) => s.arcPct)
  const barValues = series.map((s) => s.barPct)
  if (uniq(arcValues) <= 1) fails.push(`ARC du cercle FIGÉ (valeurs: ${arcValues.join(', ')})`)
  if (uniq(barValues) <= 1) fails.push(`BARRE FIGÉE (valeurs: ${barValues.join(', ')})`)

  // Garde-fou RACINE : une transition CSS ACTIVE (durée > 0) sur width /
  // stroke-dashoffset, combinée à la boucle rAF, fige le rendu. transition-property
  // vaut "all" par défaut → seule la DURÉE distingue une vraie transition.
  const last = series[series.length - 1] || {}
  const active = (dur) => dur && dur !== '0s' && parseFloat(dur) > 0
  if (active(last.arcTransDur) && /stroke-dashoffset|\ball\b/.test(last.arcTransProp || '')) {
    fails.push(`transition CSS active sur l'arc (${last.arcTransProp} ${last.arcTransDur}) — fige le rendu`)
  }
  if (active(last.barTransDur) && /\bwidth\b|\ball\b/.test(last.barTransProp || '')) {
    fails.push(`transition CSS active sur la barre (${last.barTransProp} ${last.barTransDur}) — fige le rendu`)
  }

  for (const s of series) {
    if (s.ring == null) { fails.push('numéro anneau introuvable'); break }
    if (s.arcPct == null) { fails.push('arc du cercle introuvable'); break }
    if (s.barPct == null) { fails.push('barre introuvable'); break }
    if (Math.abs(s.ring - s.arcPct) > TOLERANCE) fails.push(`arc désynchro : numéro=${s.ring}% arc=${s.arcPct}%`)
    if (Math.abs(s.ring - s.barPct) > TOLERANCE) fails.push(`barre désynchro : numéro=${s.ring}% barre=${s.barPct}%`)
  }

  const line = series.map((s) => `${s.ring}%(arc${s.arcPct}/bar${s.barPct})`).join(' ')
  if (fails.length) {
    console.log(`❌ ${name.padEnd(12)} ${line}`)
    ;[...new Set(fails)].forEach((f) => console.log(`     ↳ ${f}`))
    return false
  }
  console.log(`✅ ${name.padEnd(12)} ${line}`)
  return true
}

let preview
try {
  console.log('\n🔎 Vérification AIProgress (build de production réel)\n')
  preview = startPreview()
  await waitForServer()

  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await login(page)

  let allOk = true
  for (const cfg of PAGES) {
    const ok = await testPage(page, cfg)
    allOk = allOk && ok
  }
  await browser.close()

  if (!allOk) {
    console.log('\n❌ ÉCHEC : la barre AIProgress ne suit pas le pourcentage.\n')
    process.exitCode = 1
  } else {
    console.log('\n✅ OK : barre et anneau synchronisés sur toutes les pages.\n')
  }
} catch (err) {
  console.error('\n💥 Erreur de vérification :', err.message, '\n')
  process.exitCode = 1
} finally {
  if (preview) preview.kill('SIGTERM')
}
