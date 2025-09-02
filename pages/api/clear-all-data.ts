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
    console.log('Clearing all data for user:', me.id)

    // Use a transaction to ensure all data is cleared together
    await prisma.$transaction(async (tx) => {
      // Clear user's ratings
      await tx.rating.deleteMany({
        where: { userId: me.id }
      })

      // Clear user's social connections
      await tx.user.update({
        where: { id: me.id },
        data: {
          following: { set: [] },
          followedBy: { set: [] },
          favourites: { set: [] }
        }
      })

      // Optionally clear the user account entirely
      // Uncomment the line below if you want to delete the user account too
      // await tx.user.delete({ where: { id: me.id } })
    })

    console.log('Successfully cleared all user data')
    return res.status(200).json({ success: true, message: 'All data cleared successfully' })

  } catch (error) {
    console.error('Clear all data error:', error)
    return res.status(500).json({ error: 'Failed to clear data', details: error.message })
  }
}
