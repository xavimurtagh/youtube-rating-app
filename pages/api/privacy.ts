import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

const FIELDS = ['discoverable', 'publicProfile', 'showActivity', 'allowRecommendations'] as const

const pick = (u: any) => ({
  discoverable: u.discoverable,
  publicProfile: u.publicProfile,
  showActivity: u.showActivity,
  allowRecommendations: u.allowRecommendations,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)
  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    return res.status(200).json(pick(me))
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const data: Record<string, boolean> = {}
    for (const f of FIELDS) {
      if (typeof req.body?.[f] === 'boolean') data[f] = req.body[f]
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' })
    }

    try {
      const updated = await prisma.user.update({ where: { id: me.id }, data })
      return res.status(200).json(pick(updated))
    } catch (error) {
      console.error('Privacy update error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}
