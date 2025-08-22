import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)
  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { videoId, title, channel, thumbnail } = req.body
  
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' })
  }

  try {
    // Ensure video exists with fallback values for missing fields
    await prisma.video.upsert({
      where: { id: videoId },
      create: { 
        id: videoId, 
        title: title || 'Previously Rated Video',  // Fallback
        channel: channel || 'Unknown Channel',      // Fallback
        thumbnail: thumbnail || null 
      },
      update: {
        // Only update if we have better data
        ...(title && { title }),
        ...(channel && { channel }),
        ...(thumbnail && { thumbnail })
      }
    })

    if (req.method === 'POST') {
      console.log('Adding to favorites for user:', me.id)
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { connect: { id: videoId } }
        }
      })
      console.log('Successfully added to favorites')
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      console.log('Removing from favorites for user:', me.id)
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })
      console.log('Successfully removed from favorites')
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Favorites API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
