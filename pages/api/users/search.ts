import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';
import { enforceRateLimit } from '../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!enforceRateLimit(req, res, { id: `search:${me.id}`, limit: 30, windowMs: 60_000 })) {
      return;
    }

    const raw = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (raw.length < 2) {
      return res.status(400).json({ error: 'Type at least two characters' });
    }

    // An email address only matches exactly, so nobody can work out someone's
    // address a letter at a time. Names match anywhere.
    const match = raw.includes('@')
      ? { email: { equals: raw, mode: 'insensitive' as const } }
      : { name: { contains: raw, mode: 'insensitive' as const } };

    const users = await prisma.user.findMany({
      where: { id: { not: me.id }, discoverable: true, ...match },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        publicProfile: true,
        _count: { select: { ratings: true } },
        followers: { where: { followerId: me.id }, select: { id: true } },
      },
      take: raw.includes('@') ? 1 : 20,
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      // Private profiles don't reveal how much they rate.
      totalRatings: user.publicProfile ? user._count.ratings : null,
      isFollowing: user.followers.length > 0,
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
