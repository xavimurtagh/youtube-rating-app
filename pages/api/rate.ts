import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'DELETE') {
    try {
      const me = await getUser(req, res);
      if (!me) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { videoId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
      }

      // Delete the rating
      await prisma.rating.delete({
        where: {
          userId_videoId: {
            userId: me.id,
            videoId: videoId
          }
        }
      });

      // Log the activity
      await prisma.activity.create({
        data: {
          userId: me.id,
          type: 'rating_removed',
          videoId: videoId,
          data: {}
        }
      });

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Remove rating error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video, score } = req.body;
    const scoreNum = typeof score === 'string' ? parseInt(score, 10) : Number(score);

    if (
      !video ||
      typeof video.id !== 'string' ||
      isNaN(scoreNum) ||
      scoreNum < 1 ||
      scoreNum > 10
    ) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    await prisma.video.upsert({
      where: { id: video.id },
      create: {
        id: video.id,
        title: video.title || 'Unknown Video',
        channel: video.channel || 'Unknown Channel', 
        thumbnail: video.thumbnail || null,
        isMusic: Boolean(video.isMusic),
      },
      update: {
        // Always update with latest info if available
        title: video.title || 'Unknown Video',
        channel: video.channel || 'Unknown Channel',
        thumbnail: video.thumbnail || null,
      },
    });

    // 2) Upsert the Rating
    const savedRating = await prisma.rating.upsert({
      where: { userId_videoId: { userId: me.id, videoId: video.id } },
      create: {
        userId: me.id,
        videoId: video.id,
        score: scoreNum,
      },
      update: {
        score: scoreNum,
        ratedAt: new Date(),
      },
    });

    // 3) Log the activity
    await prisma.activity.create({
      data: {
        userId: me.id,
        type: 'rating',
        videoId: video.id,
        data: { score: scoreNum },
      },
    });

    return res.status(200).json({ ok: true, rating: savedRating });
  } catch (error) {
    console.error('Rating API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
