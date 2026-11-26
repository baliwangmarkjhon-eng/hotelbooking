import { encode } from 'next-auth/jwt'

import { isPreviewOAuthPost } from '@/lib/preview-oauth-server'
import { previewOAuthStore } from '@/lib/preview-oauth-store'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session-cookie'

export async function POST(request: Request) {
  const trustedOrigin = process.env.NEXT_PUBLIC_SITE_URL
  const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
  if (!trustedOrigin || !isPreviewOAuthPost(request, new URL(trustedOrigin).origin)) {
    return new Response(null, { status: 403, headers })
  }
  const body = (await request.json().catch(() => null)) as { secret?: unknown } | null
  if (typeof body?.secret !== 'string') return new Response(null, { status: 400, headers })
  const outcome = previewOAuthStore.consume(body.secret)
  if (outcome.status === 'pending') return new Response(null, { status: 202, headers })
  if (outcome.status === 'missing') return new Response(null, { status: 410, headers })
  if (outcome.status !== 'complete') return new Response(null, { status: 410, headers })
  if (!process.env.AUTH_SECRET) return new Response(null, { status: 503, headers })
  const token = await encode({
    token: outcome.result,
    secret: process.env.AUTH_SECRET,
    salt: SESSION_COOKIE,
    maxAge: SESSION_MAX_AGE,
  })
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      'set-cookie': [
        `${SESSION_COOKIE}=${token}`,
        `Max-Age=${SESSION_MAX_AGE}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Partitioned',
      ].join('; '),
    },
  })
}
