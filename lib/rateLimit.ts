import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'

/**
 * Rate limits (fixed windows).
 *
 * With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, counts live in
 * Upstash Redis, so every server instance shares them and an attacker can't
 * get round a limit by landing on a fresh instance. Without them (local
 * development, tests), or whenever Redis can't be reached, each instance
 * counts in its own memory, which still curbs bursts and accidental loops.
 */

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

// ---------- this instance's memory --------------------------------------------

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = 0

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  // Occasionally evict expired buckets so the map can't grow unbounded.
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
    lastSweep = now
  }

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const ok = bucket.count <= limit
  return { ok, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt }
}

/** Test helper: clear all buckets. */
export function _resetRateLimits() {
  buckets.clear()
  lastSweep = 0
}

// ---------- shared: Upstash Redis ---------------------------------------------

function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

/** Keys are hashed, so the shared store never holds member ids or IP addresses. */
export function hashKey(key: string): string {
  return createHash('sha256').update(`${process.env.NEXTAUTH_SECRET || 'rl'}:${key}`).digest('base64url').slice(0, 32)
}

let lastWarning = 0

/**
 * One request against a limit shared by every instance. The window is aligned
 * to the clock, so the key changes when the window does and Redis only has to
 * count. Falls back to this instance's memory if Redis is missing or fails.
 */
export async function rateLimitShared(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
  fetcher: typeof fetch = fetch
): Promise<RateLimitResult> {
  const store = upstash()
  if (!store) return rateLimit(key, limit, windowMs, now)

  const window = Math.floor(now / windowMs)
  const redisKey = `rl:${hashKey(key)}:${window}`
  try {
    const res = await fetcher(`${store.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${store.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, String(windowMs)],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) throw new Error(`Upstash answered ${res.status}`)
    const replies = await res.json()
    const count = Number(Array.isArray(replies) ? replies[0]?.result : NaN)
    if (!Number.isFinite(count)) throw new Error('Upstash sent an unexpected reply')
    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt: (window + 1) * windowMs }
  } catch (error: any) {
    if (now - lastWarning > 60_000) {
      lastWarning = now
      console.error('Shared rate limits unavailable, counting in memory:', error?.message || error)
    }
    return rateLimit(key, limit, windowMs, now)
  }
}

// ---------- helpers for API routes ---------------------------------------------

/** Derive a client identifier from the request (proxy-aware). */
export function clientIp(req: NextApiRequest | { headers: any; socket?: any }): string {
  const fwd = req.headers['x-forwarded-for']
  const value = Array.isArray(fwd) ? fwd[0] : fwd
  return (value?.split(',')[0]?.trim()) || req.socket?.remoteAddress || 'unknown'
}

/**
 * Enforce a rate limit inside an API handler. Sets standard headers and, when
 * exceeded, responds 429 and resolves to false (the handler should then return).
 */
export async function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { id: string; limit: number; windowMs: number }
): Promise<boolean> {
  const result = await rateLimitShared(opts.id, opts.limit, opts.windowMs)
  res.setHeader('X-RateLimit-Limit', String(opts.limit))
  res.setHeader('X-RateLimit-Remaining', String(result.remaining))
  if (!result.ok) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))))
    res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' })
    return false
  }
  return true
}
