import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const me = await getUser(req, res);
    if (!me) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { videoIds } = req.body;
    
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Invalid video IDs array' });
    }

    // Create videos if they don't exist and mark as ignored
    await Promise.all(
      videoIds.map(async (videoId) => {
        // This assumes you have an ignored videos table or field
        // Adjust based on your schema
        await prisma.ignoredVideo.upsert({
          where: { 
            userId_videoId: { 
              userId: me.id, 
              videoId: videoId 
            } 
          },
          create: { 
            userId: me.id, 
            videoId: videoId 
          },
          update: {}
        });
      })
    );

    res.status(200).json({ 
      ok: true, 
      message: `Successfully ignored ${videoIds.length} videos` 
    });
  } catch (error) {
    console.error('Bulk ignore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
