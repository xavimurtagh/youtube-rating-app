import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ratings = await prisma.rating.findMany({
      where: { userId: me.id },
      select: {
        videoId: true,
        score: true,
        ratedAt: true
      },
      orderBy: { ratedAt: 'desc' }
    });

    res.status(200).json(ratings);
  } catch (error) {
    console.error('My ratings API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
