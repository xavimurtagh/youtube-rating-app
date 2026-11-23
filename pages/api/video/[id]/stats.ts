import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { getUser } from '../../../../lib/auth';
import { cleanVideoId } from '../../../../utils/videoUtils';
import { clientIp, enforceRateLimit } from '../../../../lib/rateLimit';
import { crowdMoods, describeMoods } from '../../../../lib/moods';
import { sealedFor } from '../../../../lib/pollStore';

/**
 * Members' ratings of one video: average, count and spread, plus the moods
 * enough people agree on. The page shows them to members only after they've
 * rated. While a video is a poll nominee, its scores are sealed here, on the
 * server, until the results are out, so nobody can follow the crowd.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = cleanVideoId(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  if (!(await enforceRateLimit(req, res, { id: `stats:${clientIp(req)}`, limit: 120, windowMs: 60_000 }))) return;

  try {
    const [sealed, tags, me] = await Promise.all([
      sealedFor(id),
      prisma.moodTag.findMany({ where: { videoId: id }, select: { userId: true, mood: true }, take: 5000 }),
      getUser(req, res),
    ]);

    const moods = crowdMoods(tags);
    const myMoods = me ? tags.filter((t) => t.userId === me.id).map((t) => t.mood) : [];
    const moodPart = { moods, moodLine: describeMoods(moods), myMoods };

    if (sealed) {
      return res.status(200).json({ sealed, averageRating: null, totalRatings: null, ratingDistribution: {}, ...moodPart });
    }

    const groups = await prisma.rating.groupBy({ by: ['score'], where: { videoId: id }, _count: { _all: true } });
    let total = 0;
    let sum = 0;
    const ratingDistribution: Record<number, number> = {};
    for (const g of groups) {
      ratingDistribution[g.score] = g._count._all;
      total += g._count._all;
      sum += g.score * g._count._all;
    }

    return res.status(200).json({
      sealed: null,
      averageRating: total ? Math.round((sum / total) * 10) / 10 : null,
      totalRatings: total,
      ratingDistribution,
      ...moodPart,
    });
  } catch (error) {
    console.error('Video stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
