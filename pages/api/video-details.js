import { getVideosDetails } from '../../utils/youtube';
import { prisma } from '../../lib/prisma';
import { getUser } from '../../lib/auth';
import { cleanVideoId } from '../../utils/videoUtils';
import { enforceRateLimit, clientIp } from '../../lib/rateLimit';
import { REFRESH_AFTER_DAYS } from '../../lib/quota';

const MAX_IDS = 50;

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    channel: row.channel,
    category: row.category || null,
    thumbnail: row.thumbnail || null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    duration: row.duration || null,
    embeddable: true,
  };
}

/**
 * Video details for the watch page. Fresh rows come from our database at no
 * quota cost. Only signed-in members can make us ask YouTube, so nobody can
 * spend the shared daily quota anonymously. Whatever we fetch refreshes the
 * stored copy (YouTube data must be no more than 30 days old).
 */
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

  const me = await getUser(req, res);
  const limitId = me ? `video-details:${me.id}` : `video-details:ip:${clientIp(req)}`;
  if (!enforceRateLimit(req, res, { id: limitId, limit: 60, windowMs: 60 * 1000 })) return;

  try {
    const rows = await prisma.video.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const freshAfter = Date.now() - REFRESH_AFTER_DAYS * 24 * 3600 * 1000;
    const isFresh = (r) => r && r.available && r.duration && r.refreshedAt && r.refreshedAt.getTime() > freshAfter;

    const result = new Map();
    for (const id of ids) {
      const row = byId.get(id);
      if (isFresh(row)) result.set(id, fromRow(row));
      else if (row && row.available === false) result.set(id, { id, found: false });
    }

    const toFetch = ids.filter((id) => !result.has(id));
    if (me && toFetch.length > 0) {
      const found = await getVideosDetails(toFetch); // one call, 1 quota unit, up to 50 ids
      const now = new Date();
      await Promise.all(
        toFetch.map((id) => {
          const v = found.get(id);
          if (v) {
            result.set(id, {
              id: v.id,
              title: v.title,
              channel: v.channel,
              category: v.category || null,
              thumbnail: v.thumbnail || null,
              publishedAt: v.publishedAt || null,
              duration: v.duration || null,
              embeddable: v.embeddable !== false,
            });
          } else {
            result.set(id, { id, found: false });
          }
          if (!byId.has(id)) return null; // only rows members have rated or saved are stored
          const data = v
            ? {
                title: v.title,
                channel: v.channel,
                thumbnail: v.thumbnail || null,
                ...(v.category ? { category: v.category } : {}),
                duration: v.duration || null,
                publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                available: true,
                refreshedAt: now,
              }
            : { available: false, title: 'Unavailable video', channel: '', thumbnail: null, refreshedAt: now };
          return prisma.video.update({ where: { id }, data }).catch(() => null);
        })
      );
    }

    // Anything still unknown (a visitor who isn't signed in, asking about a
    // video nobody here has rated) is returned as unknown, not as missing.
    const videos = ids.map((id) => result.get(id) || (byId.has(id) ? fromRow(byId.get(id)) : { id, found: null }));
    return res.status(200).json({ videos });
  } catch (error) {
    console.error('Video details API error:', error?.message || error);
    return res.status(502).json({ error: 'Could not load video details' });
  }
}
