import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { enforceRateLimit } from '../../lib/rateLimit'
import { cleanVideoId } from '../../utils/videoUtils'
import { ensureVideo, LIMITED_MESSAGE } from '../../lib/videos'
import { crowdMoods, describeMoods } from '../../lib/moods'
import { durationSeconds } from '../../lib/format'
import { likelyScore, MAX_SAVED, SAVED_SOURCES } from '../../lib/saved'
import { sealedSet } from '../../lib/pollStore'

/**
 * Saved: watch later, from anywhere.
 *
 * GET           your Saved list, newest first, with each video's length, the
 *               moods the crowd agrees on, and which friends saved it too
 *               (only people you follow who share their activity).
 * GET ?ids=1    just the ids, for Save buttons across the app.
 * POST          { videoId (or a link), source } saves one.
 * DELETE        { videoId } removes one.
 *
 * Only ids are stored here; titles and lengths come from the Video table,
 * which is kept within YouTube's 30-day rule.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Unauthorized' })

  if (!(await enforceRateLimit(req, res, { id: `saved:${me.id}`, limit: 60, windowMs: 60_000 }))) return

  try {
    if (req.method === 'GET') {
      if (req.query.ids) {
        const rows = await prisma.savedVideo.findMany({
          where: { userId: me.id },
          select: { videoId: true, savedAt: true },
          orderBy: { savedAt: 'desc' },
          take: MAX_SAVED,
        })
        return res.status(200).json({ ids: rows })
      }

      const rows = await prisma.savedVideo.findMany({
        where: { userId: me.id, video: { available: true } },
        orderBy: { savedAt: 'desc' },
        take: MAX_SAVED,
        select: {
          videoId: true,
          savedAt: true,
          source: true,
          video: { select: { title: true, channel: true, duration: true, publishedAt: true } },
        },
      })
      const ids = rows.map((r) => r.videoId)

      const [tags, friendSaves, scores, sealed] = await Promise.all([
        prisma.moodTag.findMany({ where: { videoId: { in: ids } }, select: { videoId: true, userId: true, mood: true } }),
        prisma.savedVideo.findMany({
          where: {
            videoId: { in: ids },
            userId: { not: me.id },
            user: { publicProfile: true, showActivity: true, followers: { some: { followerId: me.id } } },
          },
          select: { videoId: true, user: { select: { name: true } } },
          orderBy: { savedAt: 'desc' },
          take: 3000,
        }),
        prisma.rating.groupBy({ by: ['videoId'], where: { videoId: { in: ids } }, _avg: { score: true }, _count: { _all: true } }),
        sealedSet(ids),
      ])

      const tagsBy = new Map<string, { userId: string; mood: string }[]>()
      for (const t of tags) tagsBy.set(t.videoId, [...(tagsBy.get(t.videoId) || []), t])
      const friendsBy = new Map<string, string[]>()
      for (const f of friendSaves) friendsBy.set(f.videoId, [...(friendsBy.get(f.videoId) || []), f.user.name])
      const scoreBy = new Map(scores.map((g) => [g.videoId, g]))

      const items = rows.map((r) => {
        const moods = crowdMoods(tagsBy.get(r.videoId) || [])
        const g = scoreBy.get(r.videoId)
        return {
          id: r.videoId,
          title: r.video.title,
          channel: r.video.channel,
          duration: r.video.duration,
          seconds: durationSeconds(r.video.duration),
          publishedAt: r.video.publishedAt ? r.video.publishedAt.toISOString() : null,
          savedAt: r.savedAt.toISOString(),
          source: r.source,
          moods: moods.map((m) => ({ mood: m.mood, share: Math.round(m.share * 100) / 100 })),
          moodLine: describeMoods(moods),
          // Members' scores for poll nominees stay sealed, even for ordering.
          likely: sealed.has(r.videoId) ? null : likelyScore(g?._avg.score ?? null, g?._count._all || 0),
          friends: (friendsBy.get(r.videoId) || []).slice(0, 3),
        }
      })
      return res.status(200).json({ items })
    }

    if (req.method === 'POST') {
      const videoId = cleanVideoId(req.body?.videoId)
      if (!videoId) return res.status(400).json({ error: 'That doesn’t look like a YouTube link.' })
      const source = SAVED_SOURCES.includes(req.body?.source) ? req.body.source : 'card'

      const already = await prisma.savedVideo.findUnique({ where: { userId_videoId: { userId: me.id, videoId } }, select: { savedAt: true } })
      if (already) return res.status(200).json({ saved: true, videoId, savedAt: already.savedAt })

      const count = await prisma.savedVideo.count({ where: { userId: me.id } })
      if (count >= MAX_SAVED) {
        return res.status(409).json({ error: 'Your Saved list is full. Watch or remove a few first.' })
      }

      const exists = await ensureVideo(videoId, req.body?.video || {}, me.id, { details: true })
      if (exists === 'missing') return res.status(404).json({ error: 'That video isn’t available on YouTube.' })
      if (exists === 'limited') return res.status(429).json({ error: LIMITED_MESSAGE })

      const row = await prisma.savedVideo.upsert({
        where: { userId_videoId: { userId: me.id, videoId } },
        create: { userId: me.id, videoId, source },
        update: {},
        select: { savedAt: true, video: { select: { title: true, channel: true } } },
      })
      return res.status(200).json({ saved: true, videoId, savedAt: row.savedAt, title: row.video.title, channel: row.video.channel })
    }

    if (req.method === 'DELETE') {
      const videoId = cleanVideoId(req.body?.videoId)
      if (!videoId) return res.status(400).json({ error: 'Missing or invalid videoId' })
      const { count } = await prisma.savedVideo.deleteMany({ where: { userId: me.id, videoId } })
      return res.status(200).json({ removed: count > 0, videoId })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Saved API error:', error)
    return res.status(500).json({ error: 'Something went wrong with your Saved list.' })
  }
}
