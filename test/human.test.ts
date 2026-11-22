import { describe, it, expect, afterEach } from 'vitest'
import { checkPass, hasPass, makePass, passCookie, verifyTurnstile, PASS_TTL_MS } from '../lib/human'

const KEY = 'test-secret'
const NOW = 1_800_000_000_000

describe('human-check passes', () => {
  it('accepts its own pass for the same purpose and subject', () => {
    const pass = makePass('rate', 'member-1', NOW, KEY)
    expect(checkPass(pass, 'rate', 'member-1', NOW + 1000, KEY)).toBe(true)
  })

  it('refuses another purpose, another member, or the wrong key', () => {
    const pass = makePass('rate', 'member-1', NOW, KEY)
    expect(checkPass(pass, 'signup', 'member-1', NOW, KEY)).toBe(false)
    expect(checkPass(pass, 'rate', 'member-2', NOW, KEY)).toBe(false)
    expect(checkPass(pass, 'rate', 'member-1', NOW, 'another-key')).toBe(false)
  })

  it('expires', () => {
    const pass = makePass('signup', '-', NOW, KEY)
    expect(checkPass(pass, 'signup', '-', NOW + PASS_TTL_MS.signup - 1, KEY)).toBe(true)
    expect(checkPass(pass, 'signup', '-', NOW + PASS_TTL_MS.signup + 1, KEY)).toBe(false)
  })

  it('refuses a pass with its expiry pushed back', () => {
    const [p, s, , sig] = makePass('rate', 'member-1', NOW, KEY).split('.')
    expect(checkPass(`${p}.${s}.${NOW + 10 * 864e5}.${sig}`, 'rate', 'member-1', NOW, KEY)).toBe(false)
  })

  it('refuses rubbish, and everything when no key is set', () => {
    expect(checkPass(undefined, 'rate', 'm', NOW, KEY)).toBe(false)
    expect(checkPass('a.b.c', 'rate', 'm', NOW, KEY)).toBe(false)
    expect(checkPass('x'.repeat(400), 'rate', 'm', NOW, KEY)).toBe(false)
    expect(checkPass(makePass('rate', 'm', NOW, ''), 'rate', 'm', NOW, '')).toBe(false)
  })

  it('reads the pass from its cookie', () => {
    const prev = process.env.NEXTAUTH_SECRET
    process.env.NEXTAUTH_SECRET = KEY
    try {
      const value = makePass('rate', 'member-1')
      expect(hasPass({ cookies: { human_rate: value } }, 'rate', 'member-1')).toBe(true)
      expect(hasPass({ cookies: { human_signup: value } }, 'rate', 'member-1')).toBe(false)
      expect(passCookie('rate', value)).toMatch(/^human_rate=.+; Path=\/; Max-Age=1800; HttpOnly; SameSite=Lax/)
    } finally {
      process.env.NEXTAUTH_SECRET = prev
    }
  })
})

describe('verifyTurnstile', () => {
  const prev = process.env.TURNSTILE_SECRET_KEY
  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = prev
  })

  it('asks Cloudflare, sending the token and the address', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'cf-secret'
    let sent: any = null
    const fetcher = (async (url: string, init: any) => {
      sent = { url, body: String(init.body) }
      return { json: async () => ({ success: true }) }
    }) as any
    expect(await verifyTurnstile('token-1', '203.0.113.5', fetcher)).toBe(true)
    expect(sent.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(sent.body).toContain('secret=cf-secret')
    expect(sent.body).toContain('response=token-1')
    expect(sent.body).toContain('remoteip=203.0.113.5')
  })

  it('says no when Cloudflare does, or when it cannot be reached', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'cf-secret'
    expect(await verifyTurnstile('t', undefined, (async () => ({ json: async () => ({ success: false }) })) as any)).toBe(false)
    expect(await verifyTurnstile('t', undefined, (async () => { throw new Error('down') }) as any)).toBe(false)
  })

  it('says no without a secret, a token, or with an absurd token', async () => {
    const never = (async () => { throw new Error('should not be called') }) as any
    delete process.env.TURNSTILE_SECRET_KEY
    expect(await verifyTurnstile('t', undefined, never)).toBe(false)
    process.env.TURNSTILE_SECRET_KEY = 'cf-secret'
    expect(await verifyTurnstile('', undefined, never)).toBe(false)
    expect(await verifyTurnstile('x'.repeat(3000), undefined, never)).toBe(false)
  })
})
