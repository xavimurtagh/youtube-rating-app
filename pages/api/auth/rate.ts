import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a Request object from NextApiRequest for compatibility
    const request = new Request('http://localhost', {
      method: req.method,
      headers: req.headers as any,
      body: JSON.stringify(req.body)
    });

    const me = await getUser(request);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video, score } = req.body;

    // Ensure video row exists
    await prisma.video.upsert({
      where: { id: video.id },
      create: video,
      update: { 
        title: video.title, 
        channel: video.channel, 
        thumbnail: video.thumbnail, 
        isMusic: video.isMusic 
      }
    });

    // Upsert rating
    await prisma.rating.upsert({
      where: { userId_videoId: { userId: me.id, videoId: video.id } },
      create: { userId: me.id, videoId: video.id, score },
      update: { score, ratedAt: new Date() }
    });

    // Log activity
    await prisma.activity.create({
      data: { userId: me.id, type: 'rating', videoId: video.id, data: { score } }
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
