import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // GET - Load user's favorites
    if (req.method === 'GET') {
      console.log('Loading favorites for user:', me.id)
      
      const user = await prisma.user.findUnique({
        where: { id: me.id },
        include: {
          favourites: {
            select: {
              id: true,
              title: true,
              channel: true,
              thumbnail: true
            }
          }
        }
      })

      const favorites = user?.favourites || []
      console.log('Found favorites:', favorites.length)
      
      // Return favorites in the format expected by frontend
      const formattedFavorites = favorites.map(fav => ({
        videoId: fav.id,
        id: fav.id, // Also include as id for compatibility
        title: fav.title,
        channel: fav.channel,
        thumbnail: fav.thumbnail
      }))

      return res.status(200).json(formattedFavorites)
    }

    // POST - Add to favorites
    if (req.method === 'POST') {
      // Accept both naming conventions (videoTitle/title, etc.) so either
      // caller works.
      const { videoId } = req.body
      const title = req.body.videoTitle ?? req.body.title
      const channel = req.body.videoChannel ?? req.body.channel
      const thumbnail = req.body.videoThumbnail ?? req.body.thumbnail

      if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' })
      }

      // Ensure video exists with proper field mapping
      await prisma.video.upsert({
        where: { id: videoId },
        create: {
          id: videoId,
          title: title || 'Unknown Video',
          channel: channel || 'Unknown Channel',
          thumbnail: thumbnail || null
        },
        update: {
          // Only update if we have better data
          ...(title && { title }),
          ...(channel && { channel }),
          ...(thumbnail && { thumbnail })
        }
      })

      // Add to user's favorites
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { connect: { id: videoId } }
        }
      })

      console.log('Successfully added to favorites')
      return res.status(200).json({ success: true, videoId })
    }

    // DELETE - Remove from favorites (handle both URL patterns)
    if (req.method === 'DELETE') {
      // Extract videoId from either body or URL path
      let videoId = req.body?.videoId
      
      if (!videoId && req.url) {
        // Extract from URL like /api/favorites/VIDEO_ID
        const urlParts = req.url.split('/')
        videoId = urlParts[urlParts.length - 1]
        
        // Handle query parameters
        if (videoId?.includes('?')) {
          videoId = videoId.split('?')[0]
        }
      }

      if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' })
      }

      console.log('Removing from favorites:', videoId)

      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })

      console.log('Successfully removed from favorites')
      return res.status(200).json({ success: true, videoId })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Favorites API error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
