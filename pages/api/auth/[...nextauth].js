import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

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
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
