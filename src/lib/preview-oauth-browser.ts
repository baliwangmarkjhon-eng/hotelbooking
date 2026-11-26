'use client'

type PreviewOAuthWindow = Window & { __figmaPreviewOAuthPopupsAllowed?: boolean }
const READY = 'figma-preview-oauth:ready'
const ACK = 'figma-preview-oauth:ack'
const STARTED = 'figma-preview-oauth:started'
const FAILED = 'figma-preview-oauth:failed'
const SECRET = /^[a-f0-9]{64}$/

function randomSecret(win: Window) {
  return Array.from(win.crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function openPreviewOAuth(win: PreviewOAuthWindow = window): Promise<string> {
  if (win.__figmaPreviewOAuthPopupsAllowed !== true) {
    return Promise.reject(new Error('Preview OAuth is unavailable'))
  }
  return new Promise((resolve, reject) => {
    let popup: Window | null = null
    let secret: string | undefined
    let timer = 0
    const cleanup = () => {
      win.clearTimeout(timer)
      win.removeEventListener('message', receive)
    }
    const rejectAfter = (ms: number, message: string) => {
      win.clearTimeout(timer)
      timer = win.setTimeout(() => {
        cleanup()
        popup?.close()
        reject(new Error(message))
      }, ms)
    }
    const receive = (event: MessageEvent) => {
      if (!popup || event.source !== popup || event.origin !== win.location.origin) return
      if (
        event.data?.type === READY &&
        secret === undefined &&
        typeof event.data.secret === 'string' &&
        SECRET.test(event.data.secret)
      ) {
        secret = event.data.secret
        popup.postMessage({ type: ACK, secret }, win.location.origin)
        rejectAfter(60_000, 'Preview sign-in did not start')
      } else if (secret && event.data?.secret === secret) {
        if (event.data.type === STARTED) {
          cleanup()
          resolve(secret)
        } else if (event.data.type === FAILED) {
          cleanup()
          popup.close()
          reject(new Error('Preview sign-in unavailable'))
        }
      }
    }
    rejectAfter(45_000, 'Preview OAuth popup did not connect')
    win.addEventListener('message', receive)
    popup = win.open('/api/auth/preview-signin', '_blank', 'width=480,height=640')
    if (!popup || popup === win) {
      cleanup()
      reject(new Error('Preview OAuth popup was blocked'))
    }
  })
}

export async function waitForPreviewOAuthSession(
  secret: string,
  signal: AbortSignal,
  win: Window = window,
): Promise<'complete' | 'expired' | 'aborted'> {
  const stop = new AbortController()
  const abort = () => stop.abort()
  const expiry = win.setTimeout(abort, 5 * 60_000)
  signal.addEventListener('abort', abort)
  if (signal.aborted) abort()
  try {
    while (!stop.signal.aborted) {
      const response = await win.fetch('/api/auth/preview-exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret }),
        signal: stop.signal,
      })
      if (response.status === 204) return 'complete'
      if (response.status === 410) return 'expired'
      if (response.status !== 202) throw new Error('Preview sign-in could not be completed')
      await new Promise<void>((resolve) => {
        const done = () => {
          win.clearTimeout(timer)
          stop.signal.removeEventListener('abort', done)
          resolve()
        }
        const timer = win.setTimeout(done, 1000)
        stop.signal.addEventListener('abort', done)
      })
    }
  } catch (error) {
    if (!stop.signal.aborted) throw error
  } finally {
    win.clearTimeout(expiry)
    signal.removeEventListener('abort', abort)
  }
  return signal.aborted ? 'aborted' : 'expired'
}

export async function startPreviewOAuthBridge(
  start: (secret: string) => Promise<string>,
  win: Window = window,
) {
  const opener = win.opener as Window | null
  if (!opener || win.location.search || win.location.hash) {
    throw new Error('Open preview sign-in from the app')
  }
  const secret = randomSecret(win)
  await new Promise<void>((resolve, reject) => {
    const receive = (event: MessageEvent) => {
      if (
        event.source === opener &&
        event.origin === win.location.origin &&
        event.data?.type === ACK &&
        event.data.secret === secret
      ) {
        win.clearTimeout(timer)
        win.removeEventListener('message', receive)
        resolve()
      }
    }
    const timer = win.setTimeout(() => {
      win.removeEventListener('message', receive)
      reject(new Error('Preview OAuth opener did not connect'))
    }, 10_000)
    win.addEventListener('message', receive)
    opener.postMessage({ type: READY, secret }, win.location.origin)
  })
  try {
    const authorizationUrl = await start(secret)
    opener.postMessage({ type: STARTED, secret }, win.location.origin)
    win.location.assign(authorizationUrl)
  } catch (error) {
    opener.postMessage({ type: FAILED, secret }, win.location.origin)
    throw error
  }
}

const callbackCompletions = new WeakMap<Window, Promise<void>>()
export function completePreviewOAuthCallback(
  submit: (callback: string) => Promise<void>,
  win: Window = window,
) {
  let completion = callbackCompletions.get(win)
  if (!completion) {
    completion = (async () => {
      const { pathname, search, hash } = win.location
      win.history.replaceState(null, '', pathname)
      if (search || hash.length < 2) throw new Error('Open preview sign-in from the app')
      await submit(hash.slice(1))
    })()
    callbackCompletions.set(win, completion)
  }
  return completion
}
