import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'
import { enforceRateLimit } from '../../lib/rateLimit'
import { ensureVideo } from '../../lib/videos'
import { cleanVideoId } from '../../utils/videoUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!enforceRateLimit(req, res, { id: `favorites:${me.id}`, limit: 60, windowMs: 60_000 })) {
    return
  }

  try {
    // GET - Load user's favorites
    if (req.method === 'GET') {
      
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
      const videoId = cleanVideoId(req.body?.videoId)
      if (!videoId) {
        return res.status(400).json({ error: 'Missing or invalid videoId' })
      }

      // Client metadata is only a hint for a brand-new row (see lib/videos.ts).
      const exists = await ensureVideo(videoId, {
        title: req.body.videoTitle ?? req.body.title,
        channel: req.body.videoChannel ?? req.body.channel,
        thumbnail: req.body.videoThumbnail ?? req.body.thumbnail,
      })
      if (exists === 'missing') {
        return res.status(404).json({ error: 'That video isn’t available on YouTube.' })
      }

      // Add to user's favorites
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { connect: { id: videoId } }
        }
      })

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

      videoId = cleanVideoId(videoId)
      if (!videoId) {
        return res.status(400).json({ error: 'Missing or invalid videoId' })
      }

      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { disconnect: { id: videoId } }
        }
      })

      return res.status(200).json({ success: true, videoId })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Favorites API error:', error)
    return res.status(500).json({ error: 'Something went wrong updating your favourites.' })
  }
}
