import { appAuth } from '@/lib/app-auth'

export async function GET() {
  const user = await appAuth.currentUser()
  return Response.json(
    user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatarUrl ?? null,
        }
      : null,
    { headers: { 'cache-control': 'no-store' } },
  )
}
