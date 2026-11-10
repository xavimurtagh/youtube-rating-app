import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { normaliseQuery, startOfPacificDay, SEARCH_CACHE_HOURS, SEARCH_DAILY_CALLS } from '../../../lib/quota'
import { searchVideos } from '../../../utils/youtube'

/**
 * Video search. YouTube allows only about 100 searches a day by default
 * (search.list has its own quota bucket), so this route:
 * - is for signed-in members only, with a per-person hourly limit;
 * - answers repeat queries from a 24-hour cache;
 * - stops calling YouTube once the day's search budget is spent;
 * - always includes matching videos already rated here, which cost nothing.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = typeof req.query.q === 'string' ? req.query.q : ''
  const query = normaliseQuery(raw)
  if (!query) return res.status(400).json({ error: 'Query parameter is required' })

  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Sign in to search' })

  if (!enforceRateLimit(req, res, { id: `yt-search:${me.id}`, limit: 30, windowMs: 60 * 60 * 1000 })) return

  try {
    const local = await prisma.video.findMany({
      where: {
        available: true,
        ratings: { some: {} },
        OR: [
          { title: { contains: raw.trim(), mode: 'insensitive' } },
          { channel: { contains: raw.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, channel: true, thumbnail: true, category: true },
      orderBy: { ratings: { _count: 'desc' } },
      take: 6,
    })

    const fresh = new Date(Date.now() - SEARCH_CACHE_HOURS * 3600 * 1000)
    const cached = await prisma.searchCache.findUnique({ where: { query } })
    if (cached && cached.createdAt > fresh) {
      return res.status(200).json({ local, videos: cached.results, cached: true })
    }

    const callsToday = await prisma.searchCache.count({ where: { createdAt: { gte: startOfPacificDay() } } })
    if (callsToday >= SEARCH_DAILY_CALLS) {
      return res.status(200).json({ local, videos: cached ? cached.results : [], limited: true })
    }

    const videos = await searchVideos(query, 25)
    await prisma.searchCache.upsert({
      where: { query },
      create: { query, results: videos },
      update: { results: videos, createdAt: new Date() },
    })
    return res.status(200).json({ local, videos })
  } catch (error: any) {
    console.error('Search API error:', error?.message || error)
    const quota = /quota/i.test(String(error?.message || ''))
    return res
      .status(quota ? 429 : 502)
      .json({ error: quota ? 'Search is resting until tomorrow.' : 'Could not reach YouTube for search' })
  }
}
