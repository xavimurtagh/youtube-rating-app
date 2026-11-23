import { describe, it, expect } from 'vitest'
import {
  POLLS,
  POLL_RULES,
  buildBallot,
  checkEligibility,
  currentPoll,
  phaseOf,
  pollConfig,
  pollDay,
  priorMean,
  qualifiesAt,
  rankEntries,
  seededOrder,
} from '../lib/polls'

const poll = pollConfig('2026')!
const at = (iso: string) => new Date(iso)

describe('phaseOf', () => {
  it('follows the dates', () => {
    expect(phaseOf(poll, at('2026-11-22T12:00:00Z'))).toBe('upcoming')
    expect(phaseOf(poll, at('2026-12-01T00:00:00Z'))).toBe('nominations')
    expect(phaseOf(poll, at('2026-12-14T23:59:59Z'))).toBe('nominations')
    expect(phaseOf(poll, at('2026-12-15T00:00:00Z'))).toBe('voting')
    expect(phaseOf(poll, at('2026-12-31T23:59:59Z'))).toBe('voting')
    expect(phaseOf(poll, at('2027-01-01T00:00:00Z'))).toBe('counting')
    expect(phaseOf(poll, at('2027-01-15T12:00:00Z'))).toBe('results')
  })
})

describe('currentPoll', () => {
  it('appears from its announcement until six weeks after the results', () => {
    expect(currentPoll(at('2026-11-01T00:00:00Z'))).toBeNull()
    expect(currentPoll(at('2026-11-22T00:00:00Z'))?.slug).toBe('2026')
    expect(currentPoll(at('2027-02-20T00:00:00Z'))?.slug).toBe('2026')
    expect(currentPoll(at('2027-03-01T00:00:00Z'))).toBeNull()
  })
})

describe('the 2026 poll', () => {
  it('has the five categories from the roadmap, and Shorts are under ten minutes', () => {
    expect(POLLS[0].categories.map((c) => c.title)).toEqual([
      'Video essay',
      'Live performance',
      'Explainer',
      'Documentary and long-form',
      'Short',
    ])
    expect(POLLS[0].categories.find((c) => c.slug === 'short')?.maxSeconds).toBe(599)
  })

  it('names its days in UK time, with the last day of a phase', () => {
    expect(pollDay(poll.opensAt)).toBe('1 December')
    expect(pollDay(poll.votingAt, { lastDay: true })).toBe('14 December')
    expect(pollDay(poll.closesAt, { lastDay: true })).toBe('31 December')
    expect(pollDay(poll.publishedAt)).toBe('15 January')
  })
})

describe('qualifiesAt', () => {
  const close = '2027-01-01T00:00:00Z'
  it('needs an account a week old at the moment, and ten ratings', () => {
    expect(qualifiesAt({ createdAt: '2026-12-25T00:00:00Z', ratingCount: 10 }, close)).toBe(true)
    expect(qualifiesAt({ createdAt: '2026-12-25T00:00:01Z', ratingCount: 10 }, close)).toBe(false)
    expect(qualifiesAt({ createdAt: '2026-01-01T00:00:00Z', ratingCount: 9 }, close)).toBe(false)
  })
})

describe('checkEligibility', () => {
  const essay = poll.categories[0]
  const short = poll.categories[4]

  it('accepts a video from the poll year', () => {
    expect(checkEligibility(poll, essay, { publishedAt: '2026-06-01T10:00:00Z', duration: 'PT20M' }).ok).toBe(true)
  })

  it('refuses other years, and says why', () => {
    const before = checkEligibility(poll, essay, { publishedAt: '2025-12-31T23:59:59Z', duration: 'PT20M' })
    expect(before.ok).toBe(false)
    expect(before.reason).toBe('year')
    expect(before.message).toMatch(/published in 2026/)
    expect(checkEligibility(poll, essay, { publishedAt: '2027-01-01T00:00:00Z' }).reason).toBe('year')
  })

  it('keeps Shorts under ten minutes', () => {
    expect(checkEligibility(poll, short, { publishedAt: '2026-03-01T00:00:00Z', duration: 'PT9M59S' }).ok).toBe(true)
    const long = checkEligibility(poll, short, { publishedAt: '2026-03-01T00:00:00Z', duration: 'PT10M' })
    expect(long.ok).toBe(false)
    expect(long.reason).toBe('length')
    expect(long.message).toMatch(/under 10 minutes/)
  })

  it('asks to try again when the details are missing', () => {
    expect(checkEligibility(poll, essay, { publishedAt: null }).reason).toBe('unknown')
    expect(checkEligibility(poll, short, { publishedAt: '2026-03-01T00:00:00Z', duration: null }).reason).toBe('unknown')
  })
})

describe('buildBallot', () => {
  const order = ['essay', 'live', 'doc']
  const e = (id: string, categoryId: string, videoId: string, counted: number, removed = false) => ({ id, categoryId, videoId, counted, removed })

  it('takes entries with enough counted nominations', () => {
    const ballot = buildBallot([e('a', 'essay', 'v1', 2), e('b', 'essay', 'v2', 1), e('c', 'live', 'v3', 3)], order)
    expect([...ballot].sort()).toEqual(['a', 'c'])
  })

  it('puts each video in one category: where most people nominated it', () => {
    const ballot = buildBallot([e('a', 'essay', 'v1', 2), e('b', 'doc', 'v1', 4)], order)
    expect([...ballot]).toEqual(['b'])
  })

  it('breaks a tie with the earlier category', () => {
    const ballot = buildBallot([e('b', 'doc', 'v1', 3), e('a', 'essay', 'v1', 3)], order)
    expect([...ballot]).toEqual(['a'])
  })

  it('leaves out entries an admin removed', () => {
    expect(buildBallot([e('a', 'essay', 'v1', 5, true)], order).size).toBe(0)
  })

  it('uses the roadmap threshold of two', () => {
    expect(POLL_RULES.nominationsToBallot).toBe(2)
    expect(buildBallot([e('a', 'essay', 'v1', 1)], order).size).toBe(0)
  })
})

describe('rankEntries', () => {
  const r = (videoId: string, score: number, counts = true) => ({ videoId, score, counts })

  it('ranks by a Bayesian average, so a few perfect scores cannot beat many great ones', () => {
    const ratings = [
      ...Array.from({ length: 5 }, () => r('few', 10)),
      ...Array.from({ length: 40 }, () => r('many', 9)),
    ]
    const ranked = rankEntries(['few', 'many'], ratings, 7)
    expect(ranked[0].videoId).toBe('many')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(2)
    // (5 × 7 + 360) / (5 + 40)
    expect(ranked[0].score).toBeCloseTo(395 / 45, 6)
    expect(ranked[0].average).toBe(9)
    expect(ranked[0].count).toBe(40)
  })

  it('ignores ratings that do not count', () => {
    const ranked = rankEntries(['v'], [r('v', 10, false), ...Array.from({ length: 5 }, () => r('v', 6))], 7)
    expect(ranked[0].count).toBe(5)
    expect(ranked[0].average).toBe(6)
  })

  it('leaves nominees under the minimum unranked, after the ranked ones', () => {
    const ratings = [...Array.from({ length: 5 }, () => r('a', 8)), ...Array.from({ length: 4 }, () => r('b', 10))]
    const ranked = rankEntries(['b', 'a'], ratings, 7)
    expect(ranked.map((x) => [x.videoId, x.rank])).toEqual([
      ['a', 1],
      ['b', null],
    ])
  })
})

describe('priorMean', () => {
  it('is the mean of counted ratings, or 7 with none', () => {
    expect(priorMean([])).toBe(7)
    expect(priorMean([{ score: 10, counts: true }, { score: 6, counts: true }, { score: 1, counts: false }])).toBe(8)
  })
})

describe('seededOrder', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f']
  it('is a stable shuffle for a given seed', () => {
    const one = seededOrder(items, (x) => x, 'member-1')
    expect(seededOrder(items, (x) => x, 'member-1')).toEqual(one)
    expect([...one].sort()).toEqual(items)
  })
  it('differs between seeds', () => {
    const orders = new Set(['m1', 'm2', 'm3', 'm4'].map((s) => seededOrder(items, (x) => x, s).join('')))
    expect(orders.size).toBeGreaterThan(1)
  })
})
