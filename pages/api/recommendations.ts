import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

// Tunables
const MIN_RATINGS_REQUIRED = 10   // user must have rated at least this many
const MIN_OVERLAP = 3             // common ratings needed to compare two users
const SIGNIFICANCE_N = 20         // overlap at which similarity is fully trusted
const MIN_SIMILARITY = 0.1        // ignore neighbours at/below this correlation
const MAX_NEIGHBOURS = 25
const MIN_CANDIDATE_SCORE = 7     // only surface videos rated this highly
const MAX_RECOMMENDATIONS = 20

const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const me = await getUser(req, res)
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const myRatings = await prisma.rating.findMany({
      where: { userId: me.id },
      include: { video: true }
    })

    if (myRatings.length < MIN_RATINGS_REQUIRED) {
      return res.status(400).json({
        error: `Need at least ${MIN_RATINGS_REQUIRED} ratings (you have ${myRatings.length})`,
        userRatingCount: myRatings.length
      })
    }

    // 1) Collaborative filtering against users with similar taste.
    const neighbours = await findSimilarUsers(me.id, myRatings)
    let recommendations = await generateRecommendations(neighbours, myRatings)

    // 2) Cold-start / sparsity fallback. Pure collaborative filtering returns
    //    nothing until users share rated videos, which is rare early on. Fill
    //    the gap with channel-affinity and community-popularity picks.
    if (recommendations.length < MAX_RECOMMENDATIONS) {
      const alreadyRecommended = recommendations.map(r => r.video.id)
      const fallback = await getFallbackRecommendations(me.id, myRatings, alreadyRecommended)
      recommendations = [...recommendations, ...fallback].slice(0, MAX_RECOMMENDATIONS)
    }

    return res.status(200).json({ recommendations })
  } catch (error) {
    console.error('Recommendations API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function findSimilarUsers(userId: string, myRatings: any[]) {
  const myVideoIds = myRatings.map(r => r.videoId)
  const myScoreByVideo = new Map<string, number>(myRatings.map(r => [r.videoId, r.score]))

  // Everyone who has rated at least one video I've also rated.
  const otherRatings = await prisma.rating.findMany({
    where: {
      userId: { not: userId },
      videoId: { in: myVideoIds }
    },
    include: { user: { select: { id: true, name: true } } }
  })

  const byUser: Record<string, any[]> = {}
  for (const r of otherRatings) {
    ;(byUser[r.userId] ||= []).push(r)
  }

  const neighbours = Object.entries(byUser)
    .map(([otherId, theirCommon]) => {
      if (theirCommon.length < MIN_OVERLAP) return null

      const mine = theirCommon.map(r => myScoreByVideo.get(r.videoId) as number)
      const theirs = theirCommon.map(r => r.score)
      const correlation = pearson(mine, theirs)

      // Down-weight correlations computed from few overlapping ratings so a
      // lucky 3-video match can't outrank a solid 30-video one.
      const significance = Math.min(theirCommon.length, SIGNIFICANCE_N) / SIGNIFICANCE_N
      const similarity = correlation * significance

      if (correlation <= MIN_SIMILARITY) return null

      return {
        userId: otherId,
        user: theirCommon[0].user,
        similarity,
        correlation,
        commonRatings: theirCommon.length
      }
    })
    .filter(Boolean) as any[]

  return neighbours
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_NEIGHBOURS)
}

// Pearson correlation over two equal-length, index-aligned score arrays.
function pearson(a: number[], b: number[]) {
  const n = a.length
  if (n === 0) return 0

  const sumA = a.reduce((s, x) => s + x, 0)
  const sumB = b.reduce((s, x) => s + x, 0)
  const sumASq = a.reduce((s, x) => s + x * x, 0)
  const sumBSq = b.reduce((s, x) => s + x * x, 0)
  const sumAB = a.reduce((s, x, i) => s + x * b[i], 0)

  const numerator = sumAB - (sumA * sumB) / n
  const denominator = Math.sqrt((sumASq - (sumA * sumA) / n) * (sumBSq - (sumB * sumB) / n))

  return denominator === 0 ? 0 : numerator / denominator
}

async function generateRecommendations(neighbours: any[], myRatings: any[]) {
  if (neighbours.length === 0) return []

  const myVideoIds = myRatings.map(r => r.videoId)
  const neighbourIds = neighbours.map(n => n.userId)
  const simByUser = new Map<string, any>(neighbours.map(n => [n.userId, n]))

  const candidates = await prisma.rating.findMany({
    where: {
      userId: { in: neighbourIds },
      videoId: { notIn: myVideoIds },
      score: { gte: MIN_CANDIDATE_SCORE }
    },
    include: { video: true }
  })

  const byVideo: Record<string, any> = {}
  for (const r of candidates) {
    if (!r.video) continue
    const neighbour = simByUser.get(r.userId)
    if (!neighbour) continue

    const v = (byVideo[r.videoId] ||= {
      video: r.video,
      weightedSum: 0,   // Σ similarity * score
      simSum: 0,        // Σ similarity
      scoreSum: 0,
      count: 0,
      reasons: [] as any[]
    })

    v.weightedSum += neighbour.similarity * r.score
    v.simSum += neighbour.similarity
    v.scoreSum += r.score
    v.count += 1
    v.reasons.push({
      user: neighbour.user.name,
      rating: r.score,
      similarity: Math.round(neighbour.correlation * 100)
    })
  }

  return Object.values(byVideo)
    .map((v: any) => {
      // Similarity-weighted predicted rating (1-10) → 0-100 match score.
      const predicted = v.simSum > 0 ? v.weightedSum / v.simSum : v.scoreSum / v.count
      const avgRating = v.scoreSum / v.count
      return {
        video: v.video,
        matchScore: clamp(Math.round(predicted * 10), 0, 100),
        avgRating: round1(avgRating),
        recommenderCount: v.count,
        source: 'similar_users',
        reason: similarUsersReason(v.reasons, avgRating)
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore || b.recommenderCount - a.recommenderCount)
    .slice(0, MAX_RECOMMENDATIONS)
}

function similarUsersReason(reasons: any[], avgRating: number) {
  const top = reasons
    .sort((a, b) => b.rating * b.similarity - a.rating * a.similarity)
    .slice(0, 3)
    .map(r => `${r.user} (${r.similarity}% similar) rated it ${r.rating}/10`)
    .join(', ')

  return `Users with similar taste gave this an average of ${round1(avgRating)}/10. ${top}`
}

// Channel-affinity + community-popularity recommendations for when collaborative
// filtering is thin. Both only draw on videos already in the database (i.e. rated
// by someone), so they need at least a little community activity to produce output.
async function getFallbackRecommendations(userId: string, myRatings: any[], excludeIds: string[]) {
  const seen = new Set<string>([...myRatings.map(r => r.videoId), ...excludeIds])

  // Channels I personally rate highly.
  const channelStats: Record<string, { sum: number; count: number }> = {}
  for (const r of myRatings) {
    const channel = r.video?.channel
    if (!channel || channel === 'Unknown Channel') continue
    const s = (channelStats[channel] ||= { sum: 0, count: 0 })
    s.sum += r.score
    s.count += 1
  }
  const likedChannels = new Set(
    Object.entries(channelStats)
      .filter(([, s]) => s.sum / s.count >= 7)
      .map(([channel]) => channel)
  )

  // Highly-rated videos from other users that I haven't rated.
  const candidates = await prisma.rating.findMany({
    where: {
      userId: { not: userId },
      score: { gte: MIN_CANDIDATE_SCORE }
    },
    include: { video: true }
  })

  const byVideo: Record<string, any> = {}
  for (const r of candidates) {
    if (!r.video || seen.has(r.videoId)) continue
    const v = (byVideo[r.videoId] ||= { video: r.video, sum: 0, count: 0 })
    v.sum += r.score
    v.count += 1
  }

  const recs = Object.values(byVideo).map((v: any) => {
    const avg = v.sum / v.count
    const fromLikedChannel = likedChannels.has(v.video.channel)
    const base = Math.round((avg / 10) * 100)
    return {
      video: v.video,
      matchScore: fromLikedChannel ? clamp(base + 10, 0, 100) : base,
      avgRating: round1(avg),
      recommenderCount: v.count,
      source: fromLikedChannel ? 'channel' : 'popular',
      reason: fromLikedChannel
        ? `From ${v.video.channel}, a channel you rate highly — community average ${round1(avg)}/10 across ${v.count} rating(s).`
        : `Popular with the community — average ${round1(avg)}/10 across ${v.count} rating(s).`
    }
  })

  // Channel matches first, then the most-rated, then the best-rated.
  return recs.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'channel' ? -1 : 1
    return b.recommenderCount - a.recommenderCount || b.matchScore - a.matchScore
  })
}
