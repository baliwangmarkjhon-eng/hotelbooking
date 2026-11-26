'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { signOutEverywhere } from '@/lib/app-session-browser'

import {
  createServiceRequestAction,
  createShiftNoteAction,
  updateBookingAction,
  updateRoomStatusAction,
  updateServiceRequestAction,
} from '../../operations/actions'

type Booking = {
  id: string
  reference: string
  guestName: string
  serviceName: string
  roomNumber: string
  arrivalDate: string
  departureDate: string
  status: string
  remainingBalance: number
}
type Room = {
  id: string
  roomNumber: string
  floor: number
  typeName: string
  status: 'available-clean' | 'occupied' | 'needs-cleaning' | 'maintenance'
}
type Request = {
  id: string
  guestName: string
  roomNumber: string
  category: string
  details: string
  priority: string
  status: 'pending' | 'in-progress' | 'completed'
  createdAt: string
}
type Note = { id: string; note: string; pinned: boolean; author: string; createdAt: string }
type Props = {
  currentUser: { name: string; email: string }
  bookings: Booking[]
  rooms: Room[]
  requests: Request[]
  notes: Note[]
}

const roomStatus = {
  'available-clean': { label: 'Available & Clean', color: 'bg-[#276451]', panel: 'border-[#9fc8b8] bg-[#edf7f2]' },
  occupied: { label: 'Occupied', color: 'bg-[#b78a35]', panel: 'border-[#d7bd7f] bg-[#fff8e8]' },
  'needs-cleaning': { label: 'Needs Cleaning', color: 'bg-[#d18427]', panel: 'border-[#e3bc7c] bg-[#fff4e4]' },
  maintenance: { label: 'Maintenance', color: 'bg-[#923b39]', panel: 'border-[#d3aaa6] bg-[#f9efee]' },
} as const

const shortTime = (value: string) =>
  new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  )

export default function StaffDashboard({
  currentUser,
  bookings,
  rooms,
  requests,
  notes,
}: Props) {
  const router = useRouter()
  const [section, setSection] = useState<'desk' | 'rooms' | 'requests' | 'handover'>('desk')
  const [floor, setFloor] = useState('all')
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()
  const todayKey = new Date().toISOString().slice(0, 10)

  const run = (task: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await task()
      setNotice(result.message)
      if (result.ok) router.refresh()
    })
  }

  const arrivals = bookings.filter(
    (booking) => booking.arrivalDate.slice(0, 10) === todayKey && booking.status === 'upcoming',
  )
  const departures = bookings.filter(
    (booking) =>
      booking.departureDate.slice(0, 10) === todayKey && booking.status === 'checked-in',
  )
  const visibleRooms = rooms.filter((room) => floor === 'all' || String(room.floor) === floor)
  const roomsByFloor = useMemo(() => {
    const groups = new Map<number, Room[]>()
    visibleRooms.forEach((room) => groups.set(room.floor, [...(groups.get(room.floor) ?? []), room]))
    return [...groups.entries()].sort(([a], [b]) => a - b)
  }, [visibleRooms])
  const roomCounts = useMemo(
    () =>
      Object.keys(roomStatus).map((status) => ({
        status: status as keyof typeof roomStatus,
        count: rooms.filter((room) => room.status === status).length,
      })),
    [rooms],
  )

  return (
    <main className="min-h-screen bg-[#f4f0e7] text-[#152721]">
      <header className="sticky top-0 z-30 border-b border-[#c9aa67]/35 bg-[#fffdf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173c32] font-serif text-lg text-white">R</span><div><p className="text-sm font-semibold">Red 5 Star</p><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#728079]">Guest experience command</p></div></div>
          <div className="flex gap-2"><Link href="/" className="hidden min-h-10 items-center rounded-lg border border-[#c9aa67]/45 px-4 text-sm font-semibold sm:inline-flex">Hotel site</Link><button onClick={() => void signOutEverywhere(router, '/')} className="min-h-10 rounded-lg bg-[#173c32] px-4 text-sm font-semibold text-white">Sign out</button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[244px_1fr]">
        <aside className="border-b border-[#c9aa67]/25 bg-[#173c32] px-4 py-4 text-white lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:px-5 lg:py-7">
          <p className="hidden text-xs uppercase tracking-[.2em] text-white/45 lg:block">Guest operations</p>
          <nav className="flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col" aria-label="Staff dashboard sections">
            {[
              ['desk', 'Front Desk'],
              ['rooms', 'Room Status Grid'],
              ['requests', 'Guest Requests'],
              ['handover', 'Shift Handover'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setSection(value as typeof section)} className={`min-h-11 shrink-0 rounded-xl px-4 text-left text-sm font-semibold transition ${section === value ? 'bg-[#d8b76d] text-[#173027] shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-2xl border border-[#d8b76d]/25 bg-white/5 p-4 lg:block">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#d8b76d] font-serif text-[#173027]">{currentUser.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{currentUser.name}</p><p className="mt-0.5 text-[10px] uppercase tracking-[.15em] text-[#d8b76d]">On duty · Staff</p></div></div>
            <p className="mt-3 break-all text-xs text-white/55">{currentUser.email}</p>
          </div>
        </aside>

      <section className="min-w-0 px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#99732a]">Live shift workspace</p><h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{section === 'desk' ? `Good day, ${currentUser.name.split(' ')[0]}` : section === 'rooms' ? 'Room Status Grid' : section === 'requests' ? 'Guest Requests' : 'Shift Handover'}</h1></div>
          <p className="text-sm text-[#66736d]">Live operations · {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        {notice && <p role="status" className="mt-5 rounded-xl border border-[#cadbd3] bg-white px-4 py-3 text-sm">{notice}</p>}

        {section === 'desk' && (
          <>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[['Arrivals Today', arrivals.length, 'Awaiting a warm welcome'], ['Departures Today', departures.length, 'Final folios to complete'], ['Rooms Ready', roomCounts.find((item) => item.status === 'available-clean')?.count ?? 0, 'Inspected and guest-ready'], ['Pending Requests', requests.filter((item) => item.status !== 'completed').length, 'Guest service queue']].map(([label, value, detail]) => <article key={label} className="rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.07)]"><div className="h-px w-10 bg-[#b78a35]" /><p className="mt-4 text-sm text-[#6d7d76]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-2 text-xs text-[#899690]">{detail}</p></article>)}
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <DeskList title="Today’s arrivals" eyebrow="Welcome sequence" empty="No arrivals scheduled for today." bookings={arrivals} pending={pending} actionLabel="Collect Balance & Check In" onAction={(booking) => run(() => updateBookingAction({ id: booking.id, operation: 'check-in', settleBalance: booking.remainingBalance > 0, paymentMethod: 'Front desk' }))} />
              <DeskList title="Today’s departures" eyebrow="Departure sequence" empty="No departures scheduled for today." bookings={departures} pending={pending} actionLabel="Complete Check-Out" onAction={(booking) => run(() => updateBookingAction({ id: booking.id, operation: 'check-out' }))} />
            </div>
          </>
        )}

        {section === 'rooms' && (
          <div className="mt-7">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{roomCounts.map((item) => <article key={item.status} className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(20,50,40,.05)] ${roomStatus[item.status].panel}`}><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${roomStatus[item.status].color}`} /><p className="text-sm font-semibold">{roomStatus[item.status].label}</p></div><p className="mt-3 font-serif text-3xl">{item.count}</p></article>)}</div>
            <div className="mt-5 flex items-center justify-between gap-3"><h2 className="font-serif text-2xl">All physical rooms</h2><select value={floor} onChange={(event) => setFloor(event.target.value)} className="min-h-11 rounded-xl border border-[#d3ded9] bg-white px-4"><option value="all">All floors</option>{[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>Floor {value}</option>)}</select></div>
            <div className="mt-4 space-y-7">
              {roomsByFloor.map(([floorNumber, floorRooms]) => <div key={floorNumber}><div className="mb-3 flex items-center gap-3"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8f6c28]">Floor {floorNumber} · {floorNumber <= 2 ? 'Garden Wing' : floorNumber <= 4 ? 'Grand Wing' : 'Sky Wing'}</p><div className="h-px flex-1 bg-[#c9aa67]/30" /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{floorRooms.map((room) => (
                <article key={room.id} className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(20,50,40,.05)] ${roomStatus[room.status].panel}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-2xl">{room.roomNumber}</p><p className="mt-1 truncate text-xs text-[#6d7d76]">{room.typeName}</p></div><span className={`mt-1 h-3 w-3 rounded-full ${roomStatus[room.status].color}`} /></div>
                  <select disabled={pending} value={room.status} onChange={(event) => run(() => updateRoomStatusAction({ id: room.id, status: event.target.value as Room['status'] }))} className="mt-4 min-h-10 w-full rounded-lg border border-black/10 bg-white/80 px-2 text-xs font-semibold"><option value="available-clean">Available & Clean</option><option value="occupied">Occupied</option><option value="needs-cleaning">Needs Cleaning</option><option value="maintenance">Maintenance</option></select>
                </article>
              ))}</div></div>)}
              {visibleRooms.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-[#c9d5cf] bg-white px-5 py-16 text-center text-[#6d7d76]">No physical rooms are available for this floor yet.</p>}
            </div>
          </div>
        )}

        {section === 'requests' && (
          <div className="mt-7 grid gap-5 xl:grid-cols-[360px_1fr]">
            <form action={(formData) => run(() => createServiceRequestAction(formData))} className="h-fit rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.06)]">
              <h2 className="font-serif text-2xl">Log guest request</h2>
              <div className="mt-5 space-y-3"><input name="guestName" required placeholder="Guest name" className="min-h-11 w-full rounded-lg border border-[#d3ded9] px-3" /><select name="room" className="min-h-11 w-full rounded-lg border border-[#d3ded9] bg-white px-3"><option value="">No room selected</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}</select><select name="category" className="min-h-11 w-full rounded-lg border border-[#d3ded9] bg-white px-3">{['Housekeeping', 'Maintenance', 'Dining', 'Concierge', 'Other'].map((item) => <option key={item}>{item}</option>)}</select><select name="priority" className="min-h-11 w-full rounded-lg border border-[#d3ded9] bg-white px-3"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><textarea name="details" required rows={4} placeholder="What does the guest need?" className="w-full rounded-lg border border-[#d3ded9] p-3" /><button disabled={pending} className="min-h-11 w-full rounded-lg bg-[#173c32] font-semibold text-white">Add to queue</button></div>
            </form>
            <div className="space-y-3">
              {requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_12px_35px_rgba(20,50,40,.05)]">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{request.guestName}</p>{request.roomNumber && <span className="rounded-full bg-[#edf2ef] px-2 py-1 text-xs">Room {request.roomNumber}</span>}<span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${request.priority === 'urgent' ? 'border-red-200 bg-red-50 text-red-700' : request.priority === 'high' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#d9d5ca] bg-[#f5f2eb] text-[#6c6a63]'}`}>{request.priority}</span></div><p className="mt-2 text-sm text-[#526961]">{request.details}</p><p className="mt-2 text-xs text-[#8a9691]">{request.category} · {shortTime(request.createdAt)}</p></div><button disabled={pending || request.status === 'completed'} onClick={() => run(() => updateServiceRequestAction({ id: request.id, status: request.status === 'pending' ? 'in-progress' : 'completed' }))} className="min-h-10 shrink-0 rounded-lg bg-[#173c32] px-4 text-sm font-semibold text-white disabled:bg-[#e7e3da] disabled:text-[#7c817e]">{request.status === 'pending' ? 'Start request' : request.status === 'in-progress' ? 'Mark completed' : 'Completed'}</button></div>
                </article>
              ))}
              {requests.length === 0 && <p className="rounded-2xl border border-dashed border-[#c9d5cf] bg-white px-5 py-16 text-center text-[#6d7d76]">No guest requests in the queue.</p>}
            </div>
          </div>
        )}

        {section === 'handover' && (
          <div className="mt-7 grid gap-5 xl:grid-cols-[380px_1fr]">
            <form action={(formData) => run(() => createShiftNoteAction(formData))} className="h-fit rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] p-5 shadow-[0_14px_45px_rgba(20,50,40,.06)]"><h2 className="font-serif text-2xl">Post handover note</h2><p className="mt-1 text-sm text-[#6d7d76]">Share context the next shift should not miss.</p><textarea name="note" required rows={6} className="mt-5 w-full rounded-xl border border-[#d3c6aa] bg-white p-3" placeholder="Outstanding tasks, VIP arrivals, maintenance follow-up…" /><label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input name="pinned" type="checkbox" /> Pin as important</label><button disabled={pending} className="mt-4 min-h-11 w-full rounded-lg bg-[#173c32] font-semibold text-white">Post note</button></form>
            <div className="grid gap-3 md:grid-cols-2">{notes.map((note) => <article key={note.id} className={`rounded-2xl border bg-[#fffdf8] p-5 shadow-[0_12px_35px_rgba(20,50,40,.05)] ${note.pinned ? 'border-[#b78a35] ring-1 ring-[#d1ae60]/20' : 'border-[#c9aa67]/30'}`}><div className="flex justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#9c7529]">{note.pinned ? 'Pinned handover' : 'Shift note'}</p><p className="text-xs text-[#8a9691]">{shortTime(note.createdAt)}</p></div><p className="mt-4 leading-7 text-[#31463f]">{note.note}</p><div className="mt-5 flex items-center gap-2 border-t border-[#c9aa67]/20 pt-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#173c32] text-xs text-white">{note.author.slice(0, 1).toUpperCase()}</span><p className="text-xs font-semibold text-[#718079]">{note.author}</p></div></article>)}{notes.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-[#c9d5cf] bg-white px-5 py-16 text-center text-[#6d7d76]">No handover notes posted yet.</p>}</div>
          </div>
        )}
      </section>
      </div>
    </main>
  )
}

function DeskList({
  title,
  eyebrow,
  empty,
  bookings,
  pending,
  actionLabel,
  onAction,
}: {
  title: string
  eyebrow: string
  empty: string
  bookings: Booking[]
  pending: boolean
  actionLabel: string
  onAction: (booking: Booking) => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#c9aa67]/35 bg-[#fffdf8] shadow-[0_14px_45px_rgba(20,50,40,.06)]">
      <div className="border-b border-[#c9aa67]/25 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#99732a]">{eyebrow}</p><h2 className="mt-1 font-serif text-2xl">{title}</h2></div>
      <div className="divide-y divide-[#e6dfd1]">
        {bookings.map((booking) => <div key={booking.id} className="px-5 py-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-serif text-xl">{booking.guestName}</p><p className="mt-1 text-sm font-semibold text-[#53675f]">Room {booking.roomNumber} · {booking.serviceName}</p><p className="mt-1 font-mono text-[11px] text-[#899690]">{booking.reference}</p></div><span className={`h-fit rounded-full border px-3 py-1 text-xs font-semibold ${booking.remainingBalance > 0 ? 'border-[#dfc585] bg-[#fff8e6] text-[#84601c]' : 'border-[#a9d0c1] bg-[#edf8f3] text-[#24604e]'}`}>{booking.remainingBalance > 0 ? `90% balance due · ₱${booking.remainingBalance.toLocaleString()}` : 'Paid in full'}</span></div><button disabled={pending} onClick={() => onAction(booking)} className="mt-4 min-h-11 w-full rounded-lg bg-[#173c32] px-4 text-sm font-semibold text-white disabled:opacity-50">{booking.remainingBalance > 0 && actionLabel.includes('Check In') ? actionLabel : actionLabel.replace('Collect Balance & ', '')}</button></div>)}
        {bookings.length === 0 && <p className="px-5 py-14 text-center text-sm text-[#6d7d76]">{empty}</p>}
      </div>
    </article>
  )
}
