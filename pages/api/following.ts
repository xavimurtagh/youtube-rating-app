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

    const following = await prisma.follow.findMany({
      where: { followerId: me.id },
      include: {
        followee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            ratings: { select: { id: true } }
          }
        }
      }
    });

    const formattedFollowing = following.map(f => ({
      id: f.followee.id,
      name: f.followee.name,
      email: f.followee.email,
      avatar: f.followee.avatar,
      bio: f.followee.bio,
      totalRatings: f.followee.ratings.length,
      followedAt: f.createdAt
    }));

    res.status(200).json(formattedFollowing);
  } catch (error) {
    console.error('Following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
