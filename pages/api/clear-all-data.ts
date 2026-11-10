import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getUser(req, res)

  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Deleting is complete: ratings, activity, follows in both directions,
    // favourites, then the account itself. Signing in again starts afresh.
    await prisma.$transaction(async (tx) => {
      await tx.rating.deleteMany({ where: { userId: me.id } })
      await tx.activity.deleteMany({ where: { userId: me.id } })
      await tx.follow.deleteMany({ where: { OR: [{ followerId: me.id }, { followeeId: me.id }] } })
      await tx.user.update({ where: { id: me.id }, data: { favourites: { set: [] } } })
      await tx.user.delete({ where: { id: me.id } })
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return res.status(500).json({ error: 'Could not delete your data. Nothing was removed.' })
  }
}
