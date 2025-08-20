import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Use NextAuth session instead of JWT
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (me.id === id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'POST') {
      // Follow user
      await prisma.follow.upsert({
        where: { 
          followerId_followeeId: { 
            followerId: me.id, 
            followeeId: id 
          } 
        },
        create: { 
          followerId: me.id, 
          followeeId: id 
        },
        update: {} // No updates needed if already exists
      });

      res.status(200).json({ ok: true, message: 'Successfully followed user' });
      
    } else if (req.method === 'DELETE') {
      // Unfollow user
      await prisma.follow.deleteMany({
        where: { 
          followerId: me.id, 
          followeeId: id 
        }
      });

      res.status(200).json({ ok: true, message: 'Successfully unfollowed user' });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Follow error details:', error);
    
    // More specific error handling
    if (error.code === 'P2002') {
      // Prisma unique constraint violation (trying to follow twice)
      return res.status(409).json({ error: 'Already following this user' });
    }
    
    if (error.code === 'P2025') {
      // Prisma record not found
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}
