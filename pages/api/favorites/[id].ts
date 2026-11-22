import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { cleanVideoId } from '../../../utils/videoUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!(await enforceRateLimit(req, res, { id: `favorites:${me.id}`, limit: 60, windowMs: 60_000 }))) {
    return
  }

  const videoId = cleanVideoId(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id)
  if (!videoId) {
    return res.status(400).json({ error: 'Missing or invalid videoId' })
  }

  try {
    if (req.method === 'DELETE') {
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })
      return res.status(200).json({ success: true, videoId })
    }

    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Delete favorite error:', error)
    return res.status(500).json({ error: 'Something went wrong updating your favourites.' })
  }
}
