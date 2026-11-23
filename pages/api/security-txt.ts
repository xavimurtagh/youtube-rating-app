import type { NextApiRequest, NextApiResponse } from 'next'
import { BRAND } from '../../lib/brand'

/**
 * /.well-known/security.txt (RFC 9116), served from here so the contact comes
 * from NEXT_PUBLIC_CONTACT_EMAIL. Without a contact there's nothing useful to
 * say, so it's a 404 until one is set.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', ['GET', 'HEAD'])
    return res.status(405).end()
  }
  if (!BRAND.contact) return res.status(404).end()

  // Expires must be in the future, and less than a year away: 180 days, by the day.
  const expires = new Date(Date.now() + 180 * 864e5)
  expires.setUTCHours(0, 0, 0, 0)
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/+$/, '')

  const lines = [
    `Contact: mailto:${BRAND.contact}`,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: en',
    ...(base ? [`Policy: ${base}/security`, `Canonical: ${base}/.well-known/security.txt`] : []),
  ]
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  return res.status(200).send(`${lines.join('\n')}\n`)
}
