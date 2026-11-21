import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Cross-site request protection for the API. Browsers send an Origin header
 * with every POST, PUT, PATCH and DELETE; if it names another site, refuse.
 * Sign-in (NextAuth has its own CSRF token) and the cron job (no browser) are
 * left alone.
 */
export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return NextResponse.next()

  const origin = req.headers.get('origin')
  if (origin) {
    let sameSite = false
    try {
      sameSite = new URL(origin).host === req.nextUrl.host
    } catch {
      sameSite = false
    }
    if (!sameSite) {
      return NextResponse.json({ error: 'Cross-site requests are not allowed' }, { status: 403 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/((?!auth/|cron/).*)'],
}
