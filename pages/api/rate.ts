import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req, res) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'POST') {
      // Existing POST logic for adding/updating ratings
      const { video, score } = req.body
      
      if (!video?.id || score === undefined) {
        return res.status(400).json({ error: 'Missing video or score' })
      }

      // Ensure video exists
      await prisma.video.upsert({
        where: { id: video.id },
        create: {
          id: video.id,
          title: video.title || 'Unknown Video',
          channel: video.channel || 'Unknown Channel',
          thumbnail: video.thumbnail || null
        },
        update: {
          ...(video.title && { title: video.title }),
          ...(video.channel && { channel: video.channel }),
          ...(video.thumbnail && { thumbnail: video.thumbnail })
        }
      })

      // Create or update rating
      await prisma.rating.upsert({
        where: {
          userId_videoId: {
            userId: me.id,
            videoId: video.id
          }
        },
        create: {
          userId: me.id,
          videoId: video.id,
          score: parseFloat(score)
        },
        update: {
          score: parseFloat(score)
        }
      })

      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { videoId } = req.body
      
      if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' })
      }

      console.log('Completely deleting rating for user:', me.id, 'video:', videoId)

      // Delete the rating completely from database
      const deletedRating = await prisma.rating.deleteMany({
        where: {
          userId: me.id,
          videoId: videoId
        }
      })

      console.log('Deleted ratings:', deletedRating.count)

      // Also remove from favorites if it exists there
      await prisma.user.update({
        where: { id: me.id },
        data: {
          favourites: { 
            disconnect: { id: videoId }
          }
        }
      }).catch(() => {
        // Ignore error if video wasn't in favorites
        console.log('Video was not in favorites, continuing...')
      })

      return res.status(200).json({ 
        success: true, 
        deleted: deletedRating.count,
        videoId: videoId
      })
    }

    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Rating API error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
