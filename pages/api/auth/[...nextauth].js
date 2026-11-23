import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '../../../lib/prisma'
import { decideAccount } from '../../../lib/account'
import { hasPass, turnstileEnabled } from '../../../lib/human'
import { clientIp, rateLimitShared } from '../../../lib/rateLimit'

// New accounts, so a script can't mint thousands. Generous per network, since
// a whole film society may sign up from one campus address in an evening.
const SIGNUPS_PER_IP_DAILY = Number(process.env.SIGNUPS_PER_IP_DAILY || 25)
const SIGNUPS_HOURLY = Number(process.env.SIGNUPS_HOURLY || 1000)

const ROW = { id: true, email: true, googleId: true }

/** Whether a brand-new account may be made now: a person, within the limits. */
async function signUpGate(req) {
  if (!req) return 'Configuration'
  if (turnstileEnabled() && !hasPass(req, 'signup', '-')) return 'HumanCheck'
  const ip = clientIp(req)
  const perIp = await rateLimitShared(`signup:ip:${ip}`, SIGNUPS_PER_IP_DAILY, 24 * 3600 * 1000)
  if (!perIp.ok) return 'TooManySignups'
  const all = await rateLimitShared('signup:all', SIGNUPS_HOURLY, 3600 * 1000)
  if (!all.ok) return 'TooManySignups'
  return null
}

/**
 * Options for one request. The sign-in callback needs the request (for the
 * human check and per-network limits); everything else, including
 * getServerSession in lib/auth.ts, uses `authOptions`.
 */
export function authOptionsFor(req) {
  return {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    ],
    // Note: we intentionally do not forward the Google access/refresh tokens to
    // the client session. The app authenticates users with Google but does not
    // call the YouTube Data API on their behalf, so exposing those tokens to the
    // browser would be an unnecessary risk.
    pages: {
      error: '/auth/error',
    },
    callbacks: {
      // Find or create the account, matched on Google's permanent id. If Google
      // sends no name, use a neutral one rather than the email address, which
      // would otherwise appear publicly.
      async signIn({ user, account, profile }) {
        const googleId = account?.providerAccountId
        const email = profile?.email || user?.email
        if (!googleId || !email) return false

        const [byGoogleId, byEmail] = await Promise.all([
          prisma.user.findUnique({ where: { googleId }, select: ROW }),
          prisma.user.findUnique({ where: { email }, select: ROW }),
        ])
        const decision = decideAccount(byGoogleId, byEmail, email, profile?.email_verified === true)
        const name = (user?.name || '').trim()
        const looks = { ...(name ? { name } : {}), avatar: user?.image || null }

        switch (decision.kind) {
          case 'existing':
            await prisma.user.update({
              where: { id: decision.user.id },
              data: { ...looks, ...(decision.updateEmail ? { email } : {}) },
            })
            return true
          case 'link':
            await prisma.user.update({ where: { id: decision.user.id }, data: { ...looks, googleId } })
            return true
          case 'conflict':
            console.warn('Sign-in refused: the address belongs to an account tied to another Google account', decision.user.id)
            return '/auth/error?error=AccountConflict'
          case 'unverified':
            return '/auth/error?error=Unverified'
          default: {
            const refused = await signUpGate(req)
            if (refused) return `/auth/error?error=${refused}`
            await prisma.user.create({ data: { email, googleId, name: name || 'Member', avatar: user?.image || null } })
            return true
          }
        }
      },

      // The session carries our own account id. Tokens issued before accounts
      // were tied to Google ids are resolved once: their `sub` is the Google id.
      async jwt({ token, account }) {
        if (account?.providerAccountId) {
          const row = await prisma.user.findUnique({ where: { googleId: account.providerAccountId }, select: { id: true } })
          token.uid = row?.id || null
        } else if (!token.uid && token.sub) {
          const row =
            (await prisma.user.findUnique({ where: { googleId: token.sub }, select: ROW })) ||
            (token.email ? await prisma.user.findUnique({ where: { email: token.email }, select: ROW }) : null)
          // Throwing clears the session cookie: an address now held by a
          // different Google account must not stay signed in.
          if (row && row.googleId && row.googleId !== token.sub) throw new Error('Session belongs to another Google account')
          token.uid = row?.id || null
        }
        return token
      },

      async session({ session, token }) {
        if (session.user) session.user.id = token.uid || null
        return session
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
  }
}

export const authOptions = authOptionsFor(null)

export default function auth(req, res) {
  return NextAuth(req, res, authOptionsFor(req))
}
