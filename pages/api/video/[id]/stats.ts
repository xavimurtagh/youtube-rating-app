import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { cleanVideoId } from '../../../utils/videoUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId } = req.query.id;
    const id = cleanVideoId(rawVideoId);
    
    if (!id) {
      return res.status(400).json({ error: 'Invalid video ID format' });
    }
    
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const videoStats = await prisma.rating.aggregate({
      where: { videoId: id },
      _avg: { score: true },
      _count: { score: true }
    });

    const ratings = await prisma.rating.findMany({
      where: { videoId: id },
      select: { score: true }
    });

    const ratingDistribution = ratings.reduce((acc, rating) => {
      acc[rating.score] = (acc[rating.score] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    res.status(200).json({
      averageRating: videoStats._avg.score ? Math.round(videoStats._avg.score * 10) / 10 : null,
      totalRatings: videoStats._count.score || 0,
      ratingDistribution
    });
  } catch (error) {
    console.error('Video stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
