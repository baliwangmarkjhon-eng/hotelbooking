import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

import { syncVerifiedGoogleUser } from '@/lib/google-user'
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE,
} from '@/lib/session-cookie'

if (
  !process.env.AUTH_URL &&
  process.env.NEXT_PUBLIC_SITE_URL &&
  !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
) {
  process.env.AUTH_URL = process.env.NEXT_PUBLIC_SITE_URL
}

export const { handlers, auth } = NextAuth({
  trustHost: true,
  providers: [Google],
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  cookies: {
    sessionToken: { name: SESSION_COOKIE, options: SESSION_COOKIE_OPTIONS },
    csrfToken: { name: CSRF_COOKIE, options: SESSION_COOKIE_OPTIONS },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false
      return Boolean(profile?.sub && profile.email && profile.email_verified === true)
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.sub && profile.email) {
        const user = await syncVerifiedGoogleUser({
          providerId: profile.sub,
          email: profile.email,
          name: profile.name ?? token.name ?? profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified === true,
        })
        token.payloadUserId = String(user.id)
        token.role = user.role
        token.active = user.active
      }
      return token
    },
    session({ session, token }) {
      session.user.payloadUserId =
        typeof token.payloadUserId === 'string' ? token.payloadUserId : undefined
      session.user.role =
        token.role === 'admin' || token.role === 'staff' || token.role === 'guest'
          ? token.role
          : undefined
      session.user.active = token.active !== false
      return session
    },
  },
})
