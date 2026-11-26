import { redirect } from 'next/navigation'

import { appAuth } from '@/lib/app-auth'

import AuthPanel from '../AuthPanel'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string | string[] }>
}) {
  if ((await searchParams).switch !== '1') {
    const user = await appAuth.currentUser()
    if (user) redirect(user.role === 'guest' ? '/' : '/operations')
  }
  return <AuthPanel mode="sign-up" />
}
