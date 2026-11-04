import { NextResponse, type NextRequest } from 'next/server'

// Panel pages read the current path from this header to send a signed-out
// person to the login and back to the same page afterwards.
export function proxy(req: NextRequest) {
  const h = new Headers(req.headers)
  h.set('x-pathname', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.next({ request: { headers: h } })
}

export const config = { matcher: ['/painel', '/painel/:path*'] }
