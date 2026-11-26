'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

type SessionUser = {
  name: string
  email: string
  role: 'guest' | 'staff' | 'admin'
  image?: string | null
}
type View =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: SessionUser }

const CACHED_SERVER_SNAPSHOT: View = Object.freeze({ status: 'loading' })

let view: View = CACHED_SERVER_SNAPSHOT
let stale = true
let current: AbortController | null = null
const listeners = new Set<() => void>()
let signingOut = false
let logoutTask: Promise<void> | null = null
let locallySignedOut = false
let signInRequested = false
const AUTH_STORAGE_KEYS = ['red5star_jwt', 'red5star_auth_session', 'hotel-active-user']

function clearClientSession() {
  locallySignedOut = true
  current?.abort()
  current = null
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    for (const key of AUTH_STORAGE_KEYS) {
      try { window[storageName].removeItem(key) } catch { /* Storage can be blocked in an iframe. */ }
    }
  }
  view = { status: 'signed-out' }
  stale = false
  listeners.forEach(listener => listener())
}

async function beginSignIn() {
  signInRequested = true
  // Do not let the previous logout's finally block wipe a newly signed-in user.
  if (logoutTask) await logoutTask
  locallySignedOut = false
  stale = true
}

async function refresh() {
  if (signingOut || locallySignedOut) return
  current?.abort()
  const controller = (current = new AbortController())
  try {
    const response = await fetch('/api/app-session', { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error('Session request failed')
    const user = (await response.json()) as SessionUser | null
    if (controller.signal.aborted) return
    view = user ? { status: 'signed-in', user } : { status: 'signed-out' }
    stale = false
    listeners.forEach((listener) => listener())
  } catch {
    if (!controller.signal.aborted) {
      view = { status: 'signed-out' }
      stale = true
      listeners.forEach((listener) => listener())
    }
  } finally {
    if (current === controller) current = null
  }
}

export const appSession = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    if (stale && !current) void refresh()
    return () => listeners.delete(listener)
  },
  getSnapshot: () => view,
  getServerSnapshot: (): View => CACHED_SERVER_SNAPSHOT,
  refresh,
  beginSignIn,
}

export async function announceSessionChange(router: AppRouterInstance) {
  await beginSignIn()
  await appSession.refresh()
  router.refresh()
}

export async function signOutEverywhere(router: AppRouterInstance, redirectTo = '/') {
  if (logoutTask) return logoutTask
  logoutTask = (async () => {
    signingOut = true
    signInRequested = false
    let token: string | null = null
    try { token = window.localStorage.getItem('red5star_jwt') } catch { /* Optional legacy token. */ }
    if (!token) {
      try { token = window.sessionStorage.getItem('red5star_jwt') } catch { /* Optional legacy token. */ }
    }
    clearClientSession()
    try {
      // Server logout is best-effort. Never retain the displayed user because
      // an expired token, preview restriction, or offline request was rejected.
      const signal = AbortSignal.timeout(4000)
      await Promise.allSettled([
        fetch('/api/users/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: token ? { Authorization: `JWT ${token}` } : undefined,
          signal,
        }),
        // This app also owns a dedicated HTTP-only cookie, separate from Payload's.
        fetch('/api/app-auth/logout', { method: 'POST', credentials: 'same-origin', signal }),
        (async () => {
          const response = await fetch('/api/auth/csrf', { cache: 'no-store', signal })
          if (!response.ok) return
          const { csrfToken } = await response.json() as { csrfToken?: unknown }
          if (typeof csrfToken !== 'string' || !csrfToken) return
          await fetch('/api/auth/signout', {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              'x-auth-return-redirect': '1',
            },
            body: new URLSearchParams({ csrfToken, callbackUrl: '/' }),
            signal,
          })
        })(),
      ])
    } catch {
      // Client cleanup must also run if requests cannot even be started.
    } finally {
      clearClientSession()
      signingOut = false
      logoutTask = null
      if (!signInRequested) {
        router.replace(redirectTo)
        router.refresh()
      }
    }
  })()
  return logoutTask
}
