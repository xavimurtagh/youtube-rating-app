import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, 
        name: true, 
        avatar: true, 
        bio: true,
        favourites: { 
          select: { id: true, title: true, channel: true, thumbnail: true } 
        },
        ratings: { 
          select: { videoId: true, score: true } 
        },
        followers: { 
          select: { followerId: true } 
        },
        following: { 
          select: { followeeId: true } 
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
