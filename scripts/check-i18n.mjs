#!/usr/bin/env node
/**
 * Garde-fou de parité i18n.
 *
 * Le français (`fr`) fait référence (langue de repli de `t()`). Ce script
 * compare chaque locale à `fr` et signale :
 *   • les clés MANQUANTES   (afficheraient la clé brute si la langue est activée) ;
 *   • les clés EN TROP      (obsolètes, à nettoyer).
 *
 * Sort en code 1 si une clé manque (utilisable en pré-commit / CI).
 * Usage : node scripts/check-i18n.mjs
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const localesDir = resolve(here, '../src/i18n/locales')

const LANGS = ['fr', 'en', 'de', 'es', 'it']
const REF = 'fr'

const load = async (lang) => (await import(resolve(localesDir, `${lang}.js`))).default

const ref = await load(REF)
const refKeys = new Set(Object.keys(ref))

let missingTotal = 0
const report = []

for (const lang of LANGS) {
  if (lang === REF) continue
  const dict = await load(lang)
  const keys = new Set(Object.keys(dict))

  const missing = [...refKeys].filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !refKeys.has(k))

  missingTotal += missing.length
  report.push({ lang, missing, extra, count: keys.size })
}

console.log(`\n🌐 Parité i18n — référence « ${REF} » : ${refKeys.size} clés\n`)
for (const { lang, missing, extra, count } of report) {
  const status = missing.length === 0 ? '✅' : '❌'
  console.log(`${status} ${lang.toUpperCase()} — ${count} clés` +
    (missing.length ? ` · ${missing.length} manquante(s)` : '') +
    (extra.length ? ` · ${extra.length} en trop` : ''))
  if (missing.length) console.log(`   manquantes : ${missing.join(', ')}`)
  if (extra.length)   console.log(`   en trop    : ${extra.join(', ')}`)
}

if (missingTotal > 0) {
  console.log(`\n❌ ${missingTotal} clé(s) manquante(s) au total.\n`)
  process.exit(1)
}
console.log('\n✅ Toutes les langues couvrent les clés de référence.\n')
