const { chromium } = require('playwright')
const fs = require('fs')

const OUT = '/tmp/abuverif'
fs.mkdirSync(OUT, { recursive: true })

const pages = [
  { path: '/hub',         name: 'hub' },
  { path: '/products',    name: 'products' },
  { path: '/co2-malus',   name: 'co2malus' },
  { path: '/price-watch', name: 'pricewatch' },
  { path: '/objections',  name: 'objections' },
  { path: '/pitch',       name: 'pitch' },
  { path: '/tco',         name: 'tco' },
  { path: '/compare',     name: 'compare' },
  { path: '/settings',    name: 'settings' },
  { path: '/chat',        name: 'chat' },
]

async function login(page) {
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('abu_session', JSON.stringify({ id: 1, username: 'admin', role: 'admin', name: 'Compte Démo' }))
  })
  await page.goto('http://localhost:4173/hub', { waitUntil: 'networkidle' })
}

;(async () => {
  const browser = await chromium.launch()
  const errors = []
  const findings = []

  for (const [label, vp] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile',  { width: 390,  height: 844 }],
  ]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })
    const page = await ctx.newPage()

    page.on('console', m => {
      if (m.type() === 'error') {
        const txt = m.text()
        // Ignore SSL cert errors for external fonts/CDN (expected in headless sandbox)
        if (txt.includes('ERR_CERT') || txt.includes('fonts.googleapis') || txt.includes('fonts.gstatic')) return
        errors.push(`[${label}] CONSOLE-ERR: ${txt.slice(0, 200)}`)
      }
    })
    page.on('pageerror', e => errors.push(`[${label}] PAGE-ERR: ${e.message.slice(0, 200)}`))

    await login(page)

    for (const theme of ['dark', 'light']) {
      for (const p of pages) {
        await page.goto('http://localhost:4173' + p.path, { waitUntil: 'networkidle' })
        await page.evaluate((t) => {
          localStorage.setItem('abu_u1_theme', t)
          if (t === 'light') document.documentElement.classList.add('light')
          else document.documentElement.classList.remove('light')
        }, theme)
        await page.waitForTimeout(400)

        // Overflow check
        const { sw, cw } = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }))
        if (sw > cw + 2) {
          const msg = `[${label}/${theme}] OVERFLOW ${p.name}: scrollWidth=${sw} > clientWidth=${cw}`
          errors.push(msg)
          findings.push(msg)
        }

        // Missing i18n — detect keys showing raw (pattern: snake_case long string visible)
        const bodyText = await page.evaluate(() => document.body.innerText)
        const rawKeys = bodyText.match(/\b[a-z]{2,}(?:_[a-z0-9]+){2,}\b/g) || []
        const suspiciousKeys = rawKeys.filter(k =>
          k.length > 8 &&
          !['font_size', 'font_weight', 'line_height', 'pointer_events'].includes(k) &&
          /^[a-z_]+$/.test(k)
        )
        if (suspiciousKeys.length > 0) {
          findings.push(`[${label}/${theme}] ${p.name} — suspicious raw keys: ${[...new Set(suspiciousKeys)].slice(0, 5).join(', ')}`)
        }

        await page.screenshot({
          path: `${OUT}/${label}-${theme}-${p.name}.png`,
          fullPage: false,
        })
      }
    }
    await ctx.close()
  }

  await browser.close()

  const report = [
    '=== ABUVERIF RAPPORT ===',
    `Pages auditées: ${pages.length} × 2 thèmes × 2 viewports = ${pages.length * 4} captures`,
    '',
    errors.length ? `ERREURS (${errors.length}):` : 'ERREURS: aucune',
    ...errors,
    '',
    findings.length ? `FINDINGS (${findings.length}):` : 'FINDINGS: aucun',
    ...findings,
    '',
    errors.length === 0 ? '✅ ABUVERIF — PASS' : '❌ ABUVERIF — FAIL',
  ].join('\n')

  fs.writeFileSync(`${OUT}/rapport.txt`, report)
  console.log(report)
})().catch(e => { console.error('ABUVERIF FATAL:', e.message); process.exit(1) })
