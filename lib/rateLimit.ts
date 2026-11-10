import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Best-effort in-memory rate limiter (fixed window).
 *
 * NOTE: serverless deployments run multiple isolated instances, so this limits
 * per-instance rather than globally. It still curbs bursts and accidental
 * loops. For strict global limits, back this with a shared store (e.g. Upstash
 * Redis) — the `rateLimit` signature is intentionally storage-agnostic.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = 0

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

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

/** Derive a client identifier from the request (proxy-aware). */
export function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for']
  const value = Array.isArray(fwd) ? fwd[0] : fwd
  return (value?.split(',')[0]?.trim()) || req.socket?.remoteAddress || 'unknown'
}

/**
 * Enforce a rate limit inside an API handler. Sets standard headers and, when
 * exceeded, responds 429 and returns false (the handler should then return).
 */
export function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { id: string; limit: number; windowMs: number }
): boolean {
  const result = rateLimit(opts.id, opts.limit, opts.windowMs)
  res.setHeader('X-RateLimit-Limit', String(opts.limit))
  res.setHeader('X-RateLimit-Remaining', String(result.remaining))
  if (!result.ok) {
    res.setHeader('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)))
    res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' })
    return false
  }
  return true
}
