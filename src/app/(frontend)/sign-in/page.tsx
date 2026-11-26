import { redirect } from 'next/navigation'

import { appAuth } from '@/lib/app-auth'

import AuthPanel from '../AuthPanel'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string | string[] }>
}) {
  // An explicit account-switch request must reach the form even if a
  // best-effort preview logout could not clear the previous server cookie.
  if ((await searchParams).switch !== '1') {
    const user = await appAuth.currentUser()
    if (user) redirect(user.role === 'guest' ? '/' : '/operations')
  }
  return <AuthPanel mode="sign-in" />
}
