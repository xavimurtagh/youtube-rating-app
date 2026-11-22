import type { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../../../lib/auth'
import { clientIp, enforceRateLimit } from '../../../../lib/rateLimit'
import { pollView } from '../../../../lib/pollView'

/** A poll as its current phase shows it. Public: visitors see the categories and the ballot. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const slug = typeof req.query.slug === 'string' ? req.query.slug.slice(0, 40) : ''

  const me = await getUser(req, res)
  if (!(await enforceRateLimit(req, res, { id: me ? `poll:${me.id}` : `poll:ip:${clientIp(req)}`, limit: 60, windowMs: 60_000 }))) return

  try {
    const view = await pollView(slug, me)
    if (!view) return res.status(404).json({ error: 'There’s no poll here.' })
    return res.status(200).json(view)
  } catch (error) {
    console.error('Poll API error:', error)
    return res.status(500).json({ error: 'The poll didn’t load. Try again in a moment.' })
  }
}
