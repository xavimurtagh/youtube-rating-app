import { getVideoDetails } from '../../utils/youtube';
import { prisma } from '../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoIds } = req.body;

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array required' });
  }

  try {
    const videoDetails = [];

    for (const videoId of videoIds) {
      try {
        const details = await getVideoDetails(videoId);
        videoDetails.push({
          id: details.id,
          title: details.title,
          channel: details.channel,
          category: details.category || null,
          thumbnail: details.thumbnail,
          description: '',
          isMusic: false,
        });

        // Opportunistically backfill the category on existing rows (without
        // overwriting a value that's already set).
        if (details.category) {
          await prisma.video
            .updateMany({
              where: { id: details.id, category: null },
              data: { category: details.category },
            })
            .catch(() => {});
        }
      } catch (error) {
        console.error(`Failed to fetch details for video ${videoId}:`, error);
        videoDetails.push({
          id: videoId,
          title: 'Previously Rated Video',
          channel: 'Unknown Channel',
          category: null,
          thumbnail: null,
          isMusic: false,
        });
      }
    }

    res.status(200).json({ videos: videoDetails });
  } catch (error) {
    console.error('Video details API error:', error);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
}
