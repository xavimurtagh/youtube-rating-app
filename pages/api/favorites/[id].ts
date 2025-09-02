import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id: videoId } = req.query

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid videoId' })
  }

  try {
    if (req.method === 'DELETE') {
      console.log('Removing favorite:', videoId, 'for user:', me.id)

      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })

      console.log('Successfully removed from favorites')
      return res.status(200).json({ success: true, videoId })
    }

    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Delete favorite error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
