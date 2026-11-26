import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { appAuth } from '@/lib/app-auth'

import AdminDashboard from './AdminDashboard'

export default async function HotelAdminDashboardPage() {
  const user = await appAuth.currentUser()
  if (!user || user.role !== 'admin') redirect('/sign-in')

  const payload = await getPayload({ config })
  const [bookings, transactions, rates, users, rooms] = await Promise.all([
    payload.find({
      collection: 'bookings',
      limit: 500,
      depth: 1,
      sort: '-createdAt',
      where: { archivedAt: { exists: false } },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'transactions',
      limit: 500,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'room-rates',
      limit: 200,
      sort: 'roomTypeId',
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'users',
      limit: 500,
      sort: 'name',
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
  ])

  return (
    <AdminDashboard
      currentUser={{ id: String(user.id), name: user.name, email: user.email }}
      bookings={bookings.docs.map((booking) => ({
        id: String(booking.id),
        reference: booking.reference,
        guestName: booking.guestName,
        guestEmail: booking.guest.email,
        serviceName: booking.serviceName,
        roomNumber:
          booking.physicalRoom && typeof booking.physicalRoom === 'object'
            ? booking.physicalRoom.roomNumber
            : booking.kind === 'room'
              ? `Floor ${booking.room?.floor ?? '—'}`
              : booking.category,
        physicalRoomId:
          booking.physicalRoom && typeof booking.physicalRoom === 'object'
            ? String(booking.physicalRoom.id)
            : booking.physicalRoom
              ? String(booking.physicalRoom)
              : '',
        arrivalDate: booking.arrivalDate,
        departureDate: booking.departureDate ?? '',
        status: booking.status,
        approvalStatus: booking.approvalStatus ?? 'approved',
        total: booking.payment.total,
        amountPaid: booking.payment.amountPaid,
        paymentStatus:
          booking.payment.status ??
          (booking.payment.amountPaid >= booking.payment.total ? 'paid-in-full' : 'balance-due'),
      }))}
      transactions={transactions.docs.map((transaction) => ({
        id: String(transaction.id),
        reference: transaction.reference,
        guestName: transaction.guestName,
        type: transaction.type,
        status: transaction.status ?? (transaction.type === 'refund' ? 'refunded' : 'paid'),
        amount: transaction.amount,
        method: transaction.method,
        createdAt: transaction.createdAt,
      }))}
      rates={rates.docs.map((rate) => ({
        id: String(rate.id),
        roomTypeId: rate.roomTypeId,
        name: rate.name,
        rate: rate.rate,
        capacity: rate.capacity,
        active: rate.active,
        seasonalPricing: (rate.seasonalPricing ?? []).map((season) => ({
          label: season.label,
          startDate: season.startDate,
          endDate: season.endDate,
          rate: season.rate,
        })),
      }))}
      users={users.docs.map((account) => ({
        id: String(account.id),
        name: account.name,
        email: account.email,
        role: account.role,
        active: account.active,
        createdAt: account.createdAt,
      }))}
      rooms={rooms.docs.map((room) => ({
        id: String(room.id),
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
        typeName: typeof room.roomType === 'object' ? room.roomType.name : 'Room',
      }))}
    />
  )
}
