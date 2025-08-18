import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const request = new Request('http://localhost', {
      method: req.method,
      headers: req.headers as any,
    });

    const me = await getUser(request);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feed = await prisma.activity.findMany({
      where: {
        user: {
          followers: { some: { followerId: me.id } }
        }
      },
      include: { 
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.status(200).json(feed);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
