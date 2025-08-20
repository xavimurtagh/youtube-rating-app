import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req, res) {
  const me = await getUser(req, res);
  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { videoId } = req.body;
    try {
      const existing = await prisma.user.findFirst({
        where: {
          id: me.id,
          favourites: { some: { id: videoId } }
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'Already a favorite' });
      }

      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: {
            connect: { id: videoId }
          }
        }
      });

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Add favorite error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { videoId } = req.body;
    try {
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: {
            disconnect: { id: videoId }
          }
        }
      });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Remove favorite error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
