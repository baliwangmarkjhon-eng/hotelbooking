'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useActionState, useEffect, useRef, useState } from 'react'

import { announceSessionChange, appSession } from '@/lib/app-session-browser'
import { openPreviewOAuth, waitForPreviewOAuthSession } from '@/lib/preview-oauth-browser'

import {
  loginAction,
  signUpAction,
  type AuthActionResult,
} from './auth-actions'

const initialState: AuthActionResult = { ok: false, message: '' }

export default function AuthPanel({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const action = mode === 'sign-in' ? loginAction : signUpAction
  const [state, formAction, pending] = useActionState(
    async (previous: AuthActionResult, formData: FormData) => {
      await appSession.beginSignIn()
      return action(previous, formData)
    },
    initialState,
  )
  const [googleError, setGoogleError] = useState('')
  const [googlePending, setGooglePending] = useState(false)
  const pendingSignIn = useRef<AbortController | null>(null)

  useEffect(() => {
    // A new explicit sign-in flow may load a user again after local logout.
    void appSession.beginSignIn()
    return () => pendingSignIn.current?.abort()
  }, [])

  const googleSignIn = async () => {
    setGoogleError('')
    setGooglePending(true)
    try {
      await appSession.beginSignIn()
      const inPreviewIframe = window.self !== window.top
      if (!inPreviewIframe) {
        await signIn('google', { redirectTo: '/auth/complete' })
        return
      }
      pendingSignIn.current?.abort()
      const controller = (pendingSignIn.current = new AbortController())
      const secret = await openPreviewOAuth()
      const outcome = await waitForPreviewOAuthSession(secret, controller.signal)
      if (outcome !== 'complete') {
        if (outcome !== 'aborted') setGoogleError('Google sign-in expired. Please try again.')
        return
      }
      await announceSessionChange(router)
      router.push('/auth/complete')
    } catch {
      setGoogleError(
        'Google sign-in is unavailable in this preview. Use email and password or try the published site.',
      )
    } finally {
      setGooglePending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-8 text-[#15322b] sm:px-6 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:p-0">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden bg-[#123d33] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/25 font-serif text-xl">
            R
          </span>
          <div>
            <p className="font-semibold tracking-wide">Red 5 Star Hotel</p>
            <p className="text-sm text-emerald-100/70">Boracay, Philippines</p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#d8b56b]">
            One account, your whole stay
          </p>
          <h1 className="font-serif text-6xl leading-[1.05]">
            Reservations, arrivals, and hotel service in one calm view.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-emerald-50/70">
            Guests manage bookings while hotel teams securely enter their role-specific workspace.
          </p>
        </div>
        <p className="text-sm text-emerald-100/50">Secure Google sign-in · Role protected · Private by design</p>
      </section>

      <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-[#dce7e2] bg-white p-6 shadow-[0_24px_80px_rgba(25,60,50,.12)] sm:p-9">
          <Link
            href="/"
            className="mb-8 inline-flex min-h-11 items-center text-sm font-semibold text-[#497067] hover:text-[#123d33]"
          >
            ← Back to hotel
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-[#b1832f]">
            {mode === 'sign-in' ? 'Welcome back' : 'Guest membership'}
          </p>
          <h2 className="mt-3 font-serif text-4xl">
            {mode === 'sign-in' ? 'Sign in' : 'Create your account'}
          </h2>
          <p className="mt-3 text-[15px] leading-6 text-[#647b75]">
            {mode === 'sign-in'
              ? 'One secure entrance for guests, staff, and hotel administrators.'
              : 'Create a guest account to keep your booking experience together.'}
          </p>

          <button
            type="button"
            disabled={googlePending}
            onClick={googleSignIn}
            className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#cfddd8] bg-white px-5 font-semibold text-[#15322b] transition hover:bg-[#f7faf8] disabled:opacity-60"
          >
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-[#4285f4] text-sm font-bold text-white">
              G
            </span>
            {googlePending ? 'Connecting to Google…' : 'Continue with Google'}
          </button>
          {googleError && (
            <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {googleError}
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[.14em] text-[#84958f]">
            <span className="h-px flex-1 bg-[#dce7e2]" />
            or use email
            <span className="h-px flex-1 bg-[#dce7e2]" />
          </div>

          <form action={formAction} autoComplete="off" className="space-y-4">
            {mode === 'sign-up' && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Full name</span>
                <input
                  name="name"
                  autoComplete="off"
                  required
                  className="min-h-12 w-full rounded-xl border border-[#cfddd8] px-4 text-base outline-none focus:border-[#1f6b59] focus:ring-4 focus:ring-[#1f6b59]/10"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Email address</span>
              <input
                name="email"
                type="email"
                autoComplete="off"
                required
                className="min-h-12 w-full rounded-xl border border-[#cfddd8] px-4 text-base outline-none focus:border-[#1f6b59] focus:ring-4 focus:ring-[#1f6b59]/10"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="off"
                required
                minLength={8}
                className="min-h-12 w-full rounded-xl border border-[#cfddd8] px-4 text-base outline-none focus:border-[#1f6b59] focus:ring-4 focus:ring-[#1f6b59]/10"
              />
            </label>
            {mode === 'sign-up' && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Confirm password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="off"
                  required
                  minLength={8}
                  className="min-h-12 w-full rounded-xl border border-[#cfddd8] px-4 text-base outline-none focus:border-[#1f6b59] focus:ring-4 focus:ring-[#1f6b59]/10"
                />
              </label>
            )}
            {state.message && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.message}
              </p>
            )}
            <button
              disabled={pending}
              className="min-h-12 w-full rounded-xl bg-[#123d33] px-5 font-semibold text-white transition hover:bg-[#0c3028] disabled:opacity-60"
            >
              {pending
                ? mode === 'sign-in'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : 'Create guest account'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm leading-6 text-[#70847f]">
            {mode === 'sign-in' ? (
              <>
                New to Red 5 Star?{' '}
                <Link className="font-semibold text-[#1f6b59] underline-offset-4 hover:underline" href="/sign-up?switch=1">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link className="font-semibold text-[#1f6b59] underline-offset-4 hover:underline" href="/sign-in?switch=1">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  )
}
