import { describe, it, expect, vi, beforeEach } from 'vitest'

// A tiny stand-in for the UsageCounter table: atomic increments by key.
const counts = new Map<string, number>()
vi.mock('../lib/prisma', () => ({
  prisma: {
    usageCounter: {
      upsert: async ({ where }: { where: { key: string } }) => {
        const count = (counts.get(where.key) || 0) + 1
        counts.set(where.key, count)
        return { key: where.key, count }
      },
    },
  },
}))

import { spend, spendLookup } from '../lib/budget'
import { LOOKUPS_PER_MEMBER_DAILY } from '../lib/quota'

describe('budgets', () => {
  beforeEach(() => counts.clear())

  it('spends until the limit, then refuses', async () => {
    expect(await spend('k', 2)).toBe(true)
    expect(await spend('k', 2)).toBe(true)
    expect(await spend('k', 2)).toBe(false)
  })

  it('gives each member a daily allowance of YouTube lookups', async () => {
    const day = new Date('2026-11-22T20:00:00Z')
    for (let i = 0; i < LOOKUPS_PER_MEMBER_DAILY; i++) expect(await spendLookup('m1', day)).toBe(true)
    expect(await spendLookup('m1', day)).toBe(false)
    // Someone else still has theirs, and the site-wide count moved for both.
    expect(await spendLookup('m2', day)).toBe(true)
    expect(counts.get('lookup:2026-11-22')).toBe(LOOKUPS_PER_MEMBER_DAILY + 1)
  })

  it('starts again on the next Pacific day', async () => {
    const late = new Date('2026-11-23T07:59:00Z') // 23:59 in Los Angeles
    const next = new Date('2026-11-23T08:01:00Z') // 00:01
    for (let i = 0; i < LOOKUPS_PER_MEMBER_DAILY; i++) await spendLookup('m1', late)
    expect(await spendLookup('m1', late)).toBe(false)
    expect(await spendLookup('m1', next)).toBe(true)
  })
})
