import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { appAuth } from '@/lib/app-auth'

import StaffDashboard from './StaffDashboard'

export default async function StaffDashboardPage() {
  const user = await appAuth.currentUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) redirect('/sign-in')
  if (user.role === 'admin') redirect('/admin/dashboard')

  const payload = await getPayload({ config })
  const [bookings, rooms, requests, notes] = await Promise.all([
    payload.find({
      collection: 'bookings',
      limit: 500,
      depth: 1,
      sort: 'arrivalDate',
      where: { archivedAt: { exists: false } },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'rooms',
      limit: 500,
      depth: 1,
      sort: 'roomNumber',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'service-requests',
      limit: 200,
      depth: 1,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'shift-notes',
      limit: 100,
      depth: 1,
      sort: ['-pinned', '-createdAt'],
      overrideAccess: false,
      user,
    }),
  ])

  return (
    <StaffDashboard
      currentUser={{ name: user.name, email: user.email }}
      bookings={bookings.docs.map((booking) => ({
        id: String(booking.id),
        reference: booking.reference,
        guestName: booking.guestName,
        serviceName: booking.serviceName,
        roomNumber:
          booking.physicalRoom && typeof booking.physicalRoom === 'object'
            ? booking.physicalRoom.roomNumber
            : booking.kind === 'room'
              ? `Floor ${booking.room?.floor ?? '—'}`
              : booking.category,
        arrivalDate: booking.arrivalDate,
        departureDate: booking.departureDate ?? '',
        status: booking.status,
        remainingBalance:
          booking.payment.remainingBalance ??
          Math.max(0, booking.payment.total - booking.payment.amountPaid),
      }))}
      rooms={rooms.docs.map((room) => ({
        id: String(room.id),
        roomNumber: room.roomNumber,
        floor: room.floor,
        typeName: typeof room.roomType === 'object' ? room.roomType.name : 'Room',
        status: room.status,
      }))}
      requests={requests.docs.map((request) => ({
        id: String(request.id),
        guestName: request.guestName,
        roomNumber: typeof request.room === 'object' ? request.room?.roomNumber ?? '' : '',
        category: request.category,
        details: request.details,
        priority: request.priority,
        status: request.status,
        createdAt: request.createdAt,
      }))}
      notes={notes.docs.map((note) => ({
        id: String(note.id),
        note: note.note,
        pinned: note.pinned ?? false,
        author: typeof note.createdBy === 'object' ? note.createdBy?.name ?? 'Team member' : 'Team member',
        createdAt: note.createdAt,
      }))}
    />
  )
}
