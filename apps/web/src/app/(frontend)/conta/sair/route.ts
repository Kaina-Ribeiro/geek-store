import { NextResponse } from 'next/server'

import { logoutCookieName } from '../../../../lib/auth'
import { env } from '../../../../lib/env'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.redirect(new URL('/', env.siteUrl), 303)
  res.cookies.delete(await logoutCookieName())
  return res
}
