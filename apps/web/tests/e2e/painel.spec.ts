import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { expect, test, type Page } from '@playwright/test'

// Owner panel end to end, signed in with the seed accounts (staff on desktop, owner on the phone)
// (credentials read from apps/web/.env, never printed). Restores the banner
// and hides the game it creates, through the panel itself.
const here = path.dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  fs
    .readFileSync(path.resolve(here, '../../.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)
const COVER = path.resolve(here, '../../src/seed/covers/12.jpg')

// One account per browser project: two simultaneous logins of the same user
// race on Payload's session list and one of them gets signed out.
async function login(page: Page, volta: string, who: 'STAFF' | 'ADMIN') {
  await page.goto(`/painel/entrar?volta=${encodeURIComponent(volta)}`)
  await page.getByLabel('E-mail').fill(env[`SEED_${who}_EMAIL`])
  await page.getByLabel('Senha').fill(env[`SEED_${who}_PASSWORD`])
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(`**${volta}`)
}

// Desktop and phone run at the same time: when the other one published first,
// the panel asks whether to publish over it (the stale-draft guard) and we do.
async function publishBanner(page: Page) {
  await page.getByRole('button', { name: 'Publicar no site' }).click()
  const done = page.getByRole('button', { name: 'Publicado' })
  const over = page.getByRole('button', { name: 'Publicar o meu por cima' })
  await expect(done.or(over)).toBeVisible({ timeout: 20_000 })
  if (await over.isVisible()) await over.click()
  await expect(done).toBeVisible({ timeout: 20_000 })
}

test('painel: banner, jogo novo e pedidos', async ({ page }, info) => {
  test.setTimeout(120_000)
  await login(page, '/painel/banner', info.project.name === 'celular' ? 'ADMIN' : 'STAFF')

  // Banner: new title → publish → the home shows it.
  const title = page.getByLabel('Título grande')
  const original = await title.inputValue()
  await title.fill('Teste E2E')
  await expect(page.locator('.pn-pv-site .hero-title')).toContainText('Teste E2E', { ignoreCase: true })
  await publishBanner(page)
  await page.goto('/')
  await expect(page.locator('.hero-title')).toContainText('TESTE E2E', { ignoreCase: true })

  // New game: cover, PS2, 1 sealed ×2 and 1 Nota B at 99,90.
  const name = `E2E Painel ${info.project.name} ${Date.now().toString(36)}`
  await page.goto('/painel/jogos/novo')
  await page.locator('input[type=file]').first().setInputFiles(COVER)
  await expect(page.getByRole('button', { name: /Trocar foto/ }).first()).toBeVisible({ timeout: 20_000 })
  await page.locator('#pn-name').fill(name)
  await page.getByRole('group', { name: 'Plataforma' }).getByRole('button', { name: 'PS2', exact: true }).click()
  await page.locator('#pn-price-1').fill('99,90')
  await page.getByRole('button', { name: 'Mais uma' }).first().click()
  await page.getByRole('button', { name: 'Tenho outra cópia' }).click()
  await page.getByRole('group', { name: 'Estado da Cópia 2' }).getByRole('button', { name: 'Nota B' }).click()
  await page.locator('#pn-price-2').fill('99,90')
  await page.getByRole('button', { name: 'Publicar jogo' }).click()
  await page.waitForURL(/\/painel\/jogos\/\d+\?salvo=/, { timeout: 30_000 })
  const gameUrl = new URL(page.url()).pathname
  await page.goto(`/loja?q=${encodeURIComponent(name)}`)
  await expect(page.getByText(name).first()).toBeVisible()

  // Orders screen opens without errors.
  await page.goto('/painel/pedidos')
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible()

  // Clean up through the panel: hide the game, restore the banner title.
  await page.goto(gameUrl)
  await page.getByRole('button', { name: 'Esconder', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Esconder' }).click()
  await page.waitForURL(/salvo=/, { timeout: 30_000 })
  await page.goto('/painel/banner')
  await page.getByLabel('Título grande').fill(original === 'Teste E2E' ? 'Continue\nde onde você\nparou.' : original)
  await publishBanner(page)
})
