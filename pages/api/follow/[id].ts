import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
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

    if (me.id === id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    if (req.method === 'POST') {
      await prisma.follow.upsert({
        where: { followerId_followeeId: { followerId: me.id, followeeId: id } },
        create: { followerId: me.id, followeeId: id },
        update: {}
      });
      res.status(200).json({ ok: true });
    } else if (req.method === 'DELETE') {
      await prisma.follow.deleteMany({
        where: { followerId: me.id, followeeId: id }
      });
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
