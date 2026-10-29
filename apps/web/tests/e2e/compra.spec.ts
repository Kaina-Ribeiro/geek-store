import { expect, test } from '@playwright/test'

// Example CPF from the check-digit algorithm (not a real person's document).
const CPF = '111.444.777-35'

test('compra com Pix simulado, do produto ao pedido pago', async ({ page }) => {
  await page.goto('/loja')
  const first = page.locator('.card a[href^="/jogo/"]').first()
  await first.click()
  await expect(page.locator('h1.pdp-title')).toBeVisible()

  await page.locator('.buybox .buy-cta, .buybar .btn').filter({ visible: true }).first().click()
  await expect(page.locator('.badge-count').first()).toHaveText(/\d+/)

  await page.goto('/checkout')
  await page.getByLabel('Nome completo').fill('Cliente Teste')
  await page.getByLabel('E-mail').fill(`e2e+${Date.now()}@example.com`)
  await page.getByLabel('CPF').fill(CPF)
  // Pickup in Taubaté is selected by default: no address needed.
  await expect(page.getByRole('radio', { name: /Retirar em Taubaté/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: /Pagar com Pix/ }).click()
  await expect(page).toHaveURL(/\/pedido\/\d+\?t=/)
  await expect(page.getByRole('heading', { name: 'Falta só o Pix' })).toBeVisible()
  await expect(page.getByAltText('QR Code do Pix')).toBeVisible()

  await page.getByRole('button', { name: 'Simular Pix pago' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
})

test('checkout bloqueia CPF inválido', async ({ page }) => {
  await page.goto('/loja')
  await page.locator('.card .cbtn').first().click()
  await page.goto('/checkout')
  await page.getByLabel('Nome completo').fill('Cliente Teste')
  await page.getByLabel('E-mail').fill('e2e@example.com')
  await page.getByLabel('CPF').fill('111.444.777-00')
  await page.getByRole('button', { name: /Pagar com Pix/ }).click()
  await expect(page.getByRole('alert')).toHaveText(/CPF/)
})

test('páginas de apoio abrem', async ({ page }) => {
  for (const path of ['/frete-e-prazos', '/trocas-e-devolucoes', '/termos', '/privacidade', '/rastreio', '/drop', '/conta']) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
  }
  const sitemap = await page.request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
})
