import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rateLimit, rateLimitShared, hashKey, _resetRateLimits } from '../lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => _resetRateLimits())

  it('allows up to the limit then blocks within the window', () => {
    expect(rateLimit('k', 3, 1000, 0).ok).toBe(true)
    expect(rateLimit('k', 3, 1000, 0).ok).toBe(true)
    expect(rateLimit('k', 3, 1000, 0).ok).toBe(true)
    const fourth = rateLimit('k', 3, 1000, 0)
    expect(fourth.ok).toBe(false)
    expect(fourth.remaining).toBe(0)
  })

  it('keeps separate counters per key', () => {
    expect(rateLimit('a', 1, 1000, 0).ok).toBe(true)
    expect(rateLimit('b', 1, 1000, 0).ok).toBe(true)
    expect(rateLimit('a', 1, 1000, 0).ok).toBe(false)
  })

  it('resets after the window elapses', () => {
    expect(rateLimit('k', 1, 1000, 0).ok).toBe(true)
    expect(rateLimit('k', 1, 1000, 500).ok).toBe(false) // same window
    expect(rateLimit('k', 1, 1000, 1000).ok).toBe(true)  // window rolled over
  })

  it('reports remaining quota', () => {
    expect(rateLimit('k', 5, 1000, 0).remaining).toBe(4)
    expect(rateLimit('k', 5, 1000, 0).remaining).toBe(3)
  })
})

describe('rateLimitShared', () => {
  const env = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }
  beforeEach(() => _resetRateLimits())
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = env.url
    process.env.UPSTASH_REDIS_REST_TOKEN = env.token
    if (env.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL
    if (env.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('counts in memory when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const never = (async () => { throw new Error('should not be called') }) as any
    expect((await rateLimitShared('k', 1, 1000, 0, never)).ok).toBe(true)
    expect((await rateLimitShared('k', 1, 1000, 0, never)).ok).toBe(false)
  })

  it('counts in Redis, with a hashed key per clock-aligned window', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example/'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    const calls: any[] = []
    const fetcher = (async (url: string, init: any) => {
      calls.push({ url, auth: init.headers.Authorization, body: JSON.parse(init.body) })
      return { ok: true, json: async () => [{ result: 4 }, { result: 1 }] }
    }) as any

    const result = await rateLimitShared('rate:member-1', 3, 60_000, 125_000, fetcher)
    expect(result).toEqual({ ok: false, remaining: 0, resetAt: 180_000 })
    expect(calls[0].url).toBe('https://redis.example/pipeline')
    expect(calls[0].auth).toBe('Bearer tok')
    const key = `rl:${hashKey('rate:member-1')}:2`
    expect(calls[0].body).toEqual([
      ['INCR', key],
      ['PEXPIRE', key, '60000'],
    ])
    // The store never sees the member's id.
    expect(JSON.stringify(calls[0].body)).not.toContain('member-1')
  })

  it('falls back to memory if Redis fails, rather than letting everything through', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    const failing = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as any
    expect((await rateLimitShared('k', 1, 1000, 0, failing)).ok).toBe(true)
    expect((await rateLimitShared('k', 1, 1000, 0, failing)).ok).toBe(false)
  })
})
