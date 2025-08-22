import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use NextAuth session
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video, score } = req.body;

    if (!video || !video.id || !score || score < 1 || score > 10) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    // Ensure video row exists
    await prisma.video.upsert({
      where: { id: video.id },
      create: {
        id: video.id,
        title: video.title || 'Unknown Title',
        channel: video.channel || 'Unknown Channel',
        thumbnail: video.thumbnail,
        isMusic: video.isMusic || false
      },
      update: { 
        title: video.title || 'Unknown Title',
        channel: video.channel || 'Unknown Channel',
        thumbnail: video.thumbnail, 
        isMusic: video.isMusic || false
      }
    });

    // Upsert rating
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

    // Log activity
    await prisma.activity.create({
      data: { 
        userId: me.id, 
        type: 'rating', 
        videoId: video.id, 
        data: { score: parseInt(score) } 
      }
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
