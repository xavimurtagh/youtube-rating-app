import type { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../lib/auth'
import { clientIp, enforceRateLimit } from '../../lib/rateLimit'
import { makePass, passCookie, turnstileEnabled, verifyTurnstile, type HumanPurpose } from '../../lib/human'

/**
 * Exchanges a solved Turnstile challenge for a short-lived pass cookie.
 * - purpose "signup": anyone; checked when a new account is created.
 * - purpose "rate": the signed-in member; checked when they rate in a burst.
 * With Turnstile off (no keys), it answers ok and sets nothing.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const purpose: HumanPurpose | null = req.body?.purpose === 'signup' ? 'signup' : req.body?.purpose === 'rate' ? 'rate' : null
  if (!purpose) return res.status(400).json({ error: 'Unknown check' })

  const ip = clientIp(req)
  if (!(await enforceRateLimit(req, res, { id: `human:${ip}`, limit: 20, windowMs: 10 * 60_000 }))) return

  if (!turnstileEnabled()) return res.status(200).json({ ok: true, skipped: true })

  let subject = '-'
  if (purpose === 'rate') {
    const me = await getUser(req, res)
    if (!me) return res.status(401).json({ error: 'Unauthorized' })
    subject = me.id
  }

  if (!(await verifyTurnstile(req.body?.token, ip))) {
    return res.status(403).json({ error: 'We couldn’t confirm that. Please try again.' })
  }

  res.setHeader('Set-Cookie', passCookie(purpose, makePass(purpose, subject)))
  return res.status(200).json({ ok: true })
}
