import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'

import {
  hasPreviewOAuthCsrf,
  isPreviewOAuthPost,
} from '@/lib/preview-oauth-server'
import { previewOAuthStore } from '@/lib/preview-oauth-store'

const headers = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
}

function prefixIsLive(prefix: string) {
  try {
    const payload = JSON.parse(Buffer.from(prefix.split('.')[1], 'base64url').toString()) as {
      exp?: number
    }
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 5 * 60_000
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const trustedOrigin = process.env.NEXT_PUBLIC_SITE_URL
  if (!trustedOrigin || !isPreviewOAuthPost(request, new URL(trustedOrigin).origin)) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers })
  }
  const body = (await request.json().catch(() => null)) as
    | { secret?: unknown; csrf?: unknown }
    | null
  const cookieStore = await cookies()
  const bootstrap = cookieStore.get('__Host-pv_bootstrap')?.value
  if (!hasPreviewOAuthCsrf(bootstrap, body?.csrf) || typeof body?.secret !== 'string') {
    return Response.json({ error: 'Invalid request' }, { status: 400, headers })
  }
  cookieStore.delete('__Host-pv_bootstrap')

  const redirectUri = process.env.FIGMA_PREVIEW_OAUTH_REDIRECT_URI
  const statePrefix = process.env.FIGMA_PREVIEW_OAUTH_STATE_PREFIX
  const clientId = process.env.AUTH_GOOGLE_ID
  if (!redirectUri || !statePrefix || !clientId || !prefixIsLive(statePrefix)) {
    return Response.json({ error: 'Unavailable' }, { status: 503, headers })
  }
  const transaction = previewOAuthStore.begin(body.secret)
  if (!transaction) return Response.json({ error: 'Invalid request' }, { status: 409, headers })

  cookieStore.set('__Host-pv_handle', body.secret, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 300,
  })
  cookieStore.set('__Host-pv_nonce', transaction.nonce, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 300,
  })
  const state = [
    statePrefix,
    transaction.nonce,
    Buffer.from('/api/auth/preview-callback').toString('base64url'),
  ].join('.')
  const challenge = createHash('sha256').update(transaction.verifier).digest('base64url')
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return Response.json({ authorizationUrl: authorizationUrl.toString() }, { headers })
}
