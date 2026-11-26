import { cookies } from 'next/headers'
import type { JWT } from 'next-auth/jwt'

import { syncVerifiedGoogleUser } from '@/lib/google-user'
import {
  isPreviewOAuthPost,
  readPreviewOAuthCallback,
} from '@/lib/preview-oauth-server'
import { previewOAuthStore } from '@/lib/preview-oauth-store'

const responseHeaders = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
}

export async function POST(request: Request) {
  const trustedOrigin = process.env.NEXT_PUBLIC_SITE_URL
  if (!trustedOrigin || !isPreviewOAuthPost(request, new URL(trustedOrigin).origin)) {
    return new Response(null, { status: 403, headers: responseHeaders })
  }
  const params = readPreviewOAuthCallback(await request.json().catch(() => null))
  if (!params) return new Response(null, { status: 400, headers: responseHeaders })
  const cookieStore = await cookies()
  const handle = cookieStore.get('__Host-pv_handle')?.value ?? ''
  const popupNonce = cookieStore.get('__Host-pv_nonce')?.value
  const state = params.get('state') ?? ''
  const verifier = previewOAuthStore.takeCallback(handle, state.split('.')[3] ?? '', popupNonce)
  if (!verifier) return new Response(null, { status: 410, headers: responseHeaders })
  cookieStore.delete('__Host-pv_handle')
  cookieStore.delete('__Host-pv_nonce')

  try {
    const code = params.get('code')
    if (!code || params.get('error')) throw new Error('Google authorization was denied.')
    const redirectUri = process.env.FIGMA_PREVIEW_OAUTH_REDIRECT_URI
    const clientId = process.env.AUTH_GOOGLE_ID
    const clientSecret = process.env.AUTH_GOOGLE_SECRET
    if (!redirectUri || !clientId || !clientSecret) throw new Error('Google OAuth is not configured.')

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    })
    if (!tokenResponse.ok) throw new Error('Google token exchange failed.')
    const tokens = (await tokenResponse.json()) as { access_token?: unknown }
    if (typeof tokens.access_token !== 'string') throw new Error('Google returned no access token.')

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    })
    if (!profileResponse.ok) throw new Error('Google identity verification failed.')
    const profile = (await profileResponse.json()) as {
      sub?: unknown
      email?: unknown
      email_verified?: unknown
      name?: unknown
      picture?: unknown
    }
    if (
      typeof profile.sub !== 'string' ||
      typeof profile.email !== 'string' ||
      profile.email_verified !== true
    ) {
      throw new Error('Google returned an unverified identity.')
    }
    const user = await syncVerifiedGoogleUser({
      providerId: profile.sub,
      email: profile.email,
      emailVerified: true,
      name: typeof profile.name === 'string' ? profile.name : profile.email,
      image: typeof profile.picture === 'string' ? profile.picture : null,
    })
    const claims: JWT = {
      sub: profile.sub,
      name: user.name,
      email: user.email,
      picture: user.avatarUrl ?? undefined,
      payloadUserId: String(user.id),
      role: user.role,
      active: user.active,
    }
    if (!previewOAuthStore.complete(handle, claims)) throw new Error('Preview session expired.')
    return new Response(null, { status: 204, headers: responseHeaders })
  } catch (error) {
    previewOAuthStore.fail(handle)
    console.error(
      'Preview OAuth completion failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return new Response(null, { status: 410, headers: responseHeaders })
  }
}
