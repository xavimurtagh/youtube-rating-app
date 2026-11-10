import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { enforceRateLimit } from '../../lib/rateLimit'
import {
  RECOMMEND_DEFAULTS as D,
  computeNeighbours,
  scoreCollaborative,
  scoreFallback,
  mergeRecommendations,
  type NeighbourRating,
  type CandidateRating,
  type Recommendation,
} from '../../lib/recommend'

const MIN_RATINGS_REQUIRED = 10
const POPULARITY_SCAN_LIMIT = 2000 // cap the fallback scan for large datasets

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const me = await getUser(req, res)
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!enforceRateLimit(req, res, { id: `recommendations:${me.id}`, limit: 20, windowMs: 60_000 })) {
      return
    }

    // Respect the user's own personalization preference.
    if (!me.allowRecommendations) {
      return res.status(200).json({ recommendations: [], personalizationDisabled: true })
    }

    // Bounded work per request: the most recent 1,000 ratings are plenty to
    // find neighbours. (A nightly precompute replaces this at scale.)
    const myRatings = await prisma.rating.findMany({
      where: { userId: me.id },
      include: { video: true },
      orderBy: { ratedAt: 'desc' },
      take: 1000,
    })

    if (myRatings.length < MIN_RATINGS_REQUIRED) {
      return res.status(400).json({
        error: `Need at least ${MIN_RATINGS_REQUIRED} ratings (you have ${myRatings.length})`,
        userRatingCount: myRatings.length,
      })
    }

    const myVideoIds = myRatings.map(r => r.videoId)
    const myScoreByVideo = new Map<string, number>(myRatings.map(r => [r.videoId, r.score]))

    // 1) Collaborative filtering. Only consider ratings from users who allow
    //    their data to power recommendations.
    const others = await prisma.rating.findMany({
      where: {
        userId: { not: me.id },
        videoId: { in: myVideoIds },
        user: { allowRecommendations: true },
      },
      include: { user: { select: { id: true, name: true, publicProfile: true } } },
      take: 20000,
    })

    const ratingsByUser = new Map<string, NeighbourRating[]>()
    for (const r of others) {
      const arr = ratingsByUser.get(r.userId) || []
      arr.push({ videoId: r.videoId, score: r.score, user: r.user })
      ratingsByUser.set(r.userId, arr)
    }

    const neighbours = computeNeighbours(myScoreByVideo, ratingsByUser)

    let recommendations: Recommendation[] = []
    if (neighbours.length > 0) {
      const candidates = await prisma.rating.findMany({
        where: {
          userId: { in: neighbours.map(n => n.userId) },
          videoId: { notIn: myVideoIds },
          score: { gte: D.minCandidateScore },
          user: { allowRecommendations: true },
          video: { available: true },
        },
        include: { video: true, user: { select: { id: true, name: true } } },
        orderBy: { score: 'desc' },
        take: 5000,
      })
      // Anything rated outside the most recent 1,000 is still excluded here.
      const allMine = new Set(
        (await prisma.rating.findMany({ where: { userId: me.id }, select: { videoId: true } })).map(r => r.videoId)
      )
      const candLite: CandidateRating[] = candidates.filter(c => !allMine.has(c.videoId)).map(c => ({
        userId: c.userId,
        videoId: c.videoId,
        score: c.score,
        video: c.video,
      }))
      recommendations = scoreCollaborative(neighbours, candLite)
    }

    // 2) Cold-start / sparsity fallback: category & channel affinity + popularity.
    if (recommendations.length < D.maxRecommendations) {
      const popular = await prisma.rating.findMany({
        where: {
          userId: { not: me.id },
          score: { gte: D.minCandidateScore },
          user: { allowRecommendations: true },
          video: { available: true },
        },
        include: { video: true },
        orderBy: { ratedAt: 'desc' },
        take: POPULARITY_SCAN_LIMIT,
      })
      const popLite: CandidateRating[] = popular.map(c => ({
        userId: c.userId,
        videoId: c.videoId,
        score: c.score,
        video: c.video,
      }))
      const fallback = scoreFallback(myRatings, popLite, recommendations.map(r => r.video.id))
      recommendations = mergeRecommendations(recommendations, fallback, D.maxRecommendations)
    }

    return res.status(200).json({ recommendations })
  } catch (error) {
    console.error('Recommendations API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
