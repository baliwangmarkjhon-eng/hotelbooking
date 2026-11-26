import 'server-only'

import config from '@payload-config'
import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'

export const PRIMARY_ADMIN_EMAIL = 'baliwangmarkjhon@gmail.com'

export type VerifiedGoogleIdentity = {
  providerId: string
  email: string
  name: string
  image?: string | null
  emailVerified: boolean
}

export async function syncVerifiedGoogleUser(identity: VerifiedGoogleIdentity): Promise<User> {
  const email = identity.email.trim().toLowerCase()
  if (!identity.emailVerified || !identity.providerId || !email) {
    throw new Error('Google did not return a verified email identity.')
  }

  const payload = await getPayload({ config })
  const byProvider = await payload.find({
    collection: 'users',
    where: { googleProviderId: { equals: identity.providerId } },
    limit: 1,
    overrideAccess: true,
  })
  const byEmail =
    byProvider.docs[0] ??
    (
      await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
  const role = email === PRIMARY_ADMIN_EMAIL ? 'admin' : (byEmail?.role ?? 'guest')

  if (byEmail) {
    return payload.update({
      collection: 'users',
      id: byEmail.id,
      overrideAccess: true,
      data: {
        name: identity.name || byEmail.name,
        role,
        active: true,
        googleProviderId: identity.providerId,
        avatarUrl: identity.image ?? byEmail.avatarUrl,
      },
    })
  }

  return payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      name: identity.name || email.split('@')[0],
      email,
      password: randomBytes(32).toString('base64url'),
      role,
      active: true,
      googleProviderId: identity.providerId,
      avatarUrl: identity.image ?? undefined,
    },
  })
}
