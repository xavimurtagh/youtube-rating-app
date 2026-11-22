import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { cleanVideoId } from '../../../../utils/videoUtils'
import { ensureVideo, LIMITED_MESSAGE } from '../../../../lib/videos'
import { POLL_RULES, checkEligibility, phaseOf, pollDay } from '../../../../lib/polls'
import { loadPoll } from '../../../../lib/pollStore'
import { pollView } from '../../../../lib/pollView'

/**
 * Nominate a video in a category (POST), or withdraw a nomination (DELETE),
 * while nominations are open. Body: { category: <slug>, video: <id or link> }.
 * Up to three per member per category; the video must have been published in
 * the poll's year, and fit the category (Shorts are under ten minutes).
 * Answers with the poll as it now stands.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Sign in to nominate.' })
  if (!(await enforceRateLimit(req, res, { id: `nominate:${me.id}`, limit: 30, windowMs: 60_000 }))) return

  const slug = typeof req.query.slug === 'string' ? req.query.slug.slice(0, 40) : ''
  const videoId = cleanVideoId(req.body?.video)
  const categorySlug = typeof req.body?.category === 'string' ? req.body.category.slice(0, 40) : ''
  if (!videoId) return res.status(400).json({ error: 'That doesn’t look like a YouTube link.' })

  try {
    const poll = await loadPoll(slug)
    if (!poll) return res.status(404).json({ error: 'There’s no poll here.' })
    const category = poll.categories.find((c) => c.slug === categorySlug)
    if (!category) return res.status(400).json({ error: 'Choose a category.' })

    const phase = phaseOf(poll)
    if (phase === 'upcoming') return res.status(409).json({ error: `Nominations open on ${pollDay(poll.opensAt)}.` })
    if (phase !== 'nominations') return res.status(409).json({ error: 'Nominations have closed.' })

    if (req.method === 'DELETE') {
      const entry = await prisma.pollEntry.findUnique({ where: { categoryId_videoId: { categoryId: category.id, videoId } }, select: { id: true } })
      if (entry) {
        await prisma.pollNomination.deleteMany({ where: { userId: me.id, entryId: entry.id } })
        // An entry nobody nominates any more goes.
        await prisma.pollEntry.deleteMany({ where: { id: entry.id, removedAt: null, nominations: { none: {} } } })
      }
      return res.status(200).json(await pollView(slug, me))
    }

    const existing = await prisma.pollEntry.findUnique({
      where: { categoryId_videoId: { categoryId: category.id, videoId } },
      select: { id: true, removedAt: true, nominations: { where: { userId: me.id }, select: { id: true } } },
    })
    if (existing?.removedAt) return res.status(409).json({ error: 'That one has been taken off the ballot.' })
    if (existing && existing.nominations.length > 0) return res.status(200).json(await pollView(slug, me))

    const mine = await prisma.pollNomination.count({ where: { userId: me.id, entry: { categoryId: category.id } } })
    if (mine >= POLL_RULES.nominationsPerCategory) {
      return res.status(409).json({ error: `You’ve nominated three in ${category.title}. Withdraw one to choose another.` })
    }

    const found = await ensureVideo(videoId, {}, me.id, { details: true })
    if (found === 'missing') return res.status(404).json({ error: 'That video isn’t available on YouTube.' })
    if (found === 'limited') return res.status(429).json({ error: LIMITED_MESSAGE })

    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { publishedAt: true, duration: true, available: true } })
    if (!video || !video.available) return res.status(404).json({ error: 'That video isn’t available on YouTube.' })
    const eligible = checkEligibility(poll, category, video)
    if (!eligible.ok) return res.status(eligible.reason === 'unknown' ? 503 : 422).json({ error: eligible.message })

    const entry = await prisma.pollEntry.upsert({
      where: { categoryId_videoId: { categoryId: category.id, videoId } },
      create: { categoryId: category.id, videoId },
      update: {},
      select: { id: true },
    })
    await prisma.pollNomination.upsert({
      where: { userId_entryId: { userId: me.id, entryId: entry.id } },
      create: { userId: me.id, entryId: entry.id },
      update: {},
    })
    return res.status(200).json(await pollView(slug, me))
  } catch (error) {
    console.error('Nominate API error:', error)
    return res.status(500).json({ error: 'That didn’t save. Try again in a moment.' })
  }
}
