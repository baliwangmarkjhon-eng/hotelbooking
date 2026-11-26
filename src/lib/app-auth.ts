import 'server-only'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import { auth } from '@/auth'
import type { User } from '@/payload-types'
import { PRIMARY_ADMIN_EMAIL } from '@/lib/google-user'
import { SESSION_COOKIE_OPTIONS } from '@/lib/session-cookie'

const APP_SESSION_COOKIE = 'app-session'

export function createAppAuth(collection: 'users') {
  return {
    async login(email: string, password: string) {
      const payload = await getPayload({ config })
      let result = await payload.login({
        collection,
        data: { email, password },
      })

      if (!result.token || !result.user || result.user.active === false) {
        return null
      }

      if (email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL && result.user.role !== 'admin') {
        await payload.update({
          collection,
          id: result.user.id,
          overrideAccess: true,
          data: { role: 'admin', active: true },
        })
        result = await payload.login({ collection, data: { email, password } })
        if (!result.token || !result.user) return null
      }

      const cookieStore = await cookies()
      cookieStore.set(APP_SESSION_COOKIE, result.token, {
        // Make embeds the app cross-site; Lax cookies are rejected in that iframe.
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 8,
      })

      return result.user
    },

    async logout() {
      const cookieStore = await cookies()
      // Expire the same partitioned cookie that login sets.
      cookieStore.set(APP_SESSION_COOKIE, '', {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 0,
      })
    },

    async currentUser(): Promise<User | null> {
      const oauthSession = await auth()
      const oauthUserId = oauthSession?.user?.payloadUserId
      if (oauthUserId) {
        const payload = await getPayload({ config })
        const oauthUser = await payload.findByID({
          collection,
          id: oauthUserId,
          overrideAccess: true,
        })
        if (oauthUser.active === false || oauthUser.removedAt) return null
        return oauthUser
      }

      const token = (await cookies()).get(APP_SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })

      if (!user || user.collection !== collection || user.active === false || user.removedAt) return null
      return user
    },
  }
}

export const appAuth = createAppAuth('users')
