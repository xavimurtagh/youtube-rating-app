import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../../lib/auth';

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

    if (!video || !video.id || score === undefined || score < 1 || score > 10) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    console.log(`Saving rating: User ${me.id} rating video ${video.id} with score ${score}`);

    // Save/update rating (remove the duplicate upsert call)
    const savedRating = await prisma.rating.upsert({
      where: {
        userId_videoId: {
          userId: me.id,        // Use me.id instead of userId
          videoId: video.id     // Use video.id instead of videoId
        }
      },
      create: {
        userId: me.id,          // Use me.id instead of userId
        videoId: video.id,      // Use video.id instead of videoId
        score: parseInt(score)  // Ensure it's a number
      },
      update: {
        score: parseInt(score), // Ensure it's a number
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
