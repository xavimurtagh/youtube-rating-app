import { createHmac, timingSafeEqual } from 'crypto'

/**
 * "Are you a person?" checks, with Cloudflare Turnstile.
 *
 * Used when an account is created and when one member rates in a sudden
 * burst. The browser solves a Turnstile challenge (usually invisibly), we
 * verify the token with Cloudflare, then set a short-lived signed cookie, the
 * pass, that the protected step checks. With no Turnstile keys configured
 * (local development) the checks are off.
 */

export type HumanPurpose = 'signup' | 'rate'

/** How long a pass lasts. A sign-up pass only has to survive the trip to Google and back. */
export const PASS_TTL_MS: Record<HumanPurpose, number> = { signup: 10 * 60_000, rate: 30 * 60_000 }

const COOKIE: Record<HumanPurpose, string> = { signup: 'human_signup', rate: 'human_rate' }

export function turnstileEnabled(): boolean {
  return !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

/** A signed, expiring pass: "<purpose>.<subject>.<expires>.<signature>". */
export function makePass(purpose: HumanPurpose, subject: string, now: number = Date.now(), key: string = process.env.NEXTAUTH_SECRET || ''): string {
  const payload = `${purpose}.${subject}.${now + PASS_TTL_MS[purpose]}`
  return `${payload}.${sign(payload, key)}`
}

export function checkPass(
  value: unknown,
  purpose: HumanPurpose,
  subject: string,
  now: number = Date.now(),
  key: string = process.env.NEXTAUTH_SECRET || ''
): boolean {
  if (!key || typeof value !== 'string' || value.length > 300) return false
  const parts = value.split('.')
  if (parts.length !== 4) return false
  const [p, s, e, signature] = parts
  if (p !== purpose || s !== subject) return false
  const expires = Number(e)
  if (!Number.isFinite(expires) || expires < now) return false
  const expected = Buffer.from(sign(`${p}.${s}.${e}`, key))
  const given = Buffer.from(signature)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** Whether this request carries a valid pass. */
export function hasPass(req: { cookies?: Partial<Record<string, string>> }, purpose: HumanPurpose, subject: string): boolean {
  return checkPass(req.cookies?.[COOKIE[purpose]], purpose, subject)
}

/** The Set-Cookie value for a fresh pass. */
export function passCookie(purpose: HumanPurpose, value: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE[purpose]}=${value}; Path=/; Max-Age=${Math.floor(PASS_TTL_MS[purpose] / 1000)}; HttpOnly; SameSite=Lax${secure}`
}

/** Ask Cloudflare whether a Turnstile token is genuine. Tokens work once. */
export async function verifyTurnstile(token: unknown, ip?: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || typeof token !== 'string' || !token || token.length > 2048) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ip && ip !== 'unknown') body.set('remoteip', ip)
  try {
    const res = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return data?.success === true
  } catch (error: any) {
    console.error('Turnstile verification failed:', error?.message || error)
    return false
  }
}
