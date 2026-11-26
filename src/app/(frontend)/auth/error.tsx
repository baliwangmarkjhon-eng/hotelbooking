'use client'

import { signOut } from 'next-auth/react'

export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-4 text-[#15322b]">
      <div className="max-w-md rounded-3xl border border-[#dce7e2] bg-white p-8 text-center shadow-xl">
        <h1 className="font-serif text-3xl">We couldn’t open your account</h1>
        <p className="mt-3 text-sm leading-6 text-[#647b75]">
          Sign out and try again. Your hotel reservations remain unchanged.
        </p>
        <button
          className="mt-6 min-h-11 rounded-xl bg-[#123d33] px-5 font-semibold text-white"
          onClick={async () => {
            await signOut({ redirect: false })
            reset()
          }}
        >
          Sign out and retry
        </button>
      </div>
    </main>
  )
}
