import { appAuth } from '@/lib/app-auth'

export async function POST(request: Request) {
  // Preview origins can change after a sandbox restart. Accept only the exact
  // platform-provisioned runtime preview or the configured published origin.
  const trustedOrigins = [process.env.NEXT_PUBLIC_SITE_URL, process.env.FIGMA_PUBLIC_URL]
    .flatMap(value => {
      try { return value ? [new URL(value).origin] : [] }
      catch { return [] }
    })
  const origin = request.headers.get('origin')
  if (!origin || !trustedOrigins.includes(origin)) {
    return new Response(null, { status: 403 })
  }
  await appAuth.logout()
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}
