'use client'

import { useEffect, useState } from 'react'

import { completePreviewOAuthCallback } from '@/lib/preview-oauth-browser'

export default function PreviewCallback() {
  const [message, setMessage] = useState('Completing sign-in…')
  useEffect(() => {
    void completePreviewOAuthCallback(async (callback) => {
      const response = await fetch('/api/auth/preview-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callback }),
      })
      if (!response.ok) throw new Error('Preview sign-in failed')
    })
      .then(() => {
        setMessage('Sign-in complete. You may close this window.')
        window.close()
      })
      .catch(() => setMessage('Sign-in failed. Close this window and try again.'))
  }, [])
  return <p className="text-center text-sm text-[#647b75]">{message}</p>
}
