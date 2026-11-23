import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { isAdmin } from '../../../../lib/admin'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { loadPoll } from '../../../../lib/pollStore'
import { pollView } from '../../../../lib/pollView'

/**
 * Admins only: take an entry off the ballot, or put it back, and clear a
 * burst flag once it's been looked at. Body: { entryId, action: "remove" |
 * "restore" | "clear-flag" }.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const me = await getUser(req, res)
  if (!me || !isAdmin(me)) return res.status(403).json({ error: 'Not allowed' })
  if (!(await enforceRateLimit(req, res, { id: `moderate:${me.id}`, limit: 60, windowMs: 60_000 }))) return

  const slug = typeof req.query.slug === 'string' ? req.query.slug.slice(0, 40) : ''
  const entryId = typeof req.body?.entryId === 'string' ? req.body.entryId.slice(0, 64) : ''
  const action = req.body?.action

  try {
    const poll = await loadPoll(slug)
    if (!poll) return res.status(404).json({ error: 'There’s no poll here.' })
    const entry = await prisma.pollEntry.findFirst({ where: { id: entryId, category: { pollId: poll.id } }, select: { id: true, videoId: true } })
    if (!entry) return res.status(404).json({ error: 'No such entry.' })

    if (action === 'remove' || action === 'restore') {
      await prisma.pollEntry.update({ where: { id: entry.id }, data: { removedAt: action === 'remove' ? new Date() : null } })
      console.info(`Poll ${slug}: ${me.id} ${action === 'remove' ? 'removed' : 'restored'} entry ${entry.id}`)
    } else if (action === 'clear-flag') {
      await prisma.reviewFlag.updateMany({ where: { videoId: entry.videoId, resolvedAt: null }, data: { resolvedAt: new Date() } })
    } else {
      return res.status(400).json({ error: 'Unknown action' })
    }
    return res.status(200).json(await pollView(slug, me))
  } catch (error) {
    console.error('Moderate API error:', error)
    return res.status(500).json({ error: 'That didn’t work. Try again.' })
  }
}
