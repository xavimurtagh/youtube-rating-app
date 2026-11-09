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

    const activities = await prisma.activity.findMany({
      where: {
        user: {
          showActivity: true,
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

    // Titles come from the Video table (refreshed within 30 days), not from
    // the activity row; activity for videos YouTube no longer serves is dropped.
    const ids = Array.from(new Set(activities.map((a: { videoId: string }) => a.videoId)))
    const videos = await prisma.video.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, channel: true, available: true },
    })
    type VideoTitle = { id: string; title: string; channel: string; available: boolean }
    const byId = new Map<string, VideoTitle>(videos.map((v: VideoTitle) => [v.id, v]))
    const feed = activities
      .filter((a) => byId.get(a.videoId)?.available !== false)
      .map((a) => {
        const v = byId.get(a.videoId)
        const data = a.data && typeof a.data === 'object' && !Array.isArray(a.data) ? a.data : {}
        return { ...a, data: { ...data, title: v?.title ?? null, channel: v?.channel ?? null } }
      })

    res.status(200).json(feed);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
