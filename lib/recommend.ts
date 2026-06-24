/**
 * Pure recommendation logic — no database or framework dependencies.
 *
 * All Prisma access lives in the API route (`pages/api/recommendations.ts`);
 * these functions operate on plain data so they can be unit-tested
 * deterministically. See `test/recommend.test.ts`.
 */

export interface VideoLite {
  id: string
  title?: string | null
  channel?: string | null
  category?: string | null
  thumbnail?: string | null
}

export interface RatingLite {
  videoId: string
  score: number
  video?: VideoLite | null
}

export interface NeighbourRating {
  videoId: string
  score: number
  user: { id?: string; name: string }
}

export interface Neighbour {
  userId: string
  user: { id?: string; name: string }
  /** Significance-weighted correlation — used for ranking and weighting. */
  similarity: number
  /** Raw Pearson correlation in [-1, 1] — used for display. */
  correlation: number
  commonRatings: number
}

export interface CandidateRating {
  userId: string
  videoId: string
  score: number
  video: VideoLite
}

export type RecommendationSource = 'similar_users' | 'channel' | 'category' | 'popular'

export interface Recommendation {
  video: VideoLite
  /** 0–100 */
  matchScore: number
  avgRating: number
  recommenderCount: number
  source: RecommendationSource
  reason: string
}

export interface RecommendOptions {
  minOverlap: number
  significanceN: number
  minSimilarity: number
  maxNeighbours: number
  minCandidateScore: number
  maxRecommendations: number
  likedAffinityMinAvg: number
}

export const RECOMMEND_DEFAULTS: RecommendOptions = {
  minOverlap: 3,           // common ratings needed to compare two users
  significanceN: 20,       // overlap at which a correlation is fully trusted
  minSimilarity: 0.1,      // ignore neighbours at/below this raw correlation
  maxNeighbours: 25,
  minCandidateScore: 7,    // only surface videos rated this highly
  maxRecommendations: 20,
  likedAffinityMinAvg: 7,  // channel/category counts as "liked" at this avg
}

export const round1 = (n: number) => Math.round(n * 10) / 10
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Pearson correlation over two equal-length, index-aligned arrays. */
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0

  let sumA = 0, sumB = 0, sumASq = 0, sumBSq = 0, sumAB = 0
  for (let i = 0; i < n; i++) {
    sumA += a[i]
    sumB += b[i]
    sumASq += a[i] * a[i]
    sumBSq += b[i] * b[i]
    sumAB += a[i] * b[i]
  }

  const numerator = sumAB - (sumA * sumB) / n
  const denominator = Math.sqrt((sumASq - (sumA * sumA) / n) * (sumBSq - (sumB * sumB) / n))
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Rank other users by taste similarity to me.
 *
 * `ratingsByUser` maps each other user's id to *their ratings of videos I have
 * also rated* (the caller is expected to pre-filter to my video ids). The raw
 * correlation is down-weighted by overlap so a lucky 3-video match can't
 * outrank a solid 30-video one.
 */
export function computeNeighbours(
  myScoreByVideo: Map<string, number>,
  ratingsByUser: Map<string, NeighbourRating[]>,
  opts: RecommendOptions = RECOMMEND_DEFAULTS
): Neighbour[] {
  const neighbours: Neighbour[] = []

  for (const [userId, theirCommon] of ratingsByUser) {
    if (theirCommon.length < opts.minOverlap) continue

    const mine: number[] = []
    const theirs: number[] = []
    for (const r of theirCommon) {
      const myScore = myScoreByVideo.get(r.videoId)
      if (myScore === undefined) continue
      mine.push(myScore)
      theirs.push(r.score)
    }
    if (mine.length < opts.minOverlap) continue

    const correlation = pearson(mine, theirs)
    if (correlation <= opts.minSimilarity) continue

    const significance = Math.min(mine.length, opts.significanceN) / opts.significanceN
    neighbours.push({
      userId,
      user: theirCommon[0].user,
      similarity: correlation * significance,
      correlation,
      commonRatings: mine.length,
    })
  }

  return neighbours
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, opts.maxNeighbours)
}

/**
 * Collaborative-filtering recommendations: videos my neighbours rated highly
 * that I haven't seen, scored by a similarity-weighted predicted rating mapped
 * to 0–100.
 */
export function scoreCollaborative(
  neighbours: Neighbour[],
  candidates: CandidateRating[],
  opts: RecommendOptions = RECOMMEND_DEFAULTS
): Recommendation[] {
  if (neighbours.length === 0) return []
  const simByUser = new Map(neighbours.map(n => [n.userId, n]))

  const byVideo = new Map<string, {
    video: VideoLite
    weightedSum: number
    simSum: number
    scoreSum: number
    count: number
    reasons: { user: string; rating: number; similarity: number }[]
  }>()

  for (const r of candidates) {
    if (!r.video) continue
    const neighbour = simByUser.get(r.userId)
    if (!neighbour) continue

    let v = byVideo.get(r.videoId)
    if (!v) {
      v = { video: r.video, weightedSum: 0, simSum: 0, scoreSum: 0, count: 0, reasons: [] }
      byVideo.set(r.videoId, v)
    }
    v.weightedSum += neighbour.similarity * r.score
    v.simSum += neighbour.similarity
    v.scoreSum += r.score
    v.count += 1
    v.reasons.push({
      user: neighbour.user.name,
      rating: r.score,
      similarity: Math.round(neighbour.correlation * 100),
    })
  }

  const recs: Recommendation[] = []
  for (const v of byVideo.values()) {
    const predicted = v.simSum > 0 ? v.weightedSum / v.simSum : v.scoreSum / v.count
    const avgRating = v.scoreSum / v.count
    recs.push({
      video: v.video,
      matchScore: clamp(Math.round(predicted * 10), 0, 100),
      avgRating: round1(avgRating),
      recommenderCount: v.count,
      source: 'similar_users',
      reason: similarUsersReason(v.reasons, avgRating),
    })
  }

  return recs
    .sort((a, b) => b.matchScore - a.matchScore || b.recommenderCount - a.recommenderCount)
    .slice(0, opts.maxRecommendations)
}

function similarUsersReason(
  reasons: { user: string; rating: number; similarity: number }[],
  avgRating: number
): string {
  const top = reasons
    .slice()
    .sort((a, b) => b.rating * b.similarity - a.rating * a.similarity)
    .slice(0, 3)
    .map(r => `${r.user} (${r.similarity}% similar) rated it ${r.rating}/10`)
    .join(', ')
  return `Users with similar taste gave this an average of ${round1(avgRating)}/10. ${top}`
}

/** The set of values (channels or categories) the user rates at/above `minAvg`. */
export function affinitySet(
  myRatings: RatingLite[],
  pick: (v: VideoLite) => string | null | undefined,
  minAvg: number
): Set<string> {
  const stats = new Map<string, { sum: number; count: number }>()
  for (const r of myRatings) {
    if (!r.video) continue
    const key = pick(r.video)
    if (!key || key === 'Unknown Channel') continue
    const s = stats.get(key) || { sum: 0, count: 0 }
    s.sum += r.score
    s.count += 1
    stats.set(key, s)
  }
  const liked = new Set<string>()
  for (const [key, s] of stats) {
    if (s.sum / s.count >= minAvg) liked.add(key)
  }
  return liked
}

/**
 * Cold-start / sparsity fallback. Pure collaborative filtering returns nothing
 * until users share rated videos, which is rare with a small user base. This
 * ranks highly-rated videos I haven't seen, preferring categories and channels
 * I already rate highly, then community popularity.
 */
export function scoreFallback(
  myRatings: RatingLite[],
  candidates: CandidateRating[],
  excludeIds: string[],
  opts: RecommendOptions = RECOMMEND_DEFAULTS
): Recommendation[] {
  const seen = new Set<string>([...myRatings.map(r => r.videoId), ...excludeIds])
  const likedChannels = affinitySet(myRatings, v => v.channel, opts.likedAffinityMinAvg)
  const likedCategories = affinitySet(myRatings, v => v.category, opts.likedAffinityMinAvg)

  const byVideo = new Map<string, { video: VideoLite; sum: number; count: number }>()
  for (const r of candidates) {
    if (!r.video || seen.has(r.videoId)) continue
    if (r.score < opts.minCandidateScore) continue
    let v = byVideo.get(r.videoId)
    if (!v) {
      v = { video: r.video, sum: 0, count: 0 }
      byVideo.set(r.videoId, v)
    }
    v.sum += r.score
    v.count += 1
  }

  const recs: Recommendation[] = []
  for (const v of byVideo.values()) {
    const avg = v.sum / v.count
    const base = Math.round((avg / 10) * 100)
    const categoryMatch = !!v.video.category && likedCategories.has(v.video.category)
    const channelMatch = !!v.video.channel && likedChannels.has(v.video.channel)

    let source: RecommendationSource = 'popular'
    let reason = `Popular with the community — average ${round1(avg)}/10 across ${v.count} rating(s).`
    let boost = 0
    if (categoryMatch) {
      source = 'category'
      boost = 12
      reason = `In ${v.video.category}, a category you rate highly — community average ${round1(avg)}/10 across ${v.count} rating(s).`
    } else if (channelMatch) {
      source = 'channel'
      boost = 10
      reason = `From ${v.video.channel}, a channel you rate highly — community average ${round1(avg)}/10 across ${v.count} rating(s).`
    }

    recs.push({
      video: v.video,
      matchScore: clamp(base + boost, 0, 100),
      avgRating: round1(avg),
      recommenderCount: v.count,
      source,
      reason,
    })
  }

  const rank: Record<RecommendationSource, number> = { similar_users: 0, category: 1, channel: 2, popular: 3 }
  return recs.sort((a, b) =>
    rank[a.source] - rank[b.source] ||
    b.recommenderCount - a.recommenderCount ||
    b.matchScore - a.matchScore
  )
}

/** Merge collaborative results with fallback, de-duplicating by video id. */
export function mergeRecommendations(
  primary: Recommendation[],
  fallback: Recommendation[],
  max: number
): Recommendation[] {
  const seen = new Set(primary.map(r => r.video.id))
  const merged = [...primary]
  for (const r of fallback) {
    if (seen.has(r.video.id)) continue
    seen.add(r.video.id)
    merged.push(r)
  }
  return merged.slice(0, max)
}
