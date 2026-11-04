'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generatePayloadCookie } from 'payload'

import { env } from '../../../lib/env'
import type { GameDraft } from '../../../lib/painel/game-form'
import { saveGame, type SaveGameResult } from '../../../lib/painel/game-store'
import type { HeroDraft } from '../../../lib/painel/hero'
import { moveOrder } from '../../../lib/painel/order-store'
import { publishHero, searchGamesForHero, type PickGame, type PublishResult } from '../../../lib/painel/hero-store'
import { saveImage, type SaveImageResult } from '../../../lib/painel/media'
import { getStaffUser } from '../../../lib/painel/session'
import { safeReturn } from '../../../lib/painel/paths'
import { getClient } from '../../../lib/payload'
import { limited } from '../../../lib/rate-limit'

// Server actions of the owner panel. They stay thin: the work (and the access
// rules, via user + overrideAccess: false) lives in lib/painel/*.

export type LoginState = { ok: boolean; error?: string; email?: string }

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const over = await limited('login')
  if (over) return { ok: false, error: over.error, email: String(form.get('email') || '') }

  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')
  if (!email || !password) return { ok: false, error: 'Preencha o e-mail e a senha.', email }

  const payload = await getClient()
  let token: string | undefined
  try {
    token = (await payload.login({ collection: 'users', data: { email, password } })).token
  } catch (err) {
    const name = (err as { name?: string })?.name
    if (name === 'LockedAuth') return { ok: false, error: 'Muitas tentativas. Espere 15 minutos.', email }
    return { ok: false, error: 'E-mail ou senha errados.', email }
  }
  if (!token) return { ok: false, error: 'E-mail ou senha errados.', email }

  const cookie = generatePayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  })
  ;(await cookies()).set(cookie.name, cookie.value || '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: env.siteUrl.startsWith('https://'),
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
  })
  redirect(safeReturn(String(form.get('volta') || '')))
}

export async function logoutAction(): Promise<void> {
  const payload = await getClient()
  ;(await cookies()).delete(`${payload.config.cookiePrefix}-token`)
  redirect('/painel/entrar')
}

// ------------------------------------------------------------------ banner

export async function publishHeroAction(draft: HeroDraft, basedOn: string, force = false): Promise<PublishResult> {
  return publishHero(await getClient(), await getStaffUser(), draft, basedOn, force)
}

export async function uploadImageAction(form: FormData): Promise<SaveImageResult> {
  const file = form.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'Escolha uma foto.' }
  return saveImage(await getClient(), await getStaffUser(), file, String(form.get('alt') || ''))
}

export async function searchGamesAction(q: string): Promise<PickGame[]> {
  const user = await getStaffUser()
  if (!user) return []
  return searchGamesForHero(await getClient(), user, q)
}

// ------------------------------------------------------------------ jogos

export async function saveGameAction(draft: GameDraft): Promise<SaveGameResult> {
  return saveGame(await getClient(), await getStaffUser(), draft)
}

// ------------------------------------------------------------------ pedidos

export async function moveOrderAction(id: number, from: string, trackingCode?: string) {
  return moveOrder(await getClient(), await getStaffUser(), id, from, trackingCode)
}
