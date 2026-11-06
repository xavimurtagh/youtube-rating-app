import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { communityFavourites, type CandidateRating } from '../../lib/recommend'

const SCAN_LIMIT = 5000

/**
 * Community favourites: the best-rated videos among members (Bayesian
 * average), excluding anything you've already rated. Works with no
 * personal history at all, so it powers the cold-start home page.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const me = await getUser(req, res)
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const [mine, recent] = await Promise.all([
      prisma.rating.findMany({ where: { userId: me.id }, select: { videoId: true } }),
      prisma.rating.findMany({
        where: { userId: { not: me.id }, user: { allowRecommendations: true } },
        include: { video: true },
        orderBy: { ratedAt: 'desc' },
        take: SCAN_LIMIT,
      }),
    ])

    const candidates: CandidateRating[] = recent.map((r) => ({
      userId: r.userId,
      videoId: r.videoId,
      score: r.score,
      video: r.video,
    }))

    const picks = communityFavourites(candidates, mine.map((r) => r.videoId), { limit: 12 })
    return res.status(200).json({ picks })
  } catch (error) {
    console.error('Community favourites error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
