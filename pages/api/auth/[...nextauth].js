import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '../../../lib/prisma'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  // Note: we intentionally do not forward the Google access/refresh tokens to
  // the client session. The app authenticates users with Google but does not
  // call the YouTube Data API on their behalf, so exposing those tokens to the
  // browser would be an unnecessary risk.
  pages: {
    error: '/auth/error',
  },
  callbacks: {
    // Create the account (or refresh the picture) when someone signs in. If
    // Google sends no name, use a neutral one rather than the email address,
    // which would otherwise appear publicly.
    async signIn({ user }) {
      if (!user?.email) return false
      await prisma.user.upsert({
        where: { email: user.email },
        create: { email: user.email, name: (user.name || '').trim() || 'Member', avatar: user.image || null },
        update: { ...(user.name ? { name: user.name } : {}), avatar: user.image || null },
      })
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
