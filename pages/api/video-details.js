import { getVideosDetails } from '../../utils/youtube';
import { prisma } from '../../lib/prisma';
import { cleanVideoId } from '../../utils/videoUtils';

const MAX_IDS = 50;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = Array.isArray(req.body?.videoIds) ? req.body.videoIds : [];
  const ids = Array.from(new Set(raw.map(cleanVideoId).filter(Boolean))).slice(0, MAX_IDS);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'videoIds array required' });
  }

  try {
    // One batched call (1 quota unit) no matter how many ids, up to 50.
    const found = await getVideosDetails(ids);

    const videos = ids.map((id) => {
      const v = found.get(id);
      if (!v) return { id, found: false };
      return {
        id: v.id,
        title: v.title,
        channel: v.channel,
        category: v.category || null,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
        duration: v.duration,
        embeddable: v.embeddable !== false,
      };
    });

    // Opportunistically backfill categories on stored videos (never overwriting).
    await Promise.all(
      videos
        .filter((v) => v.found !== false && v.category)
        .map((v) =>
          prisma.video
            .updateMany({ where: { id: v.id, category: null }, data: { category: v.category } })
            .catch(() => {})
        )
    );

    res.status(200).json({ videos });
  } catch (error) {
    console.error('Video details API error:', error);
    res.status(502).json({ error: 'Could not reach YouTube for video details' });
  }
}
