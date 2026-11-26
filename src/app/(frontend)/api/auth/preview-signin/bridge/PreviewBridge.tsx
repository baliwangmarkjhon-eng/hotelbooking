'use client'

import { useEffect, useState } from 'react'

import { startPreviewOAuthBridge } from '@/lib/preview-oauth-browser'

export default function PreviewBridge({ csrf }: { csrf: string }) {
  const [message, setMessage] = useState('Connecting to Google…')
  useEffect(() => {
    void startPreviewOAuthBridge(async (secret) => {
      const response = await fetch('/api/auth/preview-start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret, csrf }),
      })
      if (!response.ok) throw new Error('Preview sign-in unavailable')
      return ((await response.json()) as { authorizationUrl: string }).authorizationUrl
    }).catch(() => setMessage('Preview sign-in is unavailable. Close this window and try again.'))
  }, [csrf])
  return <p className="text-center text-sm text-[#647b75]">{message}</p>
}
