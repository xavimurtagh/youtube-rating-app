import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { enforceRateLimit } from '../../lib/rateLimit'
import { cleanVideoId } from '../../utils/videoUtils'
import { cleanMoods, crowdMoods, describeMoods } from '../../lib/moods'

/**
 * The mood tap: after rating a video, a member can describe it with up to two
 * words. POST { videoId, moods: [...] } replaces their choice for that video
 * (an empty list clears it). Only someone who has rated the video can tag it.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await enforceRateLimit(req, res, { id: `moods:${me.id}`, limit: 60, windowMs: 60_000 }))) return

  const videoId = cleanVideoId(req.body?.videoId)
  if (!videoId) return res.status(400).json({ error: 'Missing or invalid videoId' })
  const moods = cleanMoods(req.body?.moods)

  try {
    const rated = await prisma.rating.findUnique({ where: { userId_videoId: { userId: me.id, videoId } }, select: { id: true } })
    if (!rated) return res.status(409).json({ error: 'Rate it first, then say what it was like.' })

    await prisma.$transaction([
      prisma.moodTag.deleteMany({ where: { userId: me.id, videoId } }),
      ...(moods.length ? [prisma.moodTag.createMany({ data: moods.map((mood) => ({ userId: me.id, videoId, mood })) })] : []),
    ])

    const tags = await prisma.moodTag.findMany({ where: { videoId }, select: { userId: true, mood: true }, take: 5000 })
    const crowd = crowdMoods(tags)
    return res.status(200).json({ myMoods: moods, moods: crowd, moodLine: describeMoods(crowd) })
  } catch (error) {
    console.error('Moods API error:', error)
    return res.status(500).json({ error: 'Couldn’t save that just now.' })
  }
}
