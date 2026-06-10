import { defineConfig } from '@playwright/test'

/**
 * Tests E2E — parcours critiques sans IA (déterministes, sans clé API) :
 * login, navigation Hub, palette de commandes, pages publiques.
 *
 * `npm run test:e2e` construit le bundle puis sert `dist/` via vite preview.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
