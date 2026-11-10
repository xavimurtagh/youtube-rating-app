import { describe, it, expect } from 'vitest'
import { normaliseQuery, startOfPacificDay } from '../lib/quota'

describe('normaliseQuery', () => {
  it('folds case and whitespace so equivalent searches share a cache entry', () => {
    expect(normaliseQuery('  Film   ESSAYS ')).toBe('film essays')
    expect(normaliseQuery('ｆｉｌｍ')).toBe('film')
  })
  it('caps the key length', () => {
    expect(normaliseQuery('a'.repeat(500))).toHaveLength(120)
  })
})

describe('startOfPacificDay', () => {
  it('returns midnight in Los Angeles during daylight time (UTC-7)', () => {
    const now = new Date('2026-07-15T15:30:00Z') // 08:30 in LA
    expect(startOfPacificDay(now).toISOString()).toBe('2026-07-15T07:00:00.000Z')
  })
  it('returns midnight in Los Angeles during standard time (UTC-8)', () => {
    const now = new Date('2026-11-09T05:00:00Z') // 21:00 on the 8th in LA
    expect(startOfPacificDay(now).toISOString()).toBe('2026-11-08T08:00:00.000Z')
  })
})

describe('pacificDayKey', () => {
  it('names the quota day in Los Angeles', async () => {
    const { pacificDayKey } = await import('../lib/quota')
    expect(pacificDayKey(new Date('2026-11-10T07:30:00Z'))).toBe('2026-11-09')
    expect(pacificDayKey(new Date('2026-11-10T08:30:00Z'))).toBe('2026-11-10')
  })
})
