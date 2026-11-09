import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { REFRESH_AFTER_DAYS } from '../../../lib/quota'
import { getVideosDetails } from '../../../utils/youtube'

// Vercel runs this once a day (see vercel.json) with
// `Authorization: Bearer $CRON_SECRET`.
export const config = { maxDuration: 60 }

const BATCH = 50 // videos.list takes up to 50 ids for 1 quota unit
const PER_RUN = Number(process.env.REFRESH_VIDEOS_PER_RUN || 1000)

/**
 * Keeps stored YouTube data within the 30-day limit in YouTube's developer
 * policies: re-fetches videos last refreshed more than REFRESH_AFTER_DAYS ago,
 * strips YouTube data from videos that have been removed, and clears old
 * search results. 1,000 videos cost 20 quota units.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 24 * 3600 * 1000)
  const stale = await prisma.video.findMany({
    where: { available: true, OR: [{ refreshedAt: null }, { refreshedAt: { lt: cutoff } }] },
    select: { id: true },
    orderBy: { refreshedAt: { sort: 'asc', nulls: 'first' } },
    take: PER_RUN,
  })

  let refreshed = 0
  let unavailable = 0
  let stoppedEarly: string | null = null

  for (let i = 0; i < stale.length; i += BATCH) {
    const ids = stale.slice(i, i + BATCH).map((v: { id: string }) => v.id)
    let found: Map<string, any>
    try {
      found = await getVideosDetails(ids)
    } catch (error: any) {
      // Out of quota or YouTube unreachable: try again tomorrow.
      stoppedEarly = String(error?.message || error)
      break
    }
    const now = new Date()
    await prisma.$transaction(
      ids.map((id: string) => {
        const v = found.get(id)
        if (v) {
          refreshed++
          return prisma.video.update({
            where: { id },
            data: {
              title: v.title,
              channel: v.channel,
              thumbnail: v.thumbnail || null,
              ...(v.category ? { category: v.category } : {}),
              refreshedAt: now,
            },
          })
        }
        unavailable++
        return prisma.video.update({
          where: { id },
          data: { available: false, title: 'Unavailable video', channel: '', thumbnail: null, refreshedAt: now },
        })
      })
    )
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000)
  const { count: searchesCleared } = await prisma.searchCache.deleteMany({ where: { createdAt: { lt: twoDaysAgo } } })

  // Older activity rows carried a copy of the video title; the feed now reads
  // titles from the refreshed Video table, so drop the copies.
  const activityCleaned = await prisma.$executeRaw`UPDATE "Activity" SET data = (data::jsonb - 'title' - 'channel') WHERE data::jsonb ? 'title' OR data::jsonb ? 'channel'`

  return res.status(200).json({ checked: stale.length, refreshed, unavailable, searchesCleared, activityCleaned, stoppedEarly })
}
