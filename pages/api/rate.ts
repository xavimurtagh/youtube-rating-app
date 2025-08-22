import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Request body:', req.body);


  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video, score } = req.body;

    // coerce score to a number up front
    const scoreNum = typeof score === 'string' ? parseInt(score, 10) : Number(score);

    console.log('video:', video);
    console.log('video.id:', video?.id);
    console.log('score:', score);
    console.log('scoreNum:', scoreNum);


    // validate video.id and scoreNum
    if (
      !video ||
      typeof video.id !== 'string' ||
      isNaN(scoreNum) ||
      scoreNum < 1 ||
      scoreNum > 10
    ) {
      return res.status(400).json({ error: 'Invalid video or score data' });
    }

    console.log(`Saving rating: User ${me.id} rating video ${video.id} with score ${scoreNum}`);

    const savedRating = await prisma.rating.upsert({
      where: {
        userId_videoId: { userId: me.id, videoId: video.id },
      },
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
