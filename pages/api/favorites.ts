import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)
  if (!me) return res.status(401).json({ error: 'Unauthorized' })

  const { videoId, title, channel, thumbnail } = req.body

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' })
  }

  try {
    // Ensure video exists
    await prisma.video.upsert({
      where: { id: videoId },
      create: { id: videoId, title, channel, thumbnail },
      update: {}
    })

    if (req.method === 'POST') {
      console.log('Received body:', req.body);
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { connect: { id: videoId } }
        }
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      // Remove from favorites
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Favorites API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
