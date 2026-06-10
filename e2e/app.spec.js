import { test, expect } from '@playwright/test'

/**
 * Parcours critiques (sans IA — aucun appel API externe) :
 * authentification, Hub, palette de commandes, pages publiques.
 *
 * Les mots de passe réels n'existent qu'en hash : les tests authentifiés
 * injectent directement une session (même mécanisme que AuthContext).
 */
const SESSION = { id: 3, username: 'demo@autobuyunion.eu', name: 'Compte Démo', role: 'membre', initials: 'DM' }

async function withSession(page) {
  await page.addInitScript((session) => {
    localStorage.setItem('abu_session', JSON.stringify(session))
  }, SESSION)
}

test('login invalide affiche une erreur et reste sur /login', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[autocomplete="username"]').fill('demo@autobuyunion.eu')
  await page.locator('input[autocomplete="current-password"]').fill('mauvais-mot-de-passe')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
  await expect(page).toHaveURL(/\/login/)
})

test('session valide accède au Hub avec les 9 outils', async ({ page }) => {
  await withSession(page)
  await page.goto('/hub')
  await expect(page).toHaveURL(/\/hub/)
  // La grille d'outils du Hub contient exactement 9 cartes-boutons.
  const cards = page.locator('.grid > button.glass-card')
  await expect(cards).toHaveCount(9, { timeout: 10000 })
})

test('palette de commandes (Ctrl+K) navigue vers un outil', async ({ page }) => {
  await withSession(page)
  await page.goto('/hub')
  await page.keyboard.press('Control+k')
  const paletteInput = page.getByRole('dialog').locator('input')
  await expect(paletteInput).toBeVisible()
  await paletteInput.fill('tco')
  await paletteInput.press('Enter')
  await expect(page).toHaveURL(/\/tco/)
})

test('routes protégées redirigent vers /login sans session', async ({ page }) => {
  await page.goto('/price-watch')
  await expect(page).toHaveURL(/\/login/)
})

test('pages légales publiques accessibles sans login', async ({ page }) => {
  await page.goto('/mentions-legales')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})
