import { redirect } from 'next/navigation'

import { appAuth } from '@/lib/app-auth'

export default async function AuthCompletePage() {
  const user = await appAuth.currentUser()
  if (!user) redirect('/sign-in?error=oauth')
  redirect(user.role === 'admin' ? '/admin/dashboard' : user.role === 'staff' ? '/staff/dashboard' : '/')
}
