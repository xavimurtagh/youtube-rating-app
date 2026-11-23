import type { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../../../lib/auth'
import { clientIp, enforceRateLimit } from '../../../../lib/rateLimit'
import { resultsView } from '../../../../lib/pollView'

/** The results, once they're published (admins can preview them after voting closes). Public. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!(await enforceRateLimit(req, res, { id: `poll-results:${clientIp(req)}`, limit: 60, windowMs: 60_000 }))) return
  const slug = typeof req.query.slug === 'string' ? req.query.slug.slice(0, 40) : ''

  try {
    const view = await resultsView(slug, await getUser(req, res))
    if (!view) return res.status(404).json({ error: 'There’s no poll here.' })
    return res.status(200).json(view)
  } catch (error) {
    console.error('Poll results error:', error)
    return res.status(500).json({ error: 'The results didn’t load. Try again in a moment.' })
  }
}
