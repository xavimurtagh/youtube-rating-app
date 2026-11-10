import { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../lib/auth'

/** The signed-in user's own basic record (id, name, avatar, bio). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const me = await getUser(req, res)
  if (!me) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return res.status(200).json({ id: me.id, name: me.name, avatar: me.avatar, bio: me.bio })
}
