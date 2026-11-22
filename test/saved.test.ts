import { describe, it, expect } from 'vitest'
import { bestFit, filterSaved, inLength, likelyScore, sortSaved, type SavedItem } from '../lib/saved'

const item = (id: string, minutes: number | null, extra: Partial<SavedItem> = {}): SavedItem => ({
  id,
  title: id,
  channel: '',
  seconds: minutes == null ? null : minutes * 60,
  savedAt: '2026-11-01T00:00:00Z',
  moods: [],
  likely: null,
  friends: [],
  ...extra,
})

describe('inLength', () => {
  it('puts lengths in their bands, edges going up', () => {
    expect(inLength(9 * 60 + 59, 'under-10')).toBe(true)
    expect(inLength(10 * 60, 'under-10')).toBe(false)
    expect(inLength(10 * 60, '10-20')).toBe(true)
    expect(inLength(45 * 60, '45-plus')).toBe(true)
  })
  it('leaves unknown lengths out of every band, but in "any"', () => {
    expect(inLength(null, '10-20')).toBe(false)
    expect(inLength(null, null)).toBe(true)
  })
})

describe('filterSaved', () => {
  const list = [
    item('calm-short', 8, { moods: [{ mood: 'calming', share: 0.7 }] }),
    item('calm-long', 50, { moods: [{ mood: 'calming', share: 0.6 }] }),
    item('funny-short', 6, { moods: [{ mood: 'funny', share: 0.8 }] }),
  ]
  it('filters by length and mood together', () => {
    expect(filterSaved(list, { length: 'under-10', mood: 'calming' }).map((v) => v.id)).toEqual(['calm-short'])
    expect(filterSaved(list, { mood: 'calming' }).map((v) => v.id)).toEqual(['calm-short', 'calm-long'])
    expect(filterSaved(list, {}).length).toBe(3)
  })
})

describe('sortSaved', () => {
  const list = [
    item('a', 20, { savedAt: '2026-11-02T00:00:00Z', likely: 8.1 }),
    item('b', null, { savedAt: '2026-11-03T00:00:00Z', likely: 9 }),
    item('c', 5, { savedAt: '2026-11-01T00:00:00Z' }),
  ]
  it('sorts by date saved, length either way, or best-loved', () => {
    expect(sortSaved(list, 'recent').map((v) => v.id)).toEqual(['b', 'a', 'c'])
    expect(sortSaved(list, 'shortest').map((v) => v.id)).toEqual(['c', 'a', 'b'])
    expect(sortSaved(list, 'longest').map((v) => v.id)).toEqual(['a', 'c', 'b'])
    expect(sortSaved(list, 'loved').map((v) => v.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('bestFit ("Got 20 minutes?")', () => {
  it('picks the best-loved video that fits', () => {
    const list = [item('long', 25, { likely: 9.5 }), item('loved', 17, { likely: 9.1 }), item('ok', 19, { likely: 8 })]
    expect(bestFit(list, 20)?.id).toBe('loved')
  })
  it('then the one that fills more of the time, then the one that has waited longest', () => {
    expect(bestFit([item('short', 5), item('fuller', 18)], 20)?.id).toBe('fuller')
    const older = item('older', 10, { savedAt: '2026-10-01T00:00:00Z' })
    const newer = item('newer', 10, { savedAt: '2026-11-01T00:00:00Z' })
    expect(bestFit([newer, older], 20)?.id).toBe('older')
  })
  it('returns nothing when nothing fits, and ignores unknown lengths', () => {
    expect(bestFit([item('long', 25), item('unknown', null)], 20)).toBeNull()
  })
})

describe('likelyScore', () => {
  it('pulls few ratings towards 7, and has no opinion with none', () => {
    expect(likelyScore(null, 0)).toBeNull()
    expect(likelyScore(10, 1)).toBe(7.8)
    expect(likelyScore(9, 30)).toBe(8.8)
  })
})
