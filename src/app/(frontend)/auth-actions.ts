'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { appAuth } from '@/lib/app-auth'
import { PRIMARY_ADMIN_EMAIL } from '@/lib/google-user'

export type AuthActionResult = { ok: boolean; message: string }

const destinationForRole = (role: 'guest' | 'staff' | 'admin') =>
  role === 'admin' ? '/admin/dashboard' : role === 'staff' ? '/staff/dashboard' : '/'

export async function loginAction(
  _previous: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return { ok: false, message: 'Enter a valid email and password.' }
  }
  try {
    const user = await appAuth.login(email, password)
    if (!user) return { ok: false, message: 'This account is inactive.' }
    redirect(destinationForRole(user.role))
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error
    return { ok: false, message: 'Email or password is incorrect.' }
  }
}

export async function signUpAction(
  _previous: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  if (name.length < 2) return { ok: false, message: 'Enter your full name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, message: 'Use at least 8 characters with a letter and number.' }
  }
  if (password !== confirmPassword) return { ok: false, message: 'Passwords do not match.' }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      draft: false,
      overrideAccess: false,
      data: { name, email, password, role: 'guest', active: true },
    })
    const user = await appAuth.login(email, password)
    if (!user) return { ok: false, message: 'Your account was created, but sign-in failed.' }
    redirect('/')
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error
    if (email === PRIMARY_ADMIN_EMAIL) {
      return {
        ok: false,
        message:
          'This administrator account already exists. Sign in, then change its password from Admin Dashboard → People.',
      }
    }
    return { ok: false, message: 'An account with this email may already exist.' }
  }
}
