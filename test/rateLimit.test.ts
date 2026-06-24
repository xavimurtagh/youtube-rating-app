import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, _resetRateLimits } from '../lib/rateLimit'

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
