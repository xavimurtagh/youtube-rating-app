import { describe, it, expect } from 'vitest'
import {
  pearson,
  computeNeighbours,
  scoreCollaborative,
  affinitySet,
  scoreFallback,
  mergeRecommendations,
  type NeighbourRating,
  type Neighbour,
  type CandidateRating,
  type RatingLite,
} from '../lib/recommend'

describe('pearson', () => {
  it('is 1 for perfectly correlated series', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })
  it('is -1 for perfectly anti-correlated series', () => {
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10)
  })
  it('is 0 when one series is constant (no variance)', () => {
    expect(pearson([1, 2, 3], [5, 5, 5])).toBe(0)
  })
  it('returns 0 for empty input', () => {
    expect(pearson([], [])).toBe(0)
  })
})

describe('computeNeighbours', () => {
  const myScoreByVideo = new Map([
    ['v1', 2], ['v2', 4], ['v3', 6], ['v4', 8], ['v5', 10],
  ])

  const mk = (name: string, scores: Record<string, number>): NeighbourRating[] =>
    Object.entries(scores).map(([videoId, score]) => ({ videoId, score, user: { name } }))

  it('ranks positive neighbours, weights by overlap, drops weak/short ones', () => {
    const ratingsByUser = new Map<string, NeighbourRating[]>([
      ['A', mk('Alice', { v1: 2, v2: 4, v3: 6, v4: 8, v5: 10 })], // identical → corr 1, overlap 5
      ['B', mk('Bob',   { v1: 10, v2: 8, v3: 6, v4: 4, v5: 2 })], // reversed → corr -1 → dropped
      ['C', mk('Cara',  { v1: 2, v2: 4 })],                       // overlap 2 → dropped
      ['D', mk('Dave',  { v1: 3, v2: 5, v3: 7, v4: 9 })],         // corr 1, overlap 4
    ])

    const neighbours = computeNeighbours(myScoreByVideo, ratingsByUser)
    expect(neighbours.map(n => n.userId)).toEqual(['A', 'D']) // A (sim .25) before D (sim .2)
    expect(neighbours[0].correlation).toBeCloseTo(1, 10)
    expect(neighbours[0].commonRatings).toBe(5)
    expect(neighbours[0].similarity).toBeCloseTo(0.25, 10) // 1 * 5/20
    expect(neighbours[1].similarity).toBeCloseTo(0.2, 10)  // 1 * 4/20
  })
})

describe('scoreCollaborative', () => {
  const neighbours: Neighbour[] = [
    { userId: 'A', user: { name: 'Alice' }, similarity: 0.25, correlation: 1, commonRatings: 5 },
    { userId: 'D', user: { name: 'Dave' }, similarity: 0.2, correlation: 1, commonRatings: 4 },
  ]

  it('scores by similarity-weighted predicted rating, ignores non-neighbours', () => {
    const candidates: CandidateRating[] = [
      { userId: 'A', videoId: 'x', score: 10, video: { id: 'x', title: 'X' } },
      { userId: 'D', videoId: 'x', score: 8, video: { id: 'x', title: 'X' } },
      { userId: 'A', videoId: 'y', score: 7, video: { id: 'y', title: 'Y' } },
      { userId: 'Z', videoId: 'q', score: 10, video: { id: 'q', title: 'Q' } }, // not a neighbour
    ]
    const recs = scoreCollaborative(neighbours, candidates)
    expect(recs.map(r => r.video.id)).toEqual(['x', 'y'])
    // predicted x = (0.25*10 + 0.2*8) / 0.45 = 9.111 → 91
    expect(recs[0].matchScore).toBe(91)
    expect(recs[0].recommenderCount).toBe(2)
    expect(recs[0].avgRating).toBe(9)
    // predicted y = 7 → 70
    expect(recs[1].matchScore).toBe(70)
    expect(recs.every(r => r.matchScore >= 0 && r.matchScore <= 100)).toBe(true)
  })

  it('returns nothing without neighbours', () => {
    expect(scoreCollaborative([], [])).toEqual([])
  })
})

describe('affinitySet', () => {
  const myRatings: RatingLite[] = [
    { videoId: 'a', score: 9, video: { id: 'a', channel: 'Good', category: 'Music' } },
    { videoId: 'b', score: 8, video: { id: 'b', channel: 'Good', category: 'Music' } },
    { videoId: 'c', score: 3, video: { id: 'c', channel: 'Bad', category: 'Gaming' } },
    { videoId: 'd', score: 5, video: { id: 'd', channel: 'Unknown Channel', category: null } },
  ]

  it('keeps channels at/above the average threshold', () => {
    const liked = affinitySet(myRatings, v => v.channel, 7)
    expect([...liked]).toEqual(['Good'])
  })
  it('keeps categories at/above the average threshold', () => {
    const liked = affinitySet(myRatings, v => v.category, 7)
    expect([...liked]).toEqual(['Music'])
  })
})

describe('scoreFallback', () => {
  const myRatings: RatingLite[] = [
    { videoId: 'a', score: 9, video: { id: 'a', channel: 'Good', category: 'Music' } },
    { videoId: 'b', score: 8, video: { id: 'b', channel: 'Good', category: 'Music' } },
    { videoId: 'c', score: 3, video: { id: 'c', channel: 'Bad', category: 'Gaming' } },
  ]

  it('ranks category match > channel match > popular, excludes seen and low scores', () => {
    const candidates: CandidateRating[] = [
      { userId: 'u1', videoId: 'e', score: 9, video: { id: 'e', channel: 'Good', category: 'Music' } },  // category
      { userId: 'u2', videoId: 'f', score: 8, video: { id: 'f', channel: 'Good', category: 'Gaming' } }, // channel
      { userId: 'u3', videoId: 'g', score: 10, video: { id: 'g', channel: 'Other', category: 'News' } }, // popular
      { userId: 'u4', videoId: 'a', score: 9, video: { id: 'a', channel: 'Good' } },                     // seen → excluded
      { userId: 'u5', videoId: 'h', score: 5, video: { id: 'h', channel: 'Good' } },                     // below threshold
    ]
    const recs = scoreFallback(myRatings, candidates, [])
    expect(recs.map(r => r.video.id)).toEqual(['e', 'f', 'g'])
    expect(recs.map(r => r.source)).toEqual(['category', 'channel', 'popular'])
    expect(recs[0].matchScore).toBe(100) // 90 base + 12 boost, clamped
    expect(recs[1].matchScore).toBe(90)  // 80 base + 10 boost
    expect(recs.every(r => r.matchScore <= 100)).toBe(true)
  })

  it('honours the excludeIds list', () => {
    const candidates: CandidateRating[] = [
      { userId: 'u3', videoId: 'g', score: 10, video: { id: 'g', channel: 'Other', category: 'News' } },
    ]
    expect(scoreFallback(myRatings, candidates, ['g'])).toEqual([])
  })
})

describe('mergeRecommendations', () => {
  const r = (id: string) => ({ video: { id }, matchScore: 0, avgRating: 0, recommenderCount: 0, source: 'popular' as const, reason: '' })

  it('de-duplicates by video id and respects the max', () => {
    const merged = mergeRecommendations([r('x'), r('y')], [r('x'), r('z')], 3)
    expect(merged.map(m => m.video.id)).toEqual(['x', 'y', 'z'])
  })
  it('slices to the max length', () => {
    const merged = mergeRecommendations([r('x'), r('y')], [r('z')], 2)
    expect(merged.map(m => m.video.id)).toEqual(['x', 'y'])
  })
})
