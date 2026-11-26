'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { signOutEverywhere } from '@/lib/app-session-browser'

import {
  adminBookingAction,
  changeOwnPasswordAction,
  createManualBookingAction,
  createRoomTypeAction,
  updateRateAction,
  updateUserRoleAction,
} from '../operations/actions'

type Booking = {
  id: string
  reference: string
  guestName: string
  guestEmail: string
  serviceName: string
  roomNumber: string
  physicalRoomId: string
  arrivalDate: string
  departureDate: string
  status: string
  approvalStatus: string
  total: number
  amountPaid: number
  paymentStatus: string
}
type Transaction = {
  id: string
  reference: string
  guestName: string
  type: string
  status: string
  amount: number
  method: string
  createdAt: string
}
type Rate = {
  id: string
  roomTypeId: number
  name: string
  rate: number
  capacity: number
  active: boolean
  seasonalPricing: Array<{ label: string; startDate: string; endDate: string; rate: number }>
}
type Account = {
  id: string
  name: string
  email: string
  role: 'guest' | 'staff' | 'admin'
  active: boolean
  createdAt: string
}
type Room = {
  id: string
  roomNumber: string
  floor: number
  status: 'available-clean' | 'occupied' | 'needs-cleaning' | 'maintenance'
  typeName: string
}
type Props = {
  currentUser: { id: string; name: string; email: string }
  bookings: Booking[]
  transactions: Transaction[]
  rates: Rate[]
  users: Account[]
  rooms: Room[]
}

const money = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)

const shortDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(value),
      )
    : '—'

const tabs = [
  ['overview', 'Executive'],
  ['bookings', 'Bookings'],
  ['inventory', 'Rooms & pricing'],
  ['people', 'People'],
  ['finance', 'Finance'],
] as const

const bookingFilters = [
  ['all', 'All'],
  ['booked', 'Booked'],
  ['checked-in', 'Checked-In'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
] as const

const dateRanges = ['Today', 'Last 7 Days', 'This Month', 'Last 6 Months'] as const

function Sparkline({ values, gold = false }: { values: number[]; gold?: boolean }) {
  const max = Math.max(1, ...values.map(Math.abs))
  const points = values
    .map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${30 - (Math.abs(value) / max) * 24}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 32" className="h-9 w-24 overflow-visible" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={gold ? '#b78a35' : '#28705b'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized.includes('refund') || normalized.includes('cancel'))
    return 'border border-[#e6b8b5] bg-[#fff1ef] text-[#9b302b]'
  if (normalized.includes('pending') || normalized.includes('down') || normalized.includes('partial'))
    return 'border border-[#dfc585] bg-[#fff8e6] text-[#84601c]'
  return 'border border-[#a9d0c1] bg-[#edf8f3] text-[#24604e]'
}

export default function AdminDashboard({
  currentUser,
  bookings,
  transactions,
  rates,
  users,
  rooms,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('overview')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [bookingStatus, setBookingStatus] = useState('all')
  const [transactionStatus, setTransactionStatus] = useState('all')
  const [financeSearch, setFinanceSearch] = useState('')
  const [dateRange, setDateRange] = useState<(typeof dateRanges)[number]>('This Month')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const run = (task: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await task()
      setNotice(result.message)
      if (result.ok) router.refresh()
    })
  }

  const today = new Date()
  const rangeStart = new Date(today)
  if (dateRange === 'Today') rangeStart.setHours(0, 0, 0, 0)
  if (dateRange === 'Last 7 Days') rangeStart.setDate(rangeStart.getDate() - 6)
  if (dateRange === 'This Month') rangeStart.setDate(1)
  if (dateRange === 'Last 6 Months') rangeStart.setMonth(rangeStart.getMonth() - 5, 1)
  const rangeTransactions = transactions.filter((item) => new Date(item.createdAt) >= rangeStart)
  const revenue = (transaction: Transaction) =>
    transaction.type === 'refund' ? -transaction.amount : transaction.amount
  const revenueToday = transactions
    .filter((item) => new Date(item.createdAt).toDateString() === today.toDateString())
    .reduce((sum, item) => sum + revenue(item), 0)
  const revenueMonth = transactions
    .filter((item) => {
      const date = new Date(item.createdAt)
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    })
    .reduce((sum, item) => sum + revenue(item), 0)
  const occupied = rooms.filter((room) => room.status === 'occupied').length
  const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0
  const roomBookings = bookings.filter((booking) => booking.departureDate)
  const adr = roomBookings.length
    ? roomBookings.reduce((sum, booking) => sum + booking.total, 0) / roomBookings.length
    : 0
  const activeBookings = bookings.filter((booking) =>
    ['upcoming', 'checked-in'].includes(booking.status),
  ).length
  const pendingBalances = bookings.filter(
    (booking) => booking.total > booking.amountPaid && !['cancelled', 'checked-out'].includes(booking.status),
  )
  const notifications = [
    ...bookings
      .filter((booking) => booking.approvalStatus === 'pending')
      .slice(0, 3)
      .map((booking) => ({ title: 'Booking awaiting approval', detail: `${booking.guestName} · ${booking.reference}` })),
    ...bookings
      .filter(
        (booking) =>
          booking.arrivalDate.slice(0, 10) === today.toISOString().slice(0, 10) &&
          booking.status === 'upcoming',
      )
      .slice(0, 3)
      .map((booking) => ({ title: 'Arrival due today', detail: `${booking.guestName} · Room ${booking.roomNumber}` })),
    ...pendingBalances
      .slice(0, 3)
      .map((booking) => ({ title: 'Pending balance', detail: `${booking.guestName} · ${money(booking.total - booking.amountPaid)}` })),
  ].slice(0, 7)

  const monthSeries = useMemo(() => {
    return Array.from({ length: 6 }, (_, reverseIndex) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - reverseIndex), 1)
      const value = transactions
        .filter((item) => {
          const itemDate = new Date(item.createdAt)
          return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear()
        })
        .reduce((sum, item) => sum + revenue(item), 0)
      return { label: date.toLocaleDateString('en-PH', { month: 'short' }), value }
    })
  }, [transactions])
  const maxRevenue = Math.max(1, ...monthSeries.map((month) => Math.abs(month.value)))

  const occupancyByType = useMemo(() => {
    const groups = new Map<string, { total: number; occupied: number }>()
    rooms.forEach((room) => {
      const group = groups.get(room.typeName) ?? { total: 0, occupied: 0 }
      group.total += 1
      if (room.status === 'occupied') group.occupied += 1
      groups.set(room.typeName, group)
    })
    return [...groups.entries()]
      .map(([name, counts]) => ({
        name,
        percent: counts.total ? Math.round((counts.occupied / counts.total) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 8)
  }, [rooms])

  const filteredBookings = bookings.filter((booking) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      [booking.guestName, booking.guestEmail, booking.reference, booking.serviceName]
        .join(' ')
        .toLowerCase()
        .includes(query)
    const matchesStatus =
      bookingStatus === 'all' ||
      (bookingStatus === 'booked' && ['upcoming', 'approved'].includes(booking.status === 'upcoming' ? booking.status : booking.approvalStatus)) ||
      (bookingStatus === 'completed' && booking.status === 'checked-out') ||
      (bookingStatus === 'refunded' && booking.paymentStatus === 'refunded') ||
      booking.status === bookingStatus
    return matchesSearch && matchesStatus
  })

  const filteredTransactions = rangeTransactions.filter((transaction) => {
    const query = financeSearch.trim().toLowerCase()
    const matchesSearch =
      !query ||
      [transaction.guestName, transaction.reference, transaction.method, transaction.type]
        .join(' ')
        .toLowerCase()
        .includes(query)
    return matchesSearch && (transactionStatus === 'all' || transaction.status === transactionStatus)
  })

  const downloadCSV = (name: string, rows: Array<Array<string | number>>) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = `red-5-star-${name}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportTransactions = () =>
    downloadCSV('transactions', [
      ['Date', 'Reference', 'Guest', 'Status', 'Type', 'Method', 'Amount'],
      ...filteredTransactions.map((item) => [
        item.createdAt,
        item.reference,
        item.guestName,
        item.status,
        item.type,
        item.method,
        item.type === 'refund' ? -item.amount : item.amount,
      ]),
    ])

  const exportBookings = () =>
    downloadCSV('bookings', [
      ['Reference', 'Guest', 'Email', 'Room', 'Suite', 'Arrival', 'Departure', 'Status', 'Paid', 'Total'],
      ...filteredBookings.map((item) => [
        item.reference,
        item.guestName,
        item.guestEmail,
        item.roomNumber,
        item.serviceName,
        item.arrivalDate,
        item.departureDate,
        item.status,
        item.amountPaid,
        item.total,
      ]),
    ])

  return (
    <main className="min-h-screen bg-[#f4f0e7] text-[#152721]">
      <header className="sticky top-0 z-30 border-b border-[#c9aa67]/35 bg-[#fffdf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173c32] font-serif text-lg text-white">R</span>
            <div>
              <p className="text-sm font-semibold">Red 5 Star</p>
              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#728079]">Executive operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden min-h-10 items-center rounded-lg border border-[#d4dcd7] px-4 text-sm font-semibold sm:inline-flex">Hotel site</Link>
            <button onClick={() => void signOutEverywhere(router, '/')} className="min-h-10 rounded-lg bg-[#173c32] px-4 text-sm font-semibold text-white">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[244px_1fr]">
        <aside className="border-b border-[#d9ddd7] bg-[#173c32] px-4 py-4 text-white lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:px-5 lg:py-7">
          <p className="hidden text-xs uppercase tracking-[.2em] text-white/45 lg:block">Workspace</p>
          <nav className="flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col" aria-label="Admin dashboard">
            {tabs.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`min-h-11 shrink-0 rounded-xl px-4 text-left text-sm font-semibold transition ${
                  tab === value ? 'bg-[#d8b76d] text-[#173027]' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:block">
            <p className="text-xs uppercase tracking-[.15em] text-white/45">Signed in</p>
            <p className="mt-2 text-sm font-semibold">{currentUser.name}</p>
            <p className="mt-1 break-all text-xs text-white/55">{currentUser.email}</p>
          </div>
        </aside>

        <section className="dashboard-print-root min-w-0 px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#99732a]">Hotel command center</p>
              <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
                {tabs.find(([value]) => value === tab)?.[1]}
              </h1>
            </div>
            <div className="dashboard-print-actions flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap rounded-xl border border-[#c9aa67]/40 bg-[#fffdf8] p-1 shadow-[0_8px_25px_rgba(35,54,44,.06)]">
                {dateRanges.map((range) => (
                  <button key={range} onClick={() => setDateRange(range)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${dateRange === range ? 'bg-[#173c32] text-white' : 'text-[#68756f] hover:bg-[#f2ead9]'}`}>{range}</button>
                ))}
              </div>
              <div className="relative">
                <button aria-label="Open live notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-[#c9aa67]/45 bg-[#fffdf8] text-[#173c32] shadow-[0_8px_25px_rgba(35,54,44,.06)]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
                  {notifications.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#a43832] px-1 text-[10px] font-bold text-white">{notifications.length}</span>}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#c9aa67]/45 bg-[#fffdf8] shadow-[0_24px_70px_rgba(19,48,39,.2)]">
                    <div className="border-b border-[#c9aa67]/25 px-5 py-4"><p className="font-serif text-xl">Live notifications</p><p className="mt-1 text-xs text-[#738079]">Bookings, arrivals and balances</p></div>
                    <div className="max-h-80 divide-y divide-[#e8dfcd] overflow-y-auto">{notifications.map((item, index) => <div key={`${item.detail}-${index}`} className="px-5 py-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#738079]">{item.detail}</p></div>)}{notifications.length === 0 && <p className="px-5 py-8 text-center text-sm text-[#738079]">All operations are clear.</p>}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {notice && <p role="status" className="mt-5 rounded-xl border border-[#cbd9d2] bg-white px-4 py-3 text-sm">{notice}</p>}

          {tab === 'overview' && (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Revenue Today', money(revenueToday), 'Net of recorded refunds', '+8.4%', monthSeries.slice(-4).map((item) => item.value), false],
                  ['Revenue This Month', money(revenueMonth), `${dateRange} ledger view`, '+12.7%', monthSeries.map((item) => item.value), true],
                  ['Occupancy Rate', `${occupancy}%`, `${occupied} of ${rooms.length} rooms occupied`, '+4.2%', [52, 58, 55, 64, 69, occupancy], false],
                  ['ADR', money(adr), `${activeBookings} active bookings`, '+6.1%', [68, 72, 70, 79, 83, 88], true],
                ].map(([label, value, detail, comparison, series, gold]) => (
                  <article key={String(label)} className="rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.07)]">
                    <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-[#6a7972]">{label as string}</p><span className="rounded-full bg-[#edf7f2] px-2 py-1 text-[10px] font-bold text-[#27624f]">{comparison as string}</span></div>
                    <p className="mt-3 font-serif text-3xl">{value as string}</p>
                    <div className="mt-3 flex items-end justify-between gap-3"><p className="text-xs text-[#87918d]">{detail as string}</p><Sparkline values={series as number[]} gold={gold as boolean} /></div>
                  </article>
                ))}
              </div>
              <div className="mt-5 space-y-5">
                <article className="rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.06)] sm:p-6">
                  <div className="flex items-end justify-between">
                    <div><h2 className="font-serif text-2xl">Monthly revenue</h2><p className="mt-1 text-sm text-[#718079]">Six-month net collection trend</p></div>
                    <p className="text-sm font-semibold text-[#315f51]">{money(monthSeries.reduce((sum, item) => sum + item.value, 0))}</p>
                  </div>
                  <div className="mt-8 flex h-72 items-end gap-3 border-b border-[#d8c9a8] px-1">
                    {monthSeries.map((month) => (
                      <div key={month.label} className="group flex h-full flex-1 flex-col justify-end">
                        <div className="relative flex flex-1 items-end">
                          <div
                            className="w-full rounded-t-lg bg-[#2b6958] transition hover:bg-[#d0a650]"
                            style={{ height: `${Math.max(4, (Math.abs(month.value) / maxRevenue) * 100)}%` }}
                          />
                          <span className="pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#173c32] px-2 py-1 text-xs text-white group-hover:block">{money(month.value)}</span>
                        </div>
                        <p className="py-3 text-center text-xs font-semibold text-[#718079]">{month.label}</p>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.06)] sm:p-6">
                  <h2 className="font-serif text-2xl">Room-type occupancy</h2>
                  <p className="mt-1 text-sm text-[#718079]">Highest utilized inventory</p>
                  <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-2">
                    {occupancyByType.map((item) => (
                      <div key={item.name}>
                        <div className="mb-1.5 flex justify-between gap-4 text-xs"><span className="truncate font-semibold">{item.name}</span><span>{item.percent}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e6e8e4]"><div className="h-full rounded-full bg-[#d0a650]" style={{ width: `${item.percent}%` }} /></div>
                      </div>
                    ))}
                    {occupancyByType.length === 0 && <p className="py-12 text-center text-sm text-[#718079]">Physical room inventory is being prepared.</p>}
                  </div>
                </article>
              </div>
            </>
          )}

          {tab === 'bookings' && (
            <div className="mt-7 space-y-5">
              <details className="rounded-2xl border border-[#dce1dd] bg-[#fdfdfb] p-5">
                <summary className="cursor-pointer font-serif text-xl font-semibold">Create a manual booking</summary>
                <form action={(formData) => run(() => createManualBookingAction(formData))} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input name="guestName" required placeholder="Guest full name" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="email" type="email" required placeholder="Email" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="phone" required placeholder="Phone" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <select name="physicalRoom" required className="min-h-11 rounded-lg border border-[#ccd6d0] bg-white px-3">
                    <option value="">Choose available room</option>
                    {rooms.filter((room) => room.status === 'available-clean').map((room) => <option key={room.id} value={room.id}>{room.roomNumber} · {room.typeName}</option>)}
                  </select>
                  <label className="text-xs font-semibold text-[#65736c]">Arrival<input name="arrivalDate" type="date" required className="mt-1 min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3 text-sm" /></label>
                  <label className="text-xs font-semibold text-[#65736c]">Departure<input name="departureDate" type="date" required className="mt-1 min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3 text-sm" /></label>
                  <input name="guests" type="number" min="1" max="20" defaultValue="1" className="min-h-11 self-end rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="amountPaid" type="number" min="0" defaultValue="0" placeholder="Amount paid" className="min-h-11 self-end rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="paymentMethod" placeholder="Payment method" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <button disabled={pending} className="min-h-11 rounded-lg bg-[#173c32] px-5 font-semibold text-white">Create booking</button>
                </form>
              </details>

              <div className="overflow-hidden rounded-2xl border border-[#dce1dd] bg-[#fdfdfb]">
                <div className="border-b border-[#c9aa67]/25 p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guest, email, room, or reference" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <div className="flex flex-wrap gap-2">{bookingFilters.map(([value, label]) => <button key={value} onClick={() => setBookingStatus(value)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${bookingStatus === value ? 'border-[#b58b3e] bg-[#d8b76d] text-[#173027]' : 'border-[#d8cfbd] bg-white text-[#68756f]'}`}>{label}</button>)}</div>
                  <div className="dashboard-print-actions flex gap-2"><button onClick={exportBookings} className="min-h-10 rounded-lg border border-[#b58b3e] px-3 text-xs font-semibold text-[#684d19]">Export CSV</button><button onClick={() => window.print()} className="min-h-10 rounded-lg bg-[#173c32] px-3 text-xs font-semibold text-white">Print report</button></div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#6e7b74]"><tr>{['Guest', 'Room', 'Stay', 'Payment', 'Booking status', 'Actions'].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[#e4e8e5]">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="align-top">
                          <td className="px-5 py-4"><p className="font-semibold">{booking.guestName}</p><p className="mt-1 text-xs text-[#718079]">{booking.guestEmail}</p><p className="mt-1 font-mono text-[11px]">{booking.reference}</p></td>
                          <td className="px-5 py-4"><p className="font-semibold">{booking.roomNumber}</p><p className="mt-1 text-xs text-[#718079]">{booking.serviceName}</p></td>
                          <td className="px-5 py-4">{shortDate(booking.arrivalDate)}<p className="mt-1 text-xs text-[#718079]">to {shortDate(booking.departureDate)}</p></td>
                          <td className="px-5 py-4"><p className="font-semibold">{money(booking.amountPaid)} / {money(booking.total)}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge(booking.paymentStatus)}`}>{booking.paymentStatus.replaceAll('-', ' ')}</span></td>
                          <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge(booking.status === 'cancelled' ? booking.status : booking.approvalStatus)}`}>{booking.approvalStatus}</span><p className="mt-2 text-xs capitalize text-[#718079]">{booking.status.replaceAll('-', ' ')}</p></td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {booking.approvalStatus === 'pending' && <button disabled={pending} onClick={() => run(() => adminBookingAction({ id: booking.id, operation: 'approve' }))} className="min-h-10 rounded-lg bg-[#2b6958] px-3 font-semibold text-white">Approve</button>}
                              <details className="relative"><summary className="flex min-h-10 cursor-pointer items-center rounded-lg border border-[#ccd6d0] px-3 font-semibold">Modify</summary><form action={(formData) => run(() => adminBookingAction({ id: booking.id, operation: 'modify', arrivalDate: String(formData.get('arrivalDate')), departureDate: String(formData.get('departureDate')), physicalRoom: String(formData.get('physicalRoom')) }))} className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-xl border border-[#ccd6d0] bg-white p-4 shadow-xl"><input name="arrivalDate" type="date" defaultValue={booking.arrivalDate.slice(0, 10)} className="min-h-10 w-full rounded-lg border px-2" /><input name="departureDate" type="date" defaultValue={booking.departureDate.slice(0, 10)} className="min-h-10 w-full rounded-lg border px-2" /><select name="physicalRoom" defaultValue={booking.physicalRoomId} className="min-h-10 w-full rounded-lg border bg-white px-2"><option value="">Unassigned</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber} · {room.typeName}</option>)}</select><button className="min-h-10 w-full rounded-lg bg-[#173c32] font-semibold text-white">Save changes</button></form></details>
                              {booking.status !== 'cancelled' && <button disabled={pending} onClick={() => { if (window.confirm('Cancel this booking and record any collected payment as a refund?')) run(() => adminBookingAction({ id: booking.id, operation: 'cancel' })) }} className="min-h-10 rounded-lg border border-red-200 px-3 font-semibold text-red-700">Cancel</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-[#718079]">No bookings match these filters.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'inventory' && (
            <div className="mt-7 grid gap-5 xl:grid-cols-[360px_1fr]">
              <form action={(formData) => run(() => createRoomTypeAction(formData))} className="h-fit rounded-2xl border border-[#dce1dd] bg-[#fdfdfb] p-5">
                <h2 className="font-serif text-2xl">Add room type</h2>
                <p className="mt-1 text-sm text-[#718079]">Create a sellable type and nightly base rate.</p>
                <div className="mt-5 space-y-3">
                  <input name="name" required placeholder="Room type name" className="min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="roomTypeId" type="number" min="1" required placeholder="Unique type ID" className="min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="rate" type="number" min="0" required placeholder="Nightly rate" className="min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="capacity" type="number" min="1" max="20" required placeholder="Guest capacity" className="min-h-11 w-full rounded-lg border border-[#ccd6d0] px-3" />
                  <button disabled={pending} className="min-h-11 w-full rounded-lg bg-[#173c32] font-semibold text-white">Add room type</button>
                </div>
              </form>
              <div className="grid gap-4 md:grid-cols-2">
                {rates.map((rate) => (
                  <article key={rate.id} className="rounded-2xl border border-[#dce1dd] bg-[#fdfdfb] p-5">
                    <div className="flex justify-between gap-3"><div><p className="font-serif text-xl">{rate.name}</p><p className="mt-1 text-xs text-[#718079]">Type {rate.roomTypeId} · up to {rate.capacity} guests</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ${rate.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{rate.active ? 'Available' : 'Hidden'}</span></div>
                    <form action={(formData) => run(() => updateRateAction({ id: rate.id, name: String(formData.get('name')), rate: Number(formData.get('rate')), capacity: Number(formData.get('capacity')), active: formData.get('active') === 'on', seasonalPricing: formData.get('seasonLabel') ? [{ label: String(formData.get('seasonLabel')), startDate: String(formData.get('seasonStart')), endDate: String(formData.get('seasonEnd')), rate: Number(formData.get('seasonRate')) }] : rate.seasonalPricing }))} className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input name="name" defaultValue={rate.name} className="min-h-10 rounded-lg border border-[#ccd6d0] px-3 sm:col-span-2" />
                      <input name="rate" type="number" min="0" defaultValue={rate.rate} className="min-h-10 rounded-lg border border-[#ccd6d0] px-3" />
                      <input name="capacity" type="number" min="1" max="20" defaultValue={rate.capacity} className="min-h-10 rounded-lg border border-[#ccd6d0] px-3" />
                      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="active" type="checkbox" defaultChecked={rate.active} /> Available for booking</label>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[.1em] text-[#718079] sm:col-span-2">Seasonal override</p>
                      <input name="seasonLabel" placeholder="Season label" defaultValue={rate.seasonalPricing[0]?.label} className="min-h-10 rounded-lg border border-[#ccd6d0] px-3 sm:col-span-2" />
                      <input name="seasonStart" type="date" defaultValue={rate.seasonalPricing[0]?.startDate?.slice(0, 10)} className="min-h-10 rounded-lg border border-[#ccd6d0] px-2" />
                      <input name="seasonEnd" type="date" defaultValue={rate.seasonalPricing[0]?.endDate?.slice(0, 10)} className="min-h-10 rounded-lg border border-[#ccd6d0] px-2" />
                      <input name="seasonRate" type="number" min="0" placeholder="Seasonal rate" defaultValue={rate.seasonalPricing[0]?.rate} className="min-h-10 rounded-lg border border-[#ccd6d0] px-3 sm:col-span-2" />
                      <button disabled={pending} className="min-h-10 rounded-lg bg-[#173c32] font-semibold text-white sm:col-span-2">Save pricing</button>
                    </form>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === 'people' && (
            <div className="mt-7 space-y-5">
              <form
                action={(formData) => run(() => changeOwnPasswordAction(formData))}
                autoComplete="off"
                className="rounded-2xl border border-[#dce1dd] bg-[#fdfdfb] p-5"
              >
                <h2 className="font-serif text-2xl">Change my administrator password</h2>
                <p className="mt-1 text-sm text-[#718079]">
                  Confirm your current password before setting a new one for {currentUser.email}.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <input name="currentPassword" type="password" autoComplete="off" required minLength={8} placeholder="Current password" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="newPassword" type="password" autoComplete="off" required minLength={8} placeholder="New password" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                  <input name="confirmPassword" type="password" autoComplete="off" required minLength={8} placeholder="Confirm new password" className="min-h-11 rounded-lg border border-[#ccd6d0] px-3" />
                </div>
                <button disabled={pending} className="mt-3 min-h-11 rounded-lg bg-[#173c32] px-5 font-semibold text-white">
                  Change password
                </button>
              </form>
              <div className="overflow-hidden rounded-2xl border border-[#dce1dd] bg-[#fdfdfb]">
                <div className="border-b border-[#e0e5e1] p-5"><h2 className="font-serif text-2xl">Registered accounts</h2><p className="mt-1 text-sm text-[#718079]">{users.length} guest and team identities</p></div>
                <div className="divide-y divide-[#e4e8e5]">
                  {users.map((account) => (
                    <div key={account.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_180px_150px] md:items-center">
                      <div><p className="font-semibold">{account.name}</p><p className="mt-1 text-sm text-[#718079]">{account.email} · Joined {shortDate(account.createdAt)}</p></div>
                      <select defaultValue={account.role} disabled={pending} onChange={(event) => run(() => updateUserRoleAction({ id: account.id, role: event.target.value as Account['role'], active: account.active }))} className="min-h-11 rounded-lg border border-[#ccd6d0] bg-white px-3 text-sm font-semibold"><option value="guest">Guest</option><option value="staff">Staff</option><option value="admin">Admin</option></select>
                      <button disabled={pending || account.id === currentUser.id} onClick={() => run(() => updateUserRoleAction({ id: account.id, role: account.role, active: !account.active }))} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${account.active ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-700'} disabled:opacity-40`}>{account.active ? 'Revoke access' : 'Restore access'}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'finance' && (
            <div className="mt-7 overflow-hidden rounded-2xl border border-[#dce1dd] bg-[#fdfdfb]">
              <div className="flex flex-col gap-4 border-b border-[#c9aa67]/25 p-5">
                <div><h2 className="font-serif text-2xl">Transaction ledger</h2><p className="mt-1 text-sm text-[#718079]">Append-only payment and refund history</p></div>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><input value={financeSearch} onChange={(event) => setFinanceSearch(event.target.value)} placeholder="Search guest, reference, or method" className="min-h-11 min-w-72 rounded-lg border border-[#ccd6d0] px-3" /><div className="flex flex-wrap gap-2">{['all', 'paid', 'pending', 'refunded'].map((value) => <button key={value} onClick={() => setTransactionStatus(value)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold capitalize ${transactionStatus === value ? 'border-[#b58b3e] bg-[#d8b76d] text-[#173027]' : 'border-[#d8cfbd] bg-white text-[#68756f]'}`}>{value}</button>)}</div><div className="dashboard-print-actions flex gap-2"><button onClick={exportTransactions} className="min-h-10 rounded-lg border border-[#b58b3e] px-3 text-xs font-semibold text-[#684d19]">Export CSV</button><button onClick={() => window.print()} className="min-h-10 rounded-lg bg-[#173c32] px-3 text-xs font-semibold text-white">Export / Print</button></div></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f4f1e9] text-xs uppercase tracking-[.08em] text-[#6e7b74]"><tr>{['Date', 'Reference', 'Guest', 'Status', 'Method', 'Amount'].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody className="divide-y divide-[#e4e0d7]">{filteredTransactions.map((item) => <tr key={item.id}><td className="px-5 py-4">{shortDate(item.createdAt)}</td><td className="px-5 py-4 font-mono text-xs">{item.reference}</td><td className="px-5 py-4 font-semibold">{item.guestName}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge(item.status)}`}>{item.status}</span></td><td className="px-5 py-4">{item.method}</td><td className={`px-5 py-4 font-semibold ${item.type === 'refund' ? 'text-[#9b302b]' : 'text-[#24604e]'}`}>{item.type === 'refund' ? '−' : ''}{money(item.amount)}</td></tr>)}{filteredTransactions.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-[#718079]">No transactions match this report view.</td></tr>}</tbody></table></div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
