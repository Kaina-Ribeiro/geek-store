import { defineConfig, devices } from '@playwright/test'

// End-to-end purchase flow in simulation mode (no Mercado Pago keys).
// Start the dev server first (pnpm dev, port 3100), then: pnpm --filter web e2e
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    // Uses the installed Google Chrome; run "npx playwright install chromium" to use the bundled one instead.
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    locale: 'pt-BR',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.E2E_CHANNEL ?? 'chrome' } },
    { name: 'celular', use: { ...devices['Pixel 7'], channel: process.env.E2E_CHANNEL ?? 'chrome' } },
  ],
})
