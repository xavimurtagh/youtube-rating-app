import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log everything for debugging
  console.log('=== FAVORITES API DEBUG ===')
  console.log('Method:', req.method)
  console.log('Content-Type:', req.headers['content-type'])
  console.log('Raw body:', req.body)
  console.log('Body type:', typeof req.body)
  console.log('Body stringified:', JSON.stringify(req.body, null, 2))

  const me = await getUser(req, res)
  if (!me) {
    console.log('User not authenticated')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  console.log('User authenticated:', me.id)

  // Check if body exists and is an object
  if (!req.body || typeof req.body !== 'object') {
    console.log('Invalid or missing request body')
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { videoId, title, channel, thumbnail } = req.body
  
  console.log('Extracted values:')
  console.log('- videoId:', videoId, typeof videoId)
  console.log('- title:', title, typeof title)
  console.log('- channel:', channel, typeof channel)
  console.log('- thumbnail:', thumbnail, typeof thumbnail)

  if (!videoId) {
    console.log('Missing videoId - returning 400')
    return res.status(400).json({ error: 'Missing videoId' })
  }

  try {
    // Ensure video exists
    console.log('Upserting video with id:', videoId)
    await prisma.video.upsert({
      where: { id: videoId },
      create: { id: videoId, title, channel, thumbnail },
      update: {}
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
