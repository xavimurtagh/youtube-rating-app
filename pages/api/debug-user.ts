import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const me = await getUser(req, res);
    
    if (!me) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get ratings for this user
    const ratings = await prisma.rating.findMany({
      where: { userId: me.id },
      include: {
        video: {
          select: { id: true, title: true }
        }
      },
      orderBy: { ratedAt: 'desc' },
      take: 10
    });

    // Get all users for comparison
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      take: 10
    });

    return res.status(200).json({
      authenticatedUser: {
        id: me.id,
        email: me.email,
        name: me.name
      },
      ratingsCount: ratings.length,
      sampleRatings: ratings.map(r => ({
        videoId: r.videoId,
        score: r.score,
        videoTitle: r.video?.title,
        ratedAt: r.ratedAt
      })),
      allUsersInDb: allUsers
    });
  } catch (error) {
    console.error('Debug user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
