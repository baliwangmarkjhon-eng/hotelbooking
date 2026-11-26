'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { signOutEverywhere } from '@/lib/app-session-browser'

import {
  archiveBookingAction,
  createStaffAction,
  removeStaffAction,
  toggleStaffAction,
  updateBookingAction,
  updateRateAction,
} from './actions'

type BookingRow = {
  id: string
  reference: string
  guestName: string
  guestEmail: string
  serviceName: string
  roomNumber: string
  arrivalDate: string
  departureDate: string
  status: string
  total: number
  amountPaid: number
  remainingBalance: number
  paymentStatus: string
}
type TransactionRow = {
  id: string
  reference: string
  guestName: string
  type: string
  amount: number
  method: string
  createdAt: string
}
type RateRow = { id: string; name: string; rate: number; capacity: number; active: boolean }
type StaffRow = { id: string; name: string; email: string; role: string; active: boolean }
type Props = {
  currentUser: { name: string; email: string; role: 'staff' | 'admin' }
  bookings: BookingRow[]
  transactions: TransactionRow[]
  rates: RateRow[]
  staff: StaffRow[]
}

const money = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
const shortDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : '—'

function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode
  tone?: 'green' | 'amber' | 'blue' | 'slate'
}) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    blue: 'bg-blue-50 text-blue-800 ring-blue-600/20',
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[tone]}`}>
      {children}
    </span>
  )
}

export default function OperationsDashboard({
  currentUser,
  bookings,
  transactions,
  rates,
  staff,
}: Props) {
  const router = useRouter()
  const isAdmin = currentUser.role === 'admin'
  const [tab, setTab] = useState<'overview' | 'bookings' | 'staff' | 'rates'>(
    isAdmin ? 'overview' : 'bookings',
  )
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 20_000)
    return () => window.clearInterval(timer)
  }, [router])

  const run = (task: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await task()
      setNotice(result.message)
      if (result.ok) router.refresh()
    })
  }

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      const matchesQuery =
        !query ||
        [booking.guestName, booking.guestEmail, booking.reference, booking.serviceName]
          .join(' ')
          .toLowerCase()
          .includes(query)
      return matchesQuery && (status === 'all' || booking.status === status)
    })
  }, [bookings, search, status])

  const collected = transactions.reduce((sum, item) => sum + item.amount, 0)
  const balances = bookings.reduce((sum, item) => sum + item.remainingBalance, 0)
  const upcoming = bookings.filter((item) => item.status === 'upcoming').length
  const occupied = bookings.filter((item) => item.status === 'checked-in').length
  const adminTabs = [
    ['overview', 'Revenue & Overview'],
    ['bookings', 'All Bookings'],
    ['staff', 'Manage Staff'],
    ['rates', 'Room Rates & Inventory'],
  ] as const

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#17362e]">
      <header className="border-b border-[#dce7e2] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#123d33] font-serif text-xl text-white">R</span>
            <div>
              <p className="font-semibold">Red 5 Star</p>
              <p className="text-xs font-medium uppercase tracking-[.18em] text-[#647b75]">
                {isAdmin ? 'Admin dashboard' : 'Staff dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-[#cfddd8] px-4 text-sm font-semibold hover:bg-[#f4f7f5]">
              Back to Hotel
            </Link>
            <button
              type="button"
              onClick={() => void signOutEverywhere(router, '/')}
              className="min-h-11 rounded-xl bg-[#123d33] px-4 text-sm font-semibold text-white hover:bg-[#0c3028]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#98691f]">
              {isAdmin ? 'Hotel command center' : 'Front desk reservations'}
            </p>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Good day, {currentUser.name.split(' ')[0]}</h1>
            <p className="mt-2 text-[15px] text-[#5f756f]">
              {currentUser.email} · Live activity refreshes every 20 seconds.
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Admin dashboard sections">
              {adminTabs.map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold ${
                    tab === value
                      ? 'bg-[#123d33] text-white'
                      : 'border border-[#cfddd8] bg-white text-[#48675f]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {notice && (
          <div role="status" className="mt-5 rounded-xl border border-[#cddfd8] bg-white px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        {isAdmin && tab === 'overview' && (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Hotel performance">
              {[
                ['Revenue collected', money(collected), 'Immutable payment ledger'],
                ['Outstanding balances', money(balances), 'Due before check-out'],
                ['Upcoming arrivals', String(upcoming), 'Reserved stays'],
                ['Currently in house', String(occupied), 'Checked-in guests'],
              ].map(([label, value, detail]) => (
                <article key={label} className="rounded-2xl border border-[#dce7e2] bg-white p-5 shadow-[0_8px_28px_rgba(30,70,58,.05)]">
                  <p className="text-sm font-medium text-[#647b75]">{label}</p>
                  <p className="mt-3 font-serif text-3xl">{value}</p>
                  <p className="mt-2 text-xs text-[#778b85]">{detail}</p>
                </article>
              ))}
            </section>
            <section className="mt-7 overflow-hidden rounded-2xl border border-[#dce7e2] bg-white">
              <div className="border-b border-[#e3ebe8] px-6 py-5">
                <h2 className="font-serif text-2xl">Recent revenue</h2>
                <p className="mt-1 text-sm text-[#647b75]">Deposits, full payments, and collected balances.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#f8faf9] text-xs uppercase tracking-[.08em] text-[#647b75]">
                    <tr>{['Reference', 'Guest', 'Type', 'Method', 'Amount', 'Recorded'].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8efec]">
                    {transactions.slice(0, 15).map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-mono text-xs">{item.reference}</td>
                        <td className="px-5 py-4 font-semibold">{item.guestName}</td>
                        <td className="px-5 py-4 capitalize">{item.type}</td>
                        <td className="px-5 py-4">{item.method}</td>
                        <td className="px-5 py-4 font-semibold text-emerald-700">{money(item.amount)}</td>
                        <td className="px-5 py-4">{shortDate(item.createdAt)}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan={6} className="px-6 py-14 text-center text-[#647b75]">No payment transactions recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === 'bookings' && (
          <section className="mt-7 overflow-hidden rounded-2xl border border-[#dce7e2] bg-white">
            <div className="flex flex-col gap-4 border-b border-[#e3ebe8] px-5 py-5 lg:flex-row lg:items-end lg:justify-between sm:px-6">
              <div>
                <h2 className="font-serif text-2xl">{isAdmin ? 'All bookings' : 'Reservations'}</h2>
                <p className="mt-1 text-sm text-[#647b75]">{filteredBookings.length} matching reservations</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_180px]">
                <label>
                  <span className="sr-only">Search reservations</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search guest, email, reference…"
                    className="min-h-11 w-full rounded-xl border border-[#cfddd8] px-4 text-sm outline-none focus:border-[#1f6b59] focus:ring-4 focus:ring-[#1f6b59]/10"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by booking status</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[#cfddd8] bg-white px-3 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="upcoming">Reserved</option>
                    <option value="checked-in">Checked in</option>
                    <option value="checked-out">Checked out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
                <thead className="bg-[#f8faf9] text-xs uppercase tracking-[.08em] text-[#647b75]">
                  <tr>{['Guest', 'Room / Service', 'Stay', 'Status', 'Payment', 'Balance', 'Actions'].map((head) => <th key={head} className="px-5 py-4 font-semibold">{head}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#e8efec]">
                  {filteredBookings.map((booking) => {
                    const paid = booking.remainingBalance <= 0
                    return (
                      <tr key={booking.id} className="align-top hover:bg-[#fbfcfc]">
                        <td className="px-5 py-5">
                          <p className="font-semibold">{booking.guestName}</p>
                          <p className="mt-1 text-xs text-[#60766f]">{booking.guestEmail}</p>
                          <p className="mt-1 font-mono text-xs text-[#778b85]">{booking.reference}</p>
                        </td>
                        <td className="px-5 py-5"><p className="font-semibold">{booking.serviceName}</p><p className="mt-1 text-xs text-[#778b85]">{booking.roomNumber}</p></td>
                        <td className="px-5 py-5"><p>{shortDate(booking.arrivalDate)}</p><p className="mt-1 text-xs text-[#778b85]">to {shortDate(booking.departureDate)}</p></td>
                        <td className="px-5 py-5"><Badge tone={booking.status === 'checked-in' ? 'blue' : booking.status === 'checked-out' ? 'slate' : 'amber'}>{booking.status === 'upcoming' ? 'Reserved' : booking.status}</Badge></td>
                        <td className="px-5 py-5"><Badge tone={paid ? 'green' : 'amber'}>{paid ? 'Paid in full' : '10% deposit paid'}</Badge><p className="mt-2 text-xs text-[#778b85]">{money(booking.amountPaid)} collected</p></td>
                        <td className="px-5 py-5"><p className={`font-semibold ${paid ? 'text-emerald-700' : 'text-amber-800'}`}>{money(booking.remainingBalance)}</p><p className="mt-1 text-xs text-[#778b85]">{paid ? 'No balance due' : 'Must settle before check-out'}</p></td>
                        <td className="px-5 py-4">
                          <div className="flex max-w-[300px] flex-wrap gap-2">
                            {booking.status === 'upcoming' && (
                              <>
                                <button disabled={pending} onClick={() => run(() => updateBookingAction({ id: booking.id, operation: 'check-in' }))} className="min-h-11 rounded-lg bg-[#1f6b59] px-3 font-semibold text-white">Check in</button>
                                {!paid && <button disabled={pending} onClick={() => run(() => updateBookingAction({ id: booking.id, operation: 'check-in', settleBalance: true, paymentMethod: 'Front desk' }))} className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 font-semibold text-amber-900">Settle & check in</button>}
                              </>
                            )}
                            {booking.status === 'checked-in' && <button disabled={pending || !paid} title={!paid ? 'Collect the remaining balance first' : undefined} onClick={() => run(() => updateBookingAction({ id: booking.id, operation: 'check-out' }))} className="min-h-11 rounded-lg bg-[#245d89] px-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Check out</button>}
                            {!paid && booking.status !== 'upcoming' && <button disabled={pending} onClick={() => run(() => updateBookingAction({ id: booking.id, operation: 'collect-balance', paymentMethod: 'Front desk' }))} className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 font-semibold text-amber-900">Collect balance</button>}
                            {isAdmin && <button disabled={pending} onClick={() => { if (window.confirm('Remove this booking from active operations? Payment history will be preserved.')) run(() => archiveBookingAction(booking.id)) }} className="min-h-11 rounded-lg border border-red-200 px-3 font-semibold text-red-700 hover:bg-red-50">Delete</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredBookings.length === 0 && <tr><td colSpan={7} className="px-6 py-16 text-center text-[#647b75]">No reservations match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isAdmin && tab === 'staff' && (
          <section className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <form action={(formData) => run(() => createStaffAction(formData))} className="rounded-2xl border border-[#dce7e2] bg-white p-6">
              <h2 className="font-serif text-2xl">Create staff account</h2>
              <p className="mt-1 text-sm text-[#647b75]">Staff receive reservation and check-in/out access only.</p>
              <div className="mt-6 space-y-4">
                {[['name', 'Full name', 'text'], ['email', 'Work email', 'email'], ['password', 'Temporary password', 'password']].map(([name, label, type]) => (
                  <label key={name} className="block">
                    <span className="mb-2 block text-sm font-semibold">{label}</span>
                    <input name={name} type={type} required minLength={type === 'password' ? 8 : undefined} className="min-h-11 w-full rounded-lg border border-[#cfddd8] px-3" />
                  </label>
                ))}
              </div>
              <button disabled={pending} className="mt-5 min-h-11 w-full rounded-lg bg-[#123d33] px-4 font-semibold text-white">Create staff account</button>
            </form>
            <div className="overflow-hidden rounded-2xl border border-[#dce7e2] bg-white">
              <div className="border-b border-[#e3ebe8] px-6 py-5"><h2 className="font-serif text-2xl">Team access</h2></div>
              <div className="divide-y divide-[#e8efec]">
                {staff.map((member) => (
                  <div key={member.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                    <div className="flex-1"><p className="font-semibold">{member.name}</p><p className="mt-1 text-sm text-[#647b75]">{member.email}</p></div>
                    <Badge tone={member.active ? 'green' : 'slate'}>{member.active ? 'Active' : 'Inactive'}</Badge>
                    <button disabled={pending} onClick={() => run(() => toggleStaffAction(member.id, !member.active))} className="min-h-11 rounded-lg border border-[#cfddd8] px-4 text-sm font-semibold">{member.active ? 'Deactivate' : 'Activate'}</button>
                    <button disabled={pending} onClick={() => { if (window.confirm('Remove this staff account? Historical activity will be preserved.')) run(() => removeStaffAction(member.id)) }} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Remove</button>
                  </div>
                ))}
                {staff.length === 0 && <p className="px-6 py-14 text-center text-sm text-[#647b75]">No staff accounts yet.</p>}
              </div>
            </div>
          </section>
        )}

        {isAdmin && tab === 'rates' && (
          <section className="mt-7 rounded-2xl border border-[#dce7e2] bg-white p-6">
            <h2 className="font-serif text-2xl">Room rates & inventory</h2>
            <p className="mt-1 text-sm text-[#647b75]">Update published nightly rates and review room capacity.</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {rates.map((rate) => (
                <article key={rate.id} className="flex flex-col gap-4 rounded-xl border border-[#dce7e2] p-4 sm:flex-row sm:items-center">
                  <div className="flex-1"><p className="font-semibold">{rate.name}</p><p className="mt-1 text-sm text-[#647b75]">Up to {rate.capacity} guests · {rate.active ? 'Active inventory' : 'Inactive'}</p></div>
                  <form className="flex gap-2" action={(formData) => run(() => updateRateAction({ id: rate.id, rate: Number(formData.get('rate')) }))}>
                    <input name="rate" type="number" min="0" defaultValue={rate.rate} className="min-h-11 w-32 rounded-lg border border-[#cfddd8] px-3" aria-label={`Rate for ${rate.name}`} />
                    <button disabled={pending} className="min-h-11 rounded-lg bg-[#123d33] px-4 font-semibold text-white">Save</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
