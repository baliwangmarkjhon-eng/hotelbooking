import type { JWT } from 'next-auth/jwt'

import { createPreviewOAuthStore } from './preview-oauth-server'

const globalStore = globalThis as typeof globalThis & {
  __red5PreviewOAuthStore?: ReturnType<typeof createPreviewOAuthStore<JWT>>
}

export const previewOAuthStore =
  globalStore.__red5PreviewOAuthStore ?? createPreviewOAuthStore<JWT>()

globalStore.__red5PreviewOAuthStore = previewOAuthStore
