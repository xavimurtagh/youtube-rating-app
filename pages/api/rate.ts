import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video, score } = req.body;

    if (!video || !video.id || !score || score < 1 || score > 10) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    console.log(`Saving rating: User ${me.id} rating video ${video.id} with score ${score}`);

    // Ensure video exists in database
    await prisma.rating.upsert({
      where: {
        userId_videoId: {
          userId: userId,
          videoId: videoId,
        },
      },
      create: {
        userId: userId,
        videoId: videoId,
        score: score, // must be a number, not NaN
      },
      update: {
        score: score, // must be a number
        ratedAt: new Date(),
      },
    });

    // Save/update rating
    const savedRating = await prisma.rating.upsert({
      where: {
        userId_videoId: {
          userId: me.id,
          videoId: video.id
        }
      },
      create: {
        userId: me.id,
        videoId: video.id,
        score: parseInt(score)
      },
      update: {
        score: parseInt(score),
        ratedAt: new Date()
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: me.id,
        type: 'rating',
        videoId: video.id,
        data: { score: parseInt(score) }
      }
    });

    console.log('Rating saved successfully:', savedRating);

    res.status(200).json({ ok: true, rating: savedRating });
  } catch (error) {
    console.error('Rating API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
