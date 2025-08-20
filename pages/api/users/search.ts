import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

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

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Search users by name or email (case insensitive)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: me.id } }, // Exclude current user
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        ratings: { select: { id: true } }, // Count ratings
        followers: { 
          where: { followerId: me.id },
          select: { id: true }
        }
      },
      take: 20
    });

    // Format response with follow status
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      totalRatings: user.ratings.length,
      isFollowing: user.followers.length > 0
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
