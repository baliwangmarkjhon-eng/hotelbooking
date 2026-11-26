import { redirect } from 'next/navigation'

import { appAuth } from '@/lib/app-auth'

export default async function OperationsPage() {
  const user = await appAuth.currentUser()
  if (!user) redirect('/sign-in')
  redirect(user.role === 'admin' ? '/admin/dashboard' : user.role === 'staff' ? '/staff/dashboard' : '/')
}
