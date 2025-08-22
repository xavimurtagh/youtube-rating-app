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
    const scoreNum = typeof score === 'string' ? parseInt(score, 5) : Number(score);

    if (
      !video ||
      typeof video.id !== 'string' ||
      isNaN(scoreNum) ||
      scoreNum < 1 ||
      scoreNum > 10
    ) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    console.log(`Request body:`, req.body);
    console.log(`Saving rating: User ${me.id} video ${video.id} score ${scoreNum}`);

    // 1) Upsert the Video record so the FK exists
    await prisma.video.upsert({
      where: { id: video.id },
      create: {
        id: video.id,
        title: video.title,
        channel: video.channel,
        description: video.description ?? '',
        thumbnail: video.thumbnail ?? '',
        publishedAt: video.publishedAt ? new Date(video.publishedAt) : undefined,
        url: video.url,
        channelId: video.channelId ?? '',
      },
      update: {
        // Optionally keep title/channel in sync
        title: video.title,
        channel: video.channel,
      },
    });

    // 2) Now upsert the Rating
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

    // 3) Create activity log
    await prisma.activity.create({
      data: {
        userId: me.id,
        type: 'rating',
        videoId: video.id,
        data: { score: scoreNum },
      },
    });

    console.log('Rating saved successfully:', savedRating);
    res.status(200).json({ ok: true, rating: savedRating });

  } catch (error) {
    console.error('Rating API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
