import { NextResponse, type NextRequest } from 'next/server'

import { consumeLoginLink } from '../../../../../lib/auth'
import { env } from '../../../../../lib/env'

export const dynamic = 'force-dynamic'

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/conta')

// Target of the e-mailed login link.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const cookie = await consumeLoginLink(sp.get('u') || '', sp.get('t') || '')
  if (!cookie) return NextResponse.redirect(new URL('/conta?erro=link', env.siteUrl))

  const res = NextResponse.redirect(new URL(safeNext(sp.get('next')), env.siteUrl))
  res.cookies.set(cookie.name, cookie.value || '', {
    httpOnly: true,
    path: cookie.path || '/',
    sameSite: 'lax',
    secure: env.siteUrl.startsWith('https://'),
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
  })
  return res
}
