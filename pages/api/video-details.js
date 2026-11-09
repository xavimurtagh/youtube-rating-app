import { getVideosDetails } from '../../utils/youtube';
import { prisma } from '../../lib/prisma';
import { cleanVideoId } from '../../utils/videoUtils';
import { enforceRateLimit, clientIp } from '../../lib/rateLimit';

const MAX_IDS = 50;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceRateLimit(req, res, { id: `video-details:${clientIp(req)}`, limit: 60, windowMs: 60 * 1000 })) return;

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

    // Anything we fetched counts as a refresh of the stored copy (YouTube data
    // must be no more than 30 days old). Videos YouTube no longer serves keep
    // their id, because members' ratings point at it, but lose YouTube's data.
    const now = new Date();
    await Promise.all(
      videos.map((v) =>
        prisma.video
          .updateMany({
            where: { id: v.id },
            data:
              v.found === false
                ? { available: false, title: 'Unavailable video', channel: '', thumbnail: null, refreshedAt: now }
                : {
                    title: v.title,
                    channel: v.channel,
                    thumbnail: v.thumbnail || null,
                    ...(v.category ? { category: v.category } : {}),
                    available: true,
                    refreshedAt: now,
                  },
          })
          .catch(() => {})
      )
    );

    res.status(200).json({ videos });
  } catch (error) {
    console.error('Video details API error:', error);
    res.status(502).json({ error: 'Could not reach YouTube for video details' });
  }
}
