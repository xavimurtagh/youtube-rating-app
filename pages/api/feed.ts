import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use NextAuth session instead of JWT
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rest of your feed logic stays the same
    const activities = await prisma.activity.findMany({
      where: {
        user: {
          followers: { some: { followerId: me.id } }
        }
      },
      include: { 
        user: { 
          select: { id: true, name: true, avatar: true } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.status(200).json(activities);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
