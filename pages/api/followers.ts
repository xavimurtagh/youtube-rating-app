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

    const followers = await prisma.follow.findMany({
      where: { followeeId: me.id },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            publicProfile: true,
            _count: { select: { ratings: true } }
          }
        }
      }
    });

    const formattedFollowers = followers.map(f => ({
      id: f.follower.id,
      name: f.follower.name,
      avatar: f.follower.avatar,
      bio: f.follower.bio,
      totalRatings: f.follower.publicProfile ? f.follower._count.ratings : null,
      followedAt: f.createdAt
    }));

    res.status(200).json(formattedFollowers);
  } catch (error) {
    console.error('Followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
